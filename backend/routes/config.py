"""配置管理API"""

import json
import logging
from pathlib import Path

from fastapi import APIRouter, Request

from config import DEFAULT_USER_CONFIG, PLATFORM_CONFIG
from security import sanitize_keywords, validate_time_format, validate_email, encryption

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/config", tags=["config"])

# SMTP相关配置字段
SMTP_FIELDS = {"smtp_host", "smtp_port", "smtp_user", "smtp_password", "mail_from"}


@router.get("")
async def get_config(request: Request):
    """获取当前配置"""
    user_config = request.app.state.user_config
    # 返回时隐藏 SMTP 密码明文
    safe_config = {k: v for k, v in user_config.items() if k != "smtp_password"}
    safe_config["smtp_password"] = "***" if user_config.get("smtp_password") else ""
    return {
        "success": True,
        "config": safe_config,
        "platforms": PLATFORM_CONFIG,
    }


@router.post("")
async def update_config(request: Request):
    """更新配置"""
    body = await request.json()
    if not isinstance(body, dict):
        return {"success": False, "message": "无效的请求数据"}

    user_config = request.app.state.user_config

    # 更新字段
    if "keywords" in body:
        user_config["keywords"] = sanitize_keywords(body["keywords"])
    if "platforms" in body:
        if isinstance(body["platforms"], list):
            user_config["platforms"] = [p for p in body["platforms"] if p in PLATFORM_CONFIG]
    if "update_interval" in body:
        try:
            user_config["update_interval"] = max(60, int(body["update_interval"]))
        except (ValueError, TypeError):
            pass
    if "email_enabled" in body:
        user_config["email_enabled"] = bool(body["email_enabled"])
    if "email_to" in body:
        if isinstance(body["email_to"], list):
            user_config["email_to"] = [e.strip() for e in body["email_to"] if validate_email(str(e))][:10]
    if "email_frequency" in body:
        if body["email_frequency"] in ("hourly", "daily", "weekly"):
            user_config["email_frequency"] = body["email_frequency"]
    if "email_time" in body:
        if validate_time_format(body["email_time"]):
            user_config["email_time"] = body["email_time"]

    # 防 SMTP 凭据外泄：修改 smtp_host 时必须同时重新输入密码，
    # 否则攻击者可将主机指向自己的服务器窃取受害者真实授权码
    if "smtp_host" in body:
        new_host = str(body.get("smtp_host") or "").strip()
        old_host = str(user_config.get("smtp_host") or "")
        has_saved_pwd = bool(user_config.get("smtp_password"))
        pwd_in_body = str(body.get("smtp_password") or "").strip()
        if (new_host != old_host and has_saved_pwd
                and (not pwd_in_body or pwd_in_body == "***")):
            return {"success": False,
                    "message": "修改 SMTP 服务器需要重新输入密码/授权码（安全策略）"}

    # SMTP配置（密码为掩码时跳过，不覆盖已有值）
    for field in SMTP_FIELDS:
        if field in body:
            val = str(body[field]).strip() if body[field] else ""
            if field == "smtp_password" and val == "***":
                continue
            if field == "smtp_port" and val:
                try:
                    val = str(int(val))
                except (ValueError, TypeError):
                    continue
            user_config[field] = val

    # 关键词分析设置
    if "stop_words" in body:
        if isinstance(body["stop_words"], list):
            words = [str(w).strip()[:100] for w in body["stop_words"][:200]
                     if w is not None and not isinstance(w, (dict, list)) and str(w).strip()]
            user_config["stop_words"] = words
    if "min_term_length" in body:
        try:
            user_config["min_term_length"] = min(8, max(2, int(body["min_term_length"])))
        except (ValueError, TypeError):
            pass

    # Webhook配置
    if "webhook_enabled" in body:
        user_config["webhook_enabled"] = bool(body["webhook_enabled"])
    if "webhook_url" in body:
        user_config["webhook_url"] = str(body["webhook_url"]).strip() if body["webhook_url"] else ""
    if "webhook_type" in body:
        if body["webhook_type"] in ("generic", "wechat", "dingtalk", "feishu"):
            user_config["webhook_type"] = body["webhook_type"]

    # 持久化（加密失败时中止，不落盘）
    try:
        _save_config(user_config)
    except RuntimeError:
        return {"success": False, "message": "加密服务不可用，配置未保存"}
    request.app.state.user_config = user_config

    # 同步邮件服务的运行时配置
    _sync_email_config(user_config)

    # 返回时隐藏 SMTP 密码明文
    safe_config = {k: v for k, v in user_config.items() if k != "smtp_password"}
    safe_config["smtp_password"] = "***" if user_config.get("smtp_password") else ""
    return {"success": True, "config": safe_config}


@router.post("/test-email")
async def test_email(request: Request):
    """发送测试邮件"""
    from email_service import email_service

    # 确保邮件服务使用最新配置
    _sync_email_config(request.app.state.user_config)

    user_config = request.app.state.user_config
    recipients = user_config.get("email_to", [])
    if not recipients:
        return {"success": False, "message": "未设置收件人"}

    logger.info(f"发送测试邮件到: {recipients[0]}")
    result = await email_service.send_test(recipients[0])
    return result


@router.post("/test-webhook")
async def test_webhook(request: Request):
    """发送测试 Webhook"""
    from webhook_service import webhook_service

    user_config = request.app.state.user_config
    url = user_config.get("webhook_url", "")
    webhook_type = user_config.get("webhook_type", "generic")

    if not url:
        return {"success": False, "message": "未配置 Webhook URL"}

    # 用测试数据发送
    test_data = {
        "测试平台": [
            {"rank": 1, "title": "Webhook 配置测试", "score": 100000},
            {"rank": 2, "title": "这是一条测试热搜", "score": 50000},
        ]
    }
    result = await webhook_service.send(
        url=url,
        webhook_type=webhook_type,
        data=test_data,
        keywords=["测试"],
        frequency="daily",
    )
    return result


def _sync_email_config(user_config: dict):
    """同步用户配置到邮件服务"""
    from email_service import email_service
    smtp_cfg = {k: v for k, v in user_config.items() if k in SMTP_FIELDS and v}
    if smtp_cfg:
        email_service.update_smtp_config(smtp_cfg)
        logger.debug(f"已同步SMTP配置: {list(smtp_cfg.keys())}")


def _save_config(config: dict):
    """保存配置到文件（SMTP 密码加密存储）"""
    config_dir = Path(__file__).parent.parent.parent / "config"
    config_dir.mkdir(exist_ok=True)
    config_path = config_dir / "user_config.json"
    tmp_path = config_path.with_suffix(".tmp")

    # 写入前加密 smtp_password（内存中保持明文）；加密失败则中止保存，绝不明文落盘
    save_data = config.copy()
    pwd = save_data.get("smtp_password", "")
    if pwd and not pwd.startswith("gAAAAA"):  # gAAAAA 是 Fernet token 的固定前缀
        try:
            save_data["smtp_password"] = encryption.encrypt(pwd)
        except RuntimeError as enc_err:
            logger.error(f"加密失败，取消保存配置: {enc_err}")
            raise

    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(save_data, f, ensure_ascii=False, indent=2)
        tmp_path.replace(config_path)
    except Exception as e:
        logger.error(f"保存配置失败: {e}")
        try:
            tmp_path.unlink(missing_ok=True)
        except OSError:
            pass


def load_user_config() -> dict:
    """加载用户配置（SMTP 密码自动解密）"""
    config_path = Path(__file__).parent.parent.parent / "config" / "user_config.json"
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            user_cfg = json.load(f)
        cfg = DEFAULT_USER_CONFIG.copy()
        cfg.update(user_cfg)
        # 解密 smtp_password（兼容旧版明文存储）
        pwd = cfg.get("smtp_password", "")
        if pwd and pwd.startswith("gAAAAA"):
            cfg["smtp_password"] = encryption.decrypt(pwd)
        return cfg
    except (FileNotFoundError, json.JSONDecodeError):
        return DEFAULT_USER_CONFIG.copy()
