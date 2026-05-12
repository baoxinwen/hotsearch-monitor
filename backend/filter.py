"""关键词过滤模块 - 来自 hotsearch-monitor"""

import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


def filter_by_keywords(data: Dict[str, List[dict]], keywords: List[str]) -> Dict[str, List[dict]]:
    """根据关键词筛选热搜数据"""
    if not isinstance(data, dict) or not keywords:
        return {}

    filtered = {}
    keywords_lower = [kw.lower() for kw in keywords]
    for platform, items in data.items():
        if not isinstance(items, list):
            continue
        matched = [item for item in items
                   if isinstance(item, dict)
                   and item.get("title")
                   and any(kw in item["title"].lower() for kw in keywords_lower)]
        if matched:
            filtered[platform] = matched

    return filtered


def search_in_items(items: List[dict], query: str) -> List[dict]:
    """在热搜列表中搜索"""
    if not query or not items:
        return items
    query = query.strip().lower()
    return [item for item in items
            if isinstance(item, dict)
            and query in item.get("title", "").lower()]
