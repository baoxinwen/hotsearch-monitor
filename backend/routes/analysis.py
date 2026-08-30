"""趋势分析API"""

import logging
from pathlib import Path

from fastapi import APIRouter, Request

from analyzer import (
    extract_keywords,
    analyze_platform_distribution,
    analyze_category_heat,
    analyze_top_items,
    analyze_heat_distribution,
    analyze_cross_platform,
    analyze_keyword_trend,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analysis", tags=["analysis"])


def _get_data_and_config(request: Request):
    """获取当前热搜数据和平台配置"""
    from config import PLATFORM_CONFIG
    from fetcher import fetcher

    user_config = request.app.state.user_config

    # 优先使用缓存数据
    platform_list = user_config.get("platforms") or list(PLATFORM_CONFIG.keys())
    all_items = []
    data = {}
    for p in platform_list:
        cached = fetcher.get_cached(p)
        if cached:
            data[p] = cached
            all_items.extend(cached)

    # 如果缓存不足，使用后台任务的数据
    if len(data) < len(platform_list) // 2:
        app_data = getattr(request.app.state, "latest_data", {})
        if app_data:
            data = app_data
            all_items = []
            for items in data.values():
                if isinstance(items, list):
                    all_items.extend(items)

    return data, all_items, PLATFORM_CONFIG, user_config


@router.get("/keywords")
async def get_trending_keywords(
    request: Request,
    top_n: int = 20,
    platforms: str = None,
):
    """获取热搜关键词趋势分析"""
    from config import PLATFORM_CONFIG
    from fetcher import fetcher

    user_config = request.app.state.user_config

    if platforms:
        platform_list = [p.strip() for p in platforms.split(",") if p.strip() in PLATFORM_CONFIG]
    else:
        platform_list = user_config.get("platforms") or list(PLATFORM_CONFIG.keys())

    # 优先使用缓存数据（后台任务已抓取的），避免重复请求
    all_items = []
    cached_count = 0
    for p in platform_list:
        cached = fetcher.get_cached(p)
        if cached:
            all_items.extend(cached)
            cached_count += 1

    # 如果缓存不足，使用后台任务的数据（尊重平台筛选）
    if cached_count < len(platform_list) // 2:
        app_data = getattr(request.app.state, "latest_data", {})
        if app_data:
            all_items = []
            for p in platform_list:
                items = app_data.get(p)
                if isinstance(items, list):
                    all_items.extend(items)
            cached_count = len([p for p in platform_list if app_data.get(p)])

    keywords = extract_keywords(
        all_items, top_n,
        extra_stop_words=user_config.get("stop_words") or [],
        min_term_length=user_config.get("min_term_length", 2),
    )

    return {
        "success": True,
        "keywords": [{"term": term, "count": count} for term, count in keywords],
        "total_items": len(all_items),
        "platforms_analyzed": cached_count,
    }


@router.get("/overview")
async def get_analysis_overview(request: Request, platforms: str = None):
    """获取完整分析概览（一次性返回所有图表数据）"""
    from config import PLATFORM_CONFIG
    from fetcher import fetcher

    user_config = request.app.state.user_config

    # 支持前端传入的平台筛选
    if platforms:
        platform_list = [p.strip() for p in platforms.split(",") if p.strip() in PLATFORM_CONFIG]
    else:
        platform_list = user_config.get("platforms") or list(PLATFORM_CONFIG.keys())

    # 优先使用缓存数据
    data = {}
    all_items = []
    for p in platform_list:
        cached = fetcher.get_cached(p)
        if cached:
            data[p] = cached
            all_items.extend(cached)

    # 缓存不足时使用后台任务数据
    if len(data) < max(len(platform_list) // 2, 1):
        app_data = getattr(request.app.state, "latest_data", {})
        if app_data:
            data = {p: items for p, items in app_data.items() if p in platform_list and isinstance(items, list)}
            all_items = []
            for items in data.values():
                all_items.extend(items)

    platform_config = PLATFORM_CONFIG

    if not all_items:
        return {"success": False, "message": "暂无数据，请先获取热搜"}

    keywords = extract_keywords(
        all_items, 20,
        extra_stop_words=user_config.get("stop_words") or [],
        min_term_length=user_config.get("min_term_length", 2),
    )
    platform_dist = analyze_platform_distribution(data)
    category_heat = analyze_category_heat(data, platform_config)
    top_items = analyze_top_items(data, 10)
    heat_dist = analyze_heat_distribution(data)
    cross_platform = analyze_cross_platform(data, 15)

    # 获取历史趋势数据
    config_keywords = user_config.get("keywords", [])
    keyword_trend = []
    if config_keywords:
        from history import history_manager
        from datetime import datetime, timedelta
        today = datetime.now().strftime("%Y-%m-%d")
        snapshots = history_manager.get_snapshots(today)
        if snapshots:
            keyword_trend = analyze_keyword_trend(snapshots, config_keywords[:5])

    return {
        "success": True,
        "data": {
            "keywords": [{"term": t, "count": c} for t, c in keywords],
            "platform_distribution": platform_dist,
            "category_heat": category_heat,
            "top_items": top_items,
            "heat_distribution": heat_dist,
            "cross_platform": cross_platform,
            "keyword_trend": keyword_trend,
        },
        "total_items": len(all_items),
        "platforms_analyzed": len([p for p, items in data.items() if isinstance(items, list) and items]),
    }
