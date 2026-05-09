"""健康检查API"""

import time
from fastapi import APIRouter, Request

router = APIRouter(tags=["health"])

START_TIME = time.time()


@router.get("/health")
async def health_check(request: Request):
    """健康检查"""
    uptime = int(time.time() - START_TIME)
    hours, remainder = divmod(uptime, 3600)
    minutes, seconds = divmod(remainder, 60)

    user_config = request.app.state.user_config

    return {
        "status": "healthy",
        "version": user_config.get("version", "1.0"),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "uptime": f"{hours:02d}:{minutes:02d}:{seconds:02d}",
        "platforms_count": len(user_config.get("platforms", [])),
        "keywords_count": len(user_config.get("keywords", [])),
    }


@router.get("/api/csrf-token")
async def get_csrf_token(request: Request):
    """获取CSRF令牌"""
    csrf = request.app.state.csrf
    return {"success": True, "csrf_token": csrf.generate_token()}
