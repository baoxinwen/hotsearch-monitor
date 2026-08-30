"""邮件服务 - 合并 hotsearch-monitor 的SMTP发送 + trendsentinel 的多频率和模板"""

import asyncio
import logging
import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from pathlib import Path
from typing import Dict, List, Optional

from jinja2 import Environment

from config import PLATFORM_CONFIG, get_settings
from security import escape_html

logger = logging.getLogger(__name__)

# 邮件报告 HTML 模板
REPORT_TEMPLATE = """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body{font-family:'Microsoft YaHei',Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0}
.container{max-width:800px;margin:0 auto;padding:20px}
.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:24px;border-radius:12px;margin-bottom:20px}
.header h1{margin:0;font-size:22px}.header p{margin:8px 0 0;opacity:.9;font-size:14px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
.stat-card{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:16px;border-radius:8px;text-align:center}
.stat-value{font-size:28px;font-weight:bold}.stat-label{font-size:12px;opacity:.8}
.summary{background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px}
.platform-section{margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
.platform-header{background:#667eea;color:white;padding:10px 15px;font-weight:bold;font-size:14px}
.item{padding:10px 15px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center}
.item:last-child{border-bottom:none}
.rank{display:inline-flex;width:24px;height:24px;border-radius:4px;background:#f3f4f6;align-items:center;justify-content:center;font-size:12px;margin-right:10px;flex-shrink:0}
.rank.top3{background:#ef4444;color:white}
.item-title{flex:1;font-size:14px}
.item-hot{color:#9ca3af;font-size:12px;margin-left:8px;flex-shrink:0}
.footer{text-align:center;color:#9ca3af;font-size:11px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}
@media(max-width:600px){.stats{grid-template-columns:1fr}.container{padding:12px}}
</style></head>
<body><div class="container">
<div class="header">
<h1>{{ title }}</h1>
<p>{{ report_time }} | {{ frequency_label }}</p>
</div>
{% if summary %}<div class="summary">{{ summary }}</div>{% endif %}
<div class="stats">
<div class="stat-card"><div class="stat-value">{{ total_items }}</div><div class="stat-label">总条目数</div></div>
<div class="stat-card"><div class="stat-value">{{ total_platforms }}</div><div class="stat-label">监控平台</div></div>
<div class="stat-card"><div class="stat-value">{{ top_score }}</div><div class="stat-label">最高热度</div></div>
</div>
{% for platform_key, items in grouped_items.items() %}
{% set pconfig = platform_configs.get(platform_key, {}) %}
<div class="platform-section">
<div class="platform-header">{{ pconfig.get('icon', '') }} {{ pconfig.get('name', platform_key) }} - {{ items|length }}条</div>
{% for item in items[:10] %}
<div class="item">
<span class="rank{% if item.rank <= 3 %} top3{% endif %}">{{ item.rank }}</span>
<span class="item-title">{{ item.title }}</span>
{% if item.hot_display %}<span class="item-hot">{{ item.hot_display }}</span>{% endif %}
</div>
{% endfor %}
{% if items|length > 10 %}<div style="padding:8px 15px;color:#9ca3af;font-size:12px">还有 {{ items|length - 10 }} 条...</div>{% endif %}
</div>
{% endfor %}
<div class="footer">由热搜监控工具自动发送 | {{ report_time }}</div>
</div></body></html>"""


class EmailService:
    """邮件服务"""

    def __init__(self):
        self.settings = get_settings()
        # autoescape=True：热搜标题来自外部平台，必须转义后才能进入邮件 HTML
        self._template = Environment(autoescape=True).from_string(REPORT_TEMPLATE)
        # 运行时SMTP配置（从JSON配置覆盖）
        self._runtime_config: dict = {}

    def update_smtp_config(self, config: dict):
        """更新SMTP运行时配置（来自用户JSON配置）。空值会清除对应键，使环境变量回退生效。"""
        for key in ("smtp_host", "smtp_port", "smtp_user", "smtp_password", "mail_from"):
            val = config.get(key)
            if val:
                self._runtime_config[key] = int(val) if key == "smtp_port" else val
            else:
                self._runtime_config.pop(key, None)

    def _cfg(self, key: str, default=""):
        """获取配置项，运行时配置优先于环境变量"""
        return self._runtime_config.get(key) or getattr(self.settings, key, default) or default

    def _get_sender(self) -> str:
        """获取发件人地址"""
        return self._cfg("mail_from") or self._cfg("smtp_user")

    def _get_login_user(self) -> str:
        """获取SMTP登录用户名"""
        return self._cfg("smtp_user") or self._cfg("mail_from")

    def _check_config(self) -> Optional[str]:
        """检查SMTP配置，返回错误信息或None"""
        if not self._get_login_user():
            return "未配置SMTP用户 (在设置页面填写或设置 SMTP_USER 环境变量)"
        if not self._cfg("smtp_password"):
            return "未配置SMTP密码 (在设置页面填写或设置 SMTP_PASSWORD 环境变量)"
        if not self._get_sender():
            return "未配置发件人地址 (在设置页面填写或设置 MAIL_FROM 环境变量)"
        return None

    def _format_score(self, score: int) -> str:
        if score >= 100_000_000:
            return f"{score / 100_000_000:.1f}亿"
        if score >= 10_000:
            return f"{score / 10_000:.1f}万"
        return str(score)

    def _get_frequency_label(self, frequency: str) -> str:
        return {"hourly": "小时报", "daily": "日报", "weekly": "周报"}.get(frequency, "报告")

    def render_report(self, data: Dict[str, List[dict]], keywords: List[str],
                      frequency: str = "daily") -> str:
        """渲染邮件HTML"""
        all_items = []
        for items in data.values():
            if isinstance(items, list):
                all_items.extend(items)

        total_items = len(all_items)
        total_platforms = len([p for p, items in data.items() if items])
        top_score = max((item.get("score", 0) for item in all_items), default=0)

        summary = ""
        if keywords:
            summary = f"监控关键词: {', '.join(keywords)}"

        return self._template.render(
            title=f"热搜监控{self._get_frequency_label(frequency)}",
            report_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            frequency_label=self._get_frequency_label(frequency),
            summary=summary,
            total_items=total_items,
            total_platforms=total_platforms,
            top_score=self._format_score(top_score),
            grouped_items=data,
            platform_configs=PLATFORM_CONFIG,
        )

    async def send_report(self, recipients: List[str], data: Dict[str, List[dict]],
                          keywords: List[str] = None, frequency: str = "daily",
                          subject: str = None) -> dict:
        """发送邮件报告"""
        error = self._check_config()
        if error:
            logger.error(f"邮件发送失败: {error}")
            return {"success": False, "message": error}

        if not recipients:
            return {"success": False, "message": "未设置收件人"}

        html = self.render_report(data, keywords or [], frequency)
        subject = subject or f"热搜监控{self._get_frequency_label(frequency)} - {datetime.now().strftime('%Y-%m-%d %H:%M')}"

        return await self._send(recipients, subject, html)

    async def send_test(self, recipient: str) -> dict:
        """发送测试邮件"""
        error = self._check_config()
        if error:
            logger.error(f"测试邮件失败: {error}")
            return {"success": False, "message": error}

        html = """<html><body style="font-family:sans-serif;padding:40px;text-align:center">
<h2 style="color:#667eea">邮件配置测试</h2>
<p>如果你看到这封邮件，说明SMTP配置正确！</p>
<p style="color:#9ca3af;font-size:12px">发送时间: """ + datetime.now().strftime("%Y-%m-%d %H:%M:%S") + """</p>
</body></html>"""
        return await self._send([recipient], "热搜监控 - 测试邮件", html)

    async def _send(self, recipients: List[str], subject: str, html: str) -> dict:
        """底层SMTP发送"""
        last_error = ""
        for attempt in range(3):
            try:
                loop = asyncio.get_running_loop()
                await loop.run_in_executor(None, self._smtp_send, recipients, subject, html)
                logger.info(f"邮件发送成功: {', '.join(recipients)}")
                return {"success": True, "message": "发送成功"}
            except smtplib.SMTPAuthenticationError as e:
                logger.error(f"SMTP认证失败: {e}")
                return {"success": False, "message": "SMTP认证失败，请检查账号和授权码"}
            except smtplib.SMTPConnectError as e:
                host = self._cfg("smtp_host", "smtp.163.com")
                port = self._cfg("smtp_port", 465)
                logger.error(f"SMTP连接失败: {e}")
                return {"success": False, "message": f"无法连接到SMTP服务器 {host}:{port}"}
            except Exception as e:
                last_error = f"{type(e).__name__}: {e}"
                logger.warning(f"邮件发送失败 (attempt {attempt+1}): {last_error}")
                if attempt < 2:
                    await asyncio.sleep(5)
        return {"success": False, "message": f"发送失败（已重试3次）: {last_error}"}

    def _smtp_send(self, recipients: List[str], subject: str, html: str):
        """同步SMTP发送"""
        # 邮件头注入防线：剔除含换行的地址
        recipients = [r.strip() for r in recipients
                      if isinstance(r, str) and "\r" not in r and "\n" not in r and r.strip()]
        sender = self._get_sender()
        login_user = self._get_login_user()
        smtp_host = self._cfg("smtp_host", "smtp.163.com")
        try:
            smtp_port = int(self._cfg("smtp_port", 465))
        except (ValueError, TypeError):
            smtp_port = 465
        smtp_password = self._cfg("smtp_password")

        msg = MIMEMultipart("alternative")
        msg["From"] = formataddr(("热搜监控", sender))
        msg["To"] = ", ".join(recipients)
        msg["Subject"] = subject
        msg.attach(MIMEText(html, "html", "utf-8"))

        logger.info(f"SMTP连接: {smtp_host}:{smtp_port}")

        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
            server.starttls()

        with server:
            server.login(login_user, smtp_password)
            server.sendmail(sender, recipients, msg.as_string())


# 全局实例
email_service = EmailService()
