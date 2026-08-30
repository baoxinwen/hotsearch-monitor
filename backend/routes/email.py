"""邮件订阅API"""

import logging
from fastapi import APIRouter, Request

from email_service import email_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/email", tags=["email"])


@router.post("/send")
async def send_report(request: Request):
    """手动发送邮件报告（按用户配置的平台和关键词）"""
    try:
        from config import PLATFORM_CONFIG
        from fetcher import fetcher
        from filter import filter_by_keywords

        body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
        user_config = request.app.state.user_config

        recipients = body.get("recipients") or user_config.get("email_to", [])
        if not recipients:
            return {"success": False, "message": "未设置收件人"}

        # 按用户配置的平台抓取
        platforms = user_config.get("platforms") or list(PLATFORM_CONFIG.keys())
        keywords = user_config.get("keywords", [])

        logger.info(f"邮件报告: 抓取 {len(platforms)} 个平台, 关键词: {keywords or '无'}")
        data, errors = await fetcher.fetch_multiple(platforms)

        # 按关键词过滤
        if keywords:
            filtered = filter_by_keywords(data, keywords)
        else:
            filtered = data  # 无关键词时使用全部数据

        total = sum(len(v) for v in data.values() if isinstance(v, list))
        filtered_total = sum(len(v) for v in filtered.values() if isinstance(v, list))
        logger.info(f"邮件报告: 抓取到 {total} 条热搜, 过滤后 {filtered_total} 条")

        if errors:
            logger.warning(f"邮件报告: 抓取错误 {errors}")

        result = await email_service.send_report(
            recipients=recipients,
            data=filtered if filtered else data,
            keywords=keywords,
            frequency=user_config.get("email_frequency", "daily"),
        )
        return result
    except Exception as e:
        logger.error(f"邮件报告异常: {type(e).__name__}: {e}", exc_info=True)
        return {"success": False, "message": f"发送失败: {type(e).__name__}: {e}"}


@router.post("/test")
async def test_email(request: Request):
    """发送测试邮件"""
    try:
        body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
        recipient = body.get("to") or body.get("recipient")
        if not recipient:
            user_config = request.app.state.user_config
            recipients = user_config.get("email_to", [])
            if not recipients:
                return {"success": False, "message": "未设置收件人，请先填写收件人地址"}
            recipient = recipients[0]

        # 如果前端传了 SMTP 配置（用户未保存就点测试），临时更新邮件服务
        from routes.config import SMTP_FIELDS
        smtp_from_body = {k: body[k] for k in SMTP_FIELDS if k in body and body[k]}
        saved_runtime = dict(email_service._runtime_config)  # 备份
        try:
            if smtp_from_body:
                email_service.update_smtp_config(smtp_from_body)
                logger.info(f"使用表单SMTP配置测试: {list(smtp_from_body.keys())}")
            else:
                from routes.config import _sync_email_config
                _sync_email_config(request.app.state.user_config)

            logger.info(f"发送测试邮件到: {recipient}")
            return await email_service.send_test(recipient)
        finally:
            email_service._runtime_config = saved_runtime  # 恢复，避免污染全局
    except Exception as e:
        logger.error(f"测试邮件异常: {type(e).__name__}: {e}", exc_info=True)
        return {"success": False, "message": f"发送失败: {type(e).__name__}: {e}"}


@router.get("/verify")
async def verify_smtp():
    """验证SMTP连接"""
    error = email_service._check_config()
    if error:
        return {"success": False, "message": error}
    host = email_service._cfg("smtp_host", "smtp.163.com")
    port = email_service._cfg("smtp_port", 465)
    return {"success": True, "message": f"SMTP配置正常: {host}:{port}"}
