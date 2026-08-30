"""中文趋势分析 - 用 jieba 分词 + 综合停用词表"""

import re
import logging
from collections import Counter
from pathlib import Path
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)

# 自定义词典 - 已知术语确保正确分词
CUSTOM_TERMS = [
    "微博之夜", "星穹铁道", "ChatGPT", "原神", "崩坏3", "英雄联盟",
    "哔哩哔哩", "今日头条", "微信读书", "澎湃新闻", "少数派",
    "特朗普", "拜登", "马斯克", "OpenAI", "DeepSeek", "Claude",
    "春晚", "高考", "双十一", "奥运会", "世界杯",
    "人工智能", "大模型", "新能源", "电动车", "AIGC", "AGI",
    "小米", "华为", "苹果", "三星", "特斯拉",
    "抖音", "快手", "小红书", "拼多多", "淘宝",
    # 游戏社区黑话（避免被切碎成「喜加」「加一」等碎片）
    "喜加一", "喜加二", "喜加三", "免费领", "二次元", "三连",
]

# 热搜专用停用词（补充通用停用词表之外的噪声）
_HOTSEARCH_STOP_WORDS = {
    "热搜", "头条", "新闻", "视频", "网友", "官方", "回应", "出现", "认为", "表示",
    "近日", "今天", "昨天", "明天", "真的", "男子", "女子", "发现", "发布", "公开",
    "首次", "最新", "突然", "刚刚", "紧急", "重磅", "震惊", "曝光", "揭秘",
    "话题", "引发", "关注", "热议", "讨论", "登上", "冲上", "榜一", "榜二",
    "一个", "一种", "一些", "一次", "一部", "一场", "一条", "一起", "一样",
    "不是", "可以", "已经", "还有", "就是", "这是", "那是", "也是", "都是",
    "如何", "为什么", "怎么样", "什么样", "什么时候",
    # 互动/平台行为噪声
    "点赞", "投币", "收藏", "转发", "弹幕", "评论区", "评论", "UP主", "主播",
    "加一", "加二", "加三", "白嫖", "抽奖", "开奖", "福利",
    "等等", "——", "…", "...", "||", "｜",
}


def _load_stop_words() -> frozenset:
    """加载停用词：外部文件（百度/哈工大等综合表）+ 热搜专用词"""
    words = set(_HOTSEARCH_STOP_WORDS)

    # 从文件加载综合停用词表
    stopwords_file = Path(__file__).parent / "cn_stopwords.txt"
    if stopwords_file.exists():
        try:
            with open(stopwords_file, "r", encoding="utf-8") as f:
                for line in f:
                    w = line.strip()
                    if w:
                        words.add(w)
            logger.info(f"已加载停用词表: {stopwords_file} ({len(words)} 词)")
        except Exception as e:
            logger.warning(f"加载停用词表失败: {e}")
    else:
        logger.warning(f"停用词表不存在: {stopwords_file}，仅使用内置词表")

    return frozenset(words)


STOP_WORDS = _load_stop_words()

# 加载 jieba（延迟导入，未安装时降级处理）
_jieba = None
_jieba_loaded = False


def _load_jieba():
    global _jieba, _jieba_loaded
    if _jieba_loaded:
        return _jieba is not None
    _jieba_loaded = True
    try:
        import jieba
        for term in CUSTOM_TERMS:
            jieba.add_word(term)
        _jieba = jieba
        return True
    except ImportError:
        logger.warning("jieba not installed, trend analysis will use simple regex mode")
        return False


def extract_keywords(items: List[dict], top_n: int = 20,
                     extra_stop_words: List[str] = None,
                     min_term_length: int = 2) -> List[Tuple[str, int]]:
    """从热搜标题中提取关键词频率统计

    extra_stop_words: 用户自定义停用词（来自 user_config.stop_words）
    min_term_length:  关键词最小长度（2-8，过滤分词碎片）
    """
    if not items:
        return []

    min_len = min(8, max(2, int(min_term_length or 2)))
    stop_words = STOP_WORDS
    if extra_stop_words:
        stop_words = STOP_WORDS | frozenset(w for w in extra_stop_words if w)

    titles = [item.get("title", "") for item in items if item.get("title")]
    if not titles:
        return []

    text = " ".join(titles)
    counter = Counter()

    # 第一步：匹配自定义词典中的已知术语
    remaining = text
    for term in CUSTOM_TERMS:
        count = remaining.count(term)
        if count > 0:
            counter[term] += count
            remaining = remaining.replace(term, "")

    # 第二步：清理文本（只保留中文、字母、数字、#、+）
    remaining = re.sub(r'[^一-鿿a-zA-Z0-9#+]', ' ', remaining)

    # 第三步：分词
    if _load_jieba():
        words = _jieba.lcut(remaining)
        for word in words:
            word = word.strip()
            # 过滤：长度达标、非停用词、非纯数字、非纯标点、非纯字母单字
            if (len(word) >= min_len
                and word not in stop_words
                and not word.isdigit()
                and not re.match(r'^[\W_]+$', word)
                and not re.match(r'^[a-zA-Z]$', word)):
                counter[word] += 1
    else:
        # 降级：简单的中文词组提取（min_len ~ 4 字）
        for length in range(4, min_len - 1, -1):
            for i in range(len(remaining) - length + 1):
                chunk = remaining[i:i + length].strip()
                if (len(chunk) >= min_len
                    and all('一' <= c <= '鿿' for c in chunk)
                    and chunk not in stop_words):
                    counter[chunk] += 1

    return counter.most_common(top_n)


def analyze_platform_distribution(data: Dict[str, List[dict]]) -> List[dict]:
    """平台热度分布 - 各平台热搜条目数"""
    result = []
    for platform, items in data.items():
        if isinstance(items, list) and items:
            result.append({
                "platform": platform,
                "count": len(items),
                "avg_score": sum(i.get("score", 0) for i in items) // len(items),
            })
    result.sort(key=lambda x: x["count"], reverse=True)
    return result


def analyze_category_heat(data: Dict[str, List[dict]], platform_config: dict) -> List[dict]:
    """分类热度对比 - 各分类的总热度和平均热度"""
    from collections import defaultdict
    stats = defaultdict(lambda: {"count": 0, "total_score": 0, "platforms": set()})

    for platform, items in data.items():
        if not isinstance(items, list) or not items:
            continue
        category = platform_config.get(platform, {}).get("category", "其他")
        for item in items:
            stats[category]["count"] += 1
            stats[category]["total_score"] += item.get("score", 0)
        stats[category]["platforms"].add(platform)

    result = []
    for cat, s in stats.items():
        result.append({
            "category": cat,
            "count": s["count"],
            "total_score": s["total_score"],
            "avg_score": s["total_score"] // s["count"] if s["count"] > 0 else 0,
            "platform_count": len(s["platforms"]),
        })
    result.sort(key=lambda x: x["total_score"], reverse=True)
    return result


def analyze_top_items(data: Dict[str, List[dict]], top_n: int = 10) -> List[dict]:
    """Top N 热度排行 - 所有平台中热度最高的条目"""
    all_items = []
    for items in data.values():
        if isinstance(items, list):
            all_items.extend(items)
    all_items.sort(key=lambda x: x.get("score", 0), reverse=True)
    return [{
        "rank": i + 1,
        "title": item.get("title", ""),
        "score": item.get("score", 0),
        "hot_display": item.get("hot_display", ""),
        "platform": item.get("platform", ""),
        "url": item.get("url", ""),
    } for i, item in enumerate(all_items[:top_n])]


def analyze_heat_distribution(data: Dict[str, List[dict]]) -> List[dict]:
    """热度分布直方图 - 按分数区间统计"""
    ranges = [
        {"label": "0-1万", "min": 0, "max": 10000},
        {"label": "1万-10万", "min": 10000, "max": 100000},
        {"label": "10万-100万", "min": 100000, "max": 1000000},
        {"label": "100万-1000万", "min": 1000000, "max": 10000000},
        {"label": "1000万-1亿", "min": 10000000, "max": 100000000},
        {"label": "1亿+", "min": 100000000, "max": float("inf")},
    ]
    counts = [0] * len(ranges)

    for items in data.values():
        if not isinstance(items, list):
            continue
        for item in items:
            score = item.get("score", 0)
            for i, r in enumerate(ranges):
                if r["min"] <= score < r["max"]:
                    counts[i] += 1
                    break

    return [{"label": r["label"], "count": c} for r, c in zip(ranges, counts)]


def analyze_cross_platform(data: Dict[str, List[dict]], top_n: int = 15) -> List[dict]:
    """跨平台热搜重合度 - 同一话题出现在多少个平台"""
    title_platforms = {}
    for platform, items in data.items():
        if not isinstance(items, list):
            continue
        for item in items:
            title = item.get("title", "").strip()
            if not title:
                continue
            if title not in title_platforms:
                title_platforms[title] = {"platforms": set(), "score": 0, "hot_display": ""}
            title_platforms[title]["platforms"].add(platform)
            item_score = item.get("score", 0)
            if item_score > title_platforms[title]["score"]:
                title_platforms[title]["score"] = item_score
                title_platforms[title]["hot_display"] = item.get("hot_display", "")

    result = []
    for title, info in title_platforms.items():
        if len(info["platforms"]) > 1:
            result.append({
                "title": title,
                "platform_count": len(info["platforms"]),
                "platforms": list(info["platforms"]),
                "score": info["score"],
            })
    result.sort(key=lambda x: x["platform_count"], reverse=True)
    return result[:top_n]


def analyze_keyword_trend(snapshots: List[dict], keywords: List[str]) -> List[dict]:
    """关键词趋势 - 从历史快照中追踪关键词出现频率随时间变化"""
    if not snapshots or not keywords:
        return []

    result = []
    for snap in snapshots:
        data = snap.get("data", {})
        all_titles = []
        for items in data.values():
            if isinstance(items, list):
                all_titles.extend(item.get("title", "") for item in items)

        text = " ".join(all_titles).lower()
        keyword_counts = {}
        for kw in keywords:
            keyword_counts[kw] = text.count(kw.lower())

        result.append({
            "time": f"{snap.get('date', '')} {snap.get('time', '')}",
            "timestamp": snap.get("timestamp", 0),
            "counts": keyword_counts,
            "total_items": len(all_titles),
        })

    return result
