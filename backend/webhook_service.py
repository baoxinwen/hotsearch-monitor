"""Webhook 推送服务 - 支持企业微信/钉钉/飞书/通用Webhook"""

import asyncio
import ipaddress
import logging
import socket
from datetime import datetime
from typing import Dict, List, Optional
from urllib.parse import urlparse

import httpx

from config import PLATFORM_CONFIG

logger = logging.getLogger(__name__)

# Webhook 类型对应的格式化方法
WEBHOOK_TYPES = {
    "generic": "通用JSON",
    "wechat": "企业微信",
    "dingtalk": "钉钉",
    "feishu": "飞书",
}


def _format_markdown_generic(data: Dict[str, List[dict]], keywords: List[str], frequency: str) -> str:
    """生成通用 Markdown 内容"""
    freq_label = {"hourly": "小时报", "daily": "日报", "weekly": "周报"}.get(frequency, "报告")
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = [f"# 热搜监控{freq_label} ({now})"]

    if keywords:
        lines.append(f"\n**关键词**: {', '.join(keywords)}")

    all_items = []
    for items in data.values():
        if isinstance(items, list):
            all_items.extend(items)

    lines.append(f"\n**共 {len(all_items)} 条热搜，来自 {len(data)} 个平台**\n")

    for platform, items in data.items():
        if not isinstance(items, list) or not items:
            continue
        pconfig = PLATFORM_CONFIG.get(platform, {})
        name = pconfig.get("name", platform)
        icon = pconfig.get("icon", "")
        lines.append(f"### {icon} {name} ({len(items)}条)")
        for item in items[:10]:
            rank = item.get("rank", 0)
            title = item.get("title", "")
            score = item.get("score", 0)
            score_str = _format_score(score) if score else ""
            lines.append(f"{rank}. {title} {score_str}")
        if len(items) > 10:
            lines.append(f"  ...还有 {len(items) - 10} 条")
        lines.append("")

    return "\n".join(lines)


def _format_wechat(data: Dict[str, List[dict]], keywords: List[str], frequency: str) -> dict:
    """企业微信机器人格式"""
    content = _format_markdown_generic(data, keywords, frequency)
    return {"msgtype": "markdown", "markdown": {"content": content}}


def _format_dingtalk(data: Dict[str, List[dict]], keywords: List[str], frequency: str) -> dict:
    """钉钉机器人格式"""
    freq_label = {"hourly": "小时报", "daily": "日报", "weekly": "周报"}.get(frequency, "报告")
    title = f"热搜监控{freq_label}"
    content = _format_markdown_generic(data, keywords, frequency)
    return {"msgtype": "markdown", "markdown": {"title": title, "text": content}}


def _format_feishu(data: Dict[str, List[dict]], keywords: List[str], frequency: str) -> dict:
    """飞书机器人格式"""
    content = _format_markdown_generic(data, keywords, frequency)
    return {
        "msg_type": "interactive",
        "card": {
            "header": {
                "title": {"tag": "plain_text", "content": f"热搜监控{frequency}"},
                "template": "purple",
            },
            "elements": [{"tag": "markdown", "content": content}],
        },
    }


def _format_score(score: int) -> str:
    if score >= 100_000_000:
        return f"{score / 100_000_000:.1f}亿"
    if score >= 10_000:
        return f"{score / 10_000:.1f}万"
    return str(score)


FORMATTERS = {
    "generic": lambda d, k, f: {"data": {p: [{"rank": i.get("rank"), "title": i.get("title"), "score": i.get("score")} for i in items] for p, items in d.items() if isinstance(items, list)}, "keywords": k, "frequency": f, "time": datetime.now().isoformat()},
    "wechat": _format_wechat,
    "dingtalk": _format_dingtalk,
    "feishu": _format_feishu,
}


def _validate_webhook_url(url: str) -> Optional[str]:
    """校验 Webhook URL，防止 SSRF。返回错误信息或 None。"""
    try:
        parsed = urlparse(url)
    except Exception:
        return "无效的 URL"

    if parsed.scheme not in ("https", "http"):
        return "仅支持 http/https 协议"

    hostname = parsed.hostname
    if not hostname:
        return "URL 缺少主机名"

    # 直接是 IP 的情况
    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast:
            return "不允许访问内网地址"
        return None
    except ValueError:
        pass

    # hostname 是域名，解析后检查 IP（防止 DNS 重绑定和 nip.io 等服务）
    blocked_names = ("localhost", "metadata.google.internal", "169.254.169.254")
    if hostname in blocked_names:
        return "不允许访问内网地址"

    try:
        resolved_ips = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for _, _, _, _, sockaddr in resolved_ips:
            ip = ipaddress.ip_address(sockaddr[0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast:
                return "不允许访问内网地址"
    except (socket.gaierror, OSError):
        return "无法解析域名"

    return None


class WebhookService:
    """Webhook 推送服务"""

    async def send(
        self,
        url: str,
        webhook_type: str,
        data: Dict[str, List[dict]],
        keywords: List[str] = None,
        frequency: str = "daily",
    ) -> dict:
        """发送 Webhook 推送"""
        if not url:
            return {"success": False, "message": "未配置 Webhook URL"}

        url_error = _validate_webhook_url(url)
        if url_error:
            return {"success": False, "message": url_error}

        formatter = FORMATTERS.get(webhook_type, FORMATTERS["generic"])
        payload = formatter(data, keywords or [], frequency)

        try:
            # 发送前二次校验，缩小 DNS rebinding 的窗口
            recheck = _validate_webhook_url(url)
            if recheck:
                return {"success": False, "message": recheck}
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code < 300:
                    logger.info(f"Webhook 发送成功: {webhook_type} -> {url[:50]}")
                    return {"success": True, "message": "推送成功"}
                else:
                    logger.error(f"Webhook 失败: HTTP {resp.status_code} - {resp.text[:200]}")
                    return {"success": False, "message": f"推送失败: HTTP {resp.status_code}"}
        except httpx.TimeoutException:
            logger.error(f"Webhook 超时: {url[:50]}")
            return {"success": False, "message": "推送超时"}
        except Exception as e:
            logger.error(f"Webhook 异常: {type(e).__name__}: {e}")
            return {"success": False, "message": "推送失败，请检查 URL 或稍后再试"}


# 全局实例
webhook_service = WebhookService()
