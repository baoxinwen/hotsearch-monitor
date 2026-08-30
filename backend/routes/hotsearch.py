"""热搜数据API"""

import time
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request

from config import PLATFORM_CONFIG, PLATFORM_CATEGORIES
from fetcher import fetcher
from filter import filter_by_keywords, search_in_items

router = APIRouter(prefix="/api/hotsearch", tags=["hotsearch"])


@router.get("")
async def get_hotsearch(
    request: Request,
    platforms: Optional[str] = Query(None, description="逗号分隔的平台列表"),
    keyword: Optional[str] = Query(None, description="关键词筛选"),
    min_score: Optional[int] = Query(None, description="最低热度"),
    force_refresh: bool = Query(False, description="强制刷新"),
):
    """获取热搜数据"""
    # 解析平台列表
    if platforms:
        platform_list = [p.strip() for p in platforms.split(",") if p.strip() in PLATFORM_CONFIG]
    else:
        # 从用户配置获取，默认为全部平台
        user_config = request.app.state.user_config
        platform_list = user_config.get("platforms") or list(PLATFORM_CONFIG.keys())

    data, errors = await fetcher.fetch_multiple(platform_list, force_refresh)

    # 关键词过滤
    filtered = {}
    if keyword:
        keywords = [kw.strip() for kw in keyword.split(",") if kw.strip()]
        filtered = filter_by_keywords(data, keywords)
    else:
        user_config = request.app.state.user_config
        if user_config.get("keywords"):
            filtered = filter_by_keywords(data, user_config["keywords"])
        else:
            # 无关键词时，筛选结果等于全部数据
            filtered = data

    # 最低热度过滤（创建新字典，不污染缓存）
    if min_score:
        data = {p: [i for i in items if i.get("score", 0) >= min_score] for p, items in data.items()}
        filtered = {p: [i for i in items if i.get("score", 0) >= min_score] for p, items in filtered.items()}

    return {
        "success": True,
        "data": data,
        "filtered": filtered,
        "errors": errors,
        "update_time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "disabled_platforms": fetcher.get_disabled_platforms(),
    }


@router.get("/platforms")
async def get_platforms():
    """获取所有平台配置"""
    return {
        "success": True,
        "platforms": PLATFORM_CONFIG,
        "categories": PLATFORM_CATEGORIES,
    }


@router.get("/cache/stats")
async def cache_stats(request: Request):
    """缓存统计"""
    _check_api_key(request)
    return {"success": True, "stats": fetcher.get_cache_stats()}


@router.post("/cache/clear")
async def clear_cache(request: Request):
    """清除缓存"""
    _check_api_key(request)
    fetcher.clear_cache()
    return {"success": True, "message": "缓存已清除"}


@router.post("/refresh/{platform}")
async def refresh_platform(request: Request, platform: str):
    """刷新单个平台"""
    if platform not in PLATFORM_CONFIG:
        return {"success": False, "message": f"无效的平台: {platform}"}

    data, error = await fetcher.fetch_platform(platform, force_refresh=True)
    return {
        "success": not error,
        "data": data,
        "error": error,
        "update_time": time.strftime("%Y-%m-%d %H:%M:%S"),
    }


@router.post("/enable/{platform}")
async def enable_platform(platform: str):
    """重新启用被禁用的平台"""
    fetcher.enable_platform(platform)
    return {"success": True, "message": f"已启用 {platform}"}


def _check_api_key(request: Request):
    from config import get_settings
    settings = get_settings()
    if settings.api_key:
        key = request.headers.get("X-API-Key", "")
        if key != settings.api_key:
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="Invalid API key")
