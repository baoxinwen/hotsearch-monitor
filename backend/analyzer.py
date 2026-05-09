"""中文趋势分析 - 来自 trendsentinel 的 NLP 分析逻辑，用 jieba 替代 segmentit"""

import re
import logging
from collections import Counter
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)

# 自定义词典 - 已知术语确保正确分词
CUSTOM_TERMS = [
    "微博之夜", "星穹铁道", "ChatGPT", "原神", "崩坏3", "英雄联盟",
    "哔哩哔哩", "今日头条", "微信读书", "澎湃新闻", "少数派",
    "特朗普", "拜登", "马斯克", "OpenAI", "DeepSeek",
    "春晚", "高考", "双十一", "奥运会", "世界杯",
    "人工智能", "大模型", "新能源", "电动车",
    "小米", "华为", "苹果", "三星", "特斯拉",
    "抖音", "快手", "小红书", "拼多多", "淘宝",
]

# 停用词（来自 trendsentinel 的 stopwords.ts）
STOP_WORDS = frozenset([
    # 代词/疑问词
    "我", "你", "他", "她", "它", "我们", "你们", "他们", "这", "那", "这个", "那个",
    "谁", "什么", "哪", "哪里", "怎么", "为什么", "多少", "几",
    # 副词
    "很", "非常", "只", "都", "不", "没", "没有", "可能", "甚至", "已经", "就", "才",
    "还", "又", "再", "也", "太", "挺", "更", "最", "比较", "特别",
    # 介词/连词
    "的", "了", "和", "与", "或", "但是", "但", "因为", "所以", "如果", "虽然", "尽管",
    "在", "从", "到", "对", "把", "被", "让", "给", "向", "往", "以",
    # 助词/语气词
    "着", "过", "吧", "呢", "吗", "啊", "呀", "哦", "嗯", "哈",
    # 量词
    "个", "位", "些", "所有", "全部", "每", "各", "某",
    # 趋势相关噪声
    "热搜", "头条", "新闻", "视频", "网友", "官方", "回应", "出现", "认为", "表示",
    "近日", "今天", "昨天", "明天", "真的", "男子", "女子", "发现", "发布", "公开",
    "首次", "最新", "突然", "刚刚", "紧急", "重磅", "震惊", "曝光", "揭秘",
])

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


def extract_keywords(items: List[dict], top_n: int = 20) -> List[Tuple[str, int]]:
    """从热搜标题中提取关键词频率统计"""
    if not items:
        return []

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

    # 第二步：清理文本
    remaining = re.sub(r'[^一-鿿\w+#.]', ' ', remaining)

    # 第三步：分词
    if _load_jieba():
        words = _jieba.lcut(remaining)
        for word in words:
            word = word.strip()
            if len(word) > 1 and word not in STOP_WORDS and not word.isdigit():
                counter[word] += 1
    else:
        # 降级：简单的中文词组提取（2-4字）
        for length in range(4, 1, -1):
            for i in range(len(remaining) - length + 1):
                chunk = remaining[i:i + length].strip()
                if (len(chunk) > 1 and
                    all('一' <= c <= '鿿' for c in chunk) and
                    chunk not in STOP_WORDS):
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
