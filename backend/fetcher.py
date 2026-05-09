"""多平台热搜并发抓取 - 合并 hotsearch-monitor 的并发+重试 + trendsentinel 的分块请求"""

import asyncio
import hashlib
import logging
import random
import time
from typing import Dict, List, Tuple
from urllib.parse import quote

import httpx

from config import PLATFORM_CONFIG, get_settings
from security import parse_score

logger = logging.getLogger(__name__)


class HotSearchFetcher:
    """热搜数据抓取器"""

    def __init__(self):
        self.settings = get_settings()
        self._cache: Dict[str, dict] = {}  # {platform: {data, timestamp}}
        self._failure_counts: Dict[str, int] = {}
        self._disabled_platforms: set = set()

    def _is_cached(self, platform: str) -> bool:
        if platform not in self._cache:
            return False
        age = time.time() - self._cache[platform]["timestamp"]
        return age < self.settings.cache_ttl

    def get_cached(self, platform: str) -> List[dict]:
        if self._is_cached(platform):
            return self._cache[platform]["data"]
        return []

    def clear_cache(self, platform: str = None):
        if platform:
            self._cache.pop(platform, None)
        else:
            self._cache.clear()

    def get_cache_stats(self) -> dict:
        return {
            "cached_platforms": len(self._cache),
            "disabled_platforms": list(self._disabled_platforms),
            "failure_counts": dict(self._failure_counts),
        }

    async def fetch_platform(self, platform: str, force_refresh: bool = False) -> Tuple[List[dict], str]:
        """获取单个平台热搜"""
        if platform not in PLATFORM_CONFIG:
            return [], f"不支持的平台: {platform}"

        if platform in self._disabled_platforms:
            return [], "平台已自动禁用（连续失败过多）"

        if not force_refresh and self._is_cached(platform):
            return self._cache[platform]["data"], ""

        platform_info = PLATFORM_CONFIG[platform]
        platform_name = platform_info["name"]
        url = f"{self.settings.uapi_base_url}?type={platform}"
        headers = {"User-Agent": "Mozilla/5.0 (compatible; HotSearchMonitor/1.0)"}

        last_error = ""
        async with httpx.AsyncClient(timeout=self.settings.api_timeout) as client:
            for attempt in range(self.settings.api_max_retries):
                try:
                    resp = await client.get(url, headers=headers)

                    if resp.status_code == 429:
                        delay = (attempt + 1) * 1.5 + random.uniform(0, 0.5)
                        logger.warning(f"{platform_name}: 429 rate limit, retry in {delay:.1f}s ({attempt+1}/{self.settings.api_max_retries})")
                        await asyncio.sleep(delay)
                        continue

                    if resp.status_code >= 500:
                        delay = (attempt + 1) * self.settings.api_retry_delay
                        logger.warning(f"{platform_name}: HTTP {resp.status_code}, retry in {delay:.1f}s")
                        await asyncio.sleep(delay)
                        continue

                    if resp.status_code >= 400:
                        last_error = f"HTTP {resp.status_code}"
                        break

                    data = resp.json()
                    items = self._parse_response(data, platform, platform_info)

                    # 更新缓存
                    self._cache[platform] = {"data": items, "timestamp": time.time()}
                    self._failure_counts.pop(platform, None)

                    logger.info(f"{platform_name}: 获取 {len(items)} 条热搜")
                    return items, ""

                except httpx.TimeoutException:
                    last_error = "请求超时"
                    delay = (attempt + 1) * self.settings.api_retry_delay
                    logger.warning(f"{platform_name}: timeout, retry in {delay:.1f}s")
                    await asyncio.sleep(delay)
                except httpx.ConnectError:
                    last_error = "连接失败"
                    delay = (attempt + 1) * self.settings.api_retry_delay
                    await asyncio.sleep(delay)
                except Exception as e:
                    last_error = str(e)
                    logger.error(f"{platform_name}: unexpected error: {e}")
                    break

        # 失败处理
        logger.error(f"{platform_name}: 所有重试失败 - {last_error}")
        self._failure_counts[platform] = self._failure_counts.get(platform, 0) + 1
        if (self.settings.auto_disable_failed and
                self._failure_counts[platform] >= self.settings.max_consecutive_failures):
            self._disabled_platforms.add(platform)
            logger.warning(f"{platform_name}: 连续失败 {self._failure_counts[platform]} 次，已自动禁用")

        return [], last_error

    def _parse_response(self, data: dict, platform: str, platform_info: dict) -> List[dict]:
        """解析UApiPro响应，兼容多种返回格式"""
        # 尝试多种JSON结构
        items = data.get("list", [])
        if not items and "data" in data:
            inner = data["data"]
            if isinstance(inner, list):
                items = inner
            elif isinstance(inner, dict):
                items = inner.get("list", inner.get("items", []))

        result = []
        title_fields = ["title", "name", "subject", "content", "text"]

        for i, item in enumerate(items[:50]):
            if not isinstance(item, dict):
                continue
            title = ""
            for field in title_fields:
                title = str(item.get(field, "")).strip()
                if title:
                    break
            if not title:
                continue

            rank = 0
            try:
                rank = int(item.get("index", i + 1))
            except (ValueError, TypeError):
                rank = i + 1

            # 热度值：兼容 hot / hot_value / heat / score / value（0 是合法值）
            hot_raw = item.get("hot_value")
            if hot_raw is None:
                hot_raw = item.get("hot")
            if hot_raw is None:
                hot_raw = item.get("heat")
            if hot_raw is None:
                hot_raw = item.get("score")
            if hot_raw is None:
                hot_raw = item.get("value")
            if hot_raw is None:
                hot_raw = ""
            score = parse_score(hot_raw) if hot_raw else 0

            # URL：优先API返回，否则用模板（避免 format 注入）
            item_url = item.get("url") or item.get("link") or item.get("mobileUrl") or ""
            if not item_url and platform_info.get("url"):
                try:
                    item_url = platform_info["url"].replace("{title}", quote(title, safe=""))
                except Exception:
                    item_url = ""

            # 确定性 ID（跨进程/重启一致）
            title_hash = hashlib.md5(title.encode("utf-8")).hexdigest()[:6]
            result.append({
                "id": f"{platform}_{rank}_{title_hash}",
                "rank": rank,
                "title": title,
                "score": score,
                "platform": platform,
                "url": item_url,
                "category": platform_info.get("category", ""),
                "hot_display": str(hot_raw) if hot_raw else "",
                "timestamp": int(time.time() * 1000),
            })

        return result

    async def fetch_multiple(self, platforms: List[str], force_refresh: bool = False) -> Tuple[Dict[str, List[dict]], Dict[str, str]]:
        """并发获取多个平台，分块请求避免限流"""
        result = {}
        errors = {}
        chunk_size = 2
        chunk_delay = 0.8

        for i in range(0, len(platforms), chunk_size):
            chunk = platforms[i:i + chunk_size]
            tasks = [self.fetch_platform(p, force_refresh) for p in chunk]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for platform, res in zip(chunk, results):
                if isinstance(res, Exception):
                    errors[platform] = str(res)
                    result[platform] = []
                else:
                    data, error = res
                    result[platform] = data
                    if error:
                        errors[platform] = error

            if i + chunk_size < len(platforms):
                await asyncio.sleep(chunk_delay)

        return result, errors

    def enable_platform(self, platform: str):
        """重新启用被禁用的平台"""
        self._disabled_platforms.discard(platform)
        self._failure_counts.pop(platform, None)

    def get_disabled_platforms(self) -> List[str]:
        return list(self._disabled_platforms)


# 全局实例
fetcher = HotSearchFetcher()
