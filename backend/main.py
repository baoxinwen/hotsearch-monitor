"""
热搜监控工具 v1.0 - FastAPI 入口
合并 hotsearch-monitor + trendsentinel 的全部功能
"""

import asyncio
import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent))

from config import get_settings, PLATFORM_CONFIG
from security import CSRFProtection, RateLimiter, encryption
from routes.config import load_user_config
from routes.hotsearch import router as hotsearch_router
from routes.config import router as config_router
from routes.analysis import router as analysis_router
from routes.email import router as email_router
from routes.history import router as history_router
from routes.health import router as health_router

# ==================== 日志配置 ====================

def setup_logging(debug: bool = False):
    log_dir = Path(__file__).parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)

    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s [%(module)s:%(funcName)s:%(lineno)d] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    root = logging.getLogger()
    root.setLevel(logging.DEBUG if debug else logging.INFO)
    root.handlers.clear()

    # 控制台
    ch = logging.StreamHandler()
    ch.setFormatter(formatter)
    ch.setLevel(logging.DEBUG if debug else logging.INFO)
    root.addHandler(ch)

    # 文件
    fh = logging.FileHandler(log_dir / "hotsearch.log", encoding="utf-8")
    fh.setFormatter(formatter)
    fh.setLevel(logging.INFO)
    root.addHandler(fh)

    # 错误日志
    eh = logging.FileHandler(log_dir / "error.log", encoding="utf-8")
    eh.setFormatter(formatter)
    eh.setLevel(logging.ERROR)
    root.addHandler(eh)

    return logging.getLogger(__name__)


# ==================== 后台任务 ====================

async def background_update(app):
    """后台定时更新热搜数据"""
    from fetcher import fetcher
    from filter import filter_by_keywords
    from history import history_manager
    from config import PLATFORM_CONFIG

    logger = logging.getLogger("background")
    await asyncio.sleep(2)  # 等待启动完成

    while True:
        try:
            user_config = app.state.user_config
            platforms = user_config.get("platforms") or list(PLATFORM_CONFIG.keys())
            keywords = user_config.get("keywords", [])

            if platforms:
                logger.info(f"后台更新: {len(platforms)} 个平台")
                data, errors = await fetcher.fetch_multiple(platforms, force_refresh=True)
                filtered = filter_by_keywords(data, keywords) if keywords else {}

                # 保存快照
                history_manager.save_snapshot(data, filtered, errors, keywords)

                # 缓存数据供API使用
                app.state.latest_data = data
                app.state.latest_filtered = filtered
                app.state.latest_errors = errors

                total = sum(len(v) for v in data.values() if isinstance(v, list))
                logger.info(f"后台更新完成: {total} 条热搜，{len(errors)} 个错误")

        except Exception as e:
            logger.error(f"后台更新失败: {e}")

        interval = app.state.user_config.get("update_interval", 300)
        await asyncio.sleep(interval)


async def background_email(app):
    """后台定时推送（邮件 + Webhook）"""
    from email_service import email_service
    from filter import filter_by_keywords

    logger = logging.getLogger("scheduler")
    await asyncio.sleep(10)

    while True:
        try:
            user_config = app.state.user_config
            email_enabled = user_config.get("email_enabled") and user_config.get("email_to")
            webhook_enabled = user_config.get("webhook_enabled") and user_config.get("webhook_url")

            if email_enabled or webhook_enabled:
                from datetime import datetime
                now = datetime.now()
                send_time = user_config.get("email_time", "09:00")
                frequency = user_config.get("email_frequency", "daily")

                should_send = False
                hour, minute = map(int, send_time.split(":"))

                if frequency == "hourly" and now.minute == minute:
                    should_send = True
                elif frequency == "daily" and now.hour == hour and now.minute == minute:
                    should_send = True
                elif frequency == "weekly" and now.weekday() == 0 and now.hour == hour and now.minute == minute:
                    should_send = True

                if should_send:
                    logger.info(f"定时推送触发: {frequency} at {send_time}")
                    data = getattr(app.state, "latest_data", {})
                    filtered = getattr(app.state, "latest_filtered", {})
                    keywords = user_config.get("keywords", [])

                    if not data:
                        from fetcher import fetcher
                        from config import PLATFORM_CONFIG
                        platforms = user_config.get("platforms") or list(PLATFORM_CONFIG.keys())
                        data, _ = await fetcher.fetch_multiple(platforms)
                        filtered = filter_by_keywords(data, keywords) if keywords else data

                    # 有关键词时用过滤结果（即使为空），无关键词时用全部数据
                    report_data = filtered if keywords else data

                    # 发送邮件
                    if email_enabled:
                        await email_service.send_report(
                            recipients=user_config["email_to"],
                            data=report_data,
                            keywords=keywords,
                            frequency=frequency,
                        )

                    # 发送 Webhook
                    if webhook_enabled:
                        from webhook_service import webhook_service
                        await webhook_service.send(
                            url=user_config["webhook_url"],
                            webhook_type=user_config.get("webhook_type", "generic"),
                            data=report_data,
                            keywords=keywords,
                            frequency=frequency,
                        )

        except Exception as e:
            logger.error(f"定时推送失败: {e}")

        await asyncio.sleep(60)  # 每分钟检查一次


# ==================== 生命周期 ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger = logging.getLogger(__name__)
    settings = get_settings()

    # 初始化加密
    key_file = Path(__file__).parent.parent / "config" / ".key"
    encryption.init_key(str(key_file), settings.encryption_key)
    app.state.encryption = encryption

    # 初始化CSRF
    app.state.csrf = CSRFProtection(settings.csrf_secret_key)

    # 初始化限流器
    app.state.rate_limiter = RateLimiter(settings.rate_limit_requests, settings.rate_limit_window)

    # 加载用户配置
    app.state.user_config = load_user_config()
    app.state.latest_data = {}
    app.state.latest_filtered = {}
    app.state.latest_errors = {}

    # 同步邮件配置到邮件服务
    from email_service import email_service
    from routes.config import _sync_email_config
    _sync_email_config(app.state.user_config)

    logger.info("=" * 50)
    logger.info("热搜监控工具 v1.0 已启动")
    logger.info(f"访问地址: http://{settings.host}:{settings.port}")
    logger.info(f"运行模式: {'开发模式' if settings.debug else '生产模式'}")
    logger.info(f"监控平台: {len(app.state.user_config.get('platforms', []))} 个")
    logger.info(f"关键词: {', '.join(app.state.user_config.get('keywords', [])) or '无'}")
    logger.info("=" * 50)

    # 启动后台任务
    update_task = asyncio.create_task(background_update(app))
    email_task = asyncio.create_task(background_email(app))

    yield

    # 关闭
    update_task.cancel()
    email_task.cancel()
    try:
        await asyncio.gather(update_task, email_task, return_exceptions=True)
    except asyncio.CancelledError:
        pass
    logger.info("热搜监控工具已关闭")


# ==================== 创建应用 ====================

settings = get_settings()
logger = setup_logging(settings.debug)

app = FastAPI(
    title="热搜监控 API",
    version="1.0.0",
    description="多平台热搜聚合监控工具",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 安全头中间件
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # CSP - 允许前端开发服务器
    if settings.debug:
        csp = "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:* ws://localhost:*"
    else:
        csp = "default-src 'self'; connect-src 'self'"
    response.headers["Content-Security-Policy"] = csp

    return response


# 限流中间件
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if not settings.rate_limit_enabled:
        return await call_next(request)

    # 跳过健康检查和静态文件
    if request.url.path in ("/health", "/docs", "/openapi.json"):
        return await call_next(request)

    ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    if not ip:
        ip = request.headers.get("X-Real-IP", "")
    if not ip:
        ip = request.client.host if request.client else "unknown"

    limiter = request.app.state.rate_limiter
    allowed, remaining = limiter.is_allowed(ip)

    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"success": False, "message": "请求过于频繁，请稍后再试"},
            headers={"Retry-After": "30", "X-RateLimit-Remaining": "0"},
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    return response


# CSRF 中间件
@app.middleware("http")
async def csrf_middleware(request: Request, call_next):
    # 只校验修改类请求
    if request.method in ("POST", "PUT", "DELETE", "PATCH"):
        # 跳过不需要 CSRF 的路径
        skip_paths = ("/health", "/docs", "/openapi.json", "/api/csrf-token")
        if request.url.path not in skip_paths:
            token = request.headers.get("X-CSRF-Token", "")
            if not request.app.state.csrf.validate_token(token):
                return JSONResponse(
                    status_code=403,
                    content={"success": False, "message": "CSRF token 无效或已过期"},
                )
    return await call_next(request)


# 注册路由
app.include_router(hotsearch_router)
app.include_router(config_router)
app.include_router(analysis_router)
app.include_router(email_router)
app.include_router(history_router)
app.include_router(health_router)


# 静态文件服务（前端构建产物）
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
