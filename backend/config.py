"""配置管理 - 合并环境变量和JSON文件配置"""

import os
import secrets
from functools import lru_cache
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
CONFIG_DIR = BASE_DIR / "config"
LOGS_DIR = BASE_DIR / "logs"


class Settings(BaseSettings):
    """应用配置，支持环境变量覆盖"""

    # 运行模式
    debug: bool = Field(default=False, alias="DEBUG")
    env: str = Field(default="production", alias="ENV")

    # API
    api_key: str = Field(default="", alias="API_KEY")
    cors_origins: str = Field(default="", alias="CORS_ORIGINS")

    # 安全
    csrf_secret_key: str = Field(default_factory=lambda: secrets.token_hex(32), alias="CSRF_SECRET_KEY")
    encryption_key: str = Field(default="", alias="ENCRYPTION_KEY")

    # UApiPro
    uapi_base_url: str = Field(default="https://uapis.cn/api/v1/misc/hotboard", alias="UAPI_BASE_URL")
    uapi_api_key: str = Field(default="", alias="UAPI_API_KEY")  # 多个 key 逗号分隔
    api_timeout: int = Field(default=15, alias="API_TIMEOUT")
    api_max_workers: int = Field(default=10, alias="API_MAX_WORKERS")
    api_max_retries: int = Field(default=3, alias="API_MAX_RETRIES")
    api_retry_delay: float = Field(default=1.0, alias="API_RETRY_DELAY")

    @property
    def uapi_api_keys(self) -> List[str]:
        """解析逗号分隔的多个 API Key"""
        if not self.uapi_api_key:
            return []
        return [k.strip() for k in self.uapi_api_key.split(",") if k.strip()]

    # 缓存
    cache_ttl: int = Field(default=60, alias="CACHE_TTL")

    # 自动禁用
    auto_disable_failed: bool = Field(default=True, alias="AUTO_DISABLE_FAILED_PLATFORMS")
    max_consecutive_failures: int = Field(default=5, alias="MAX_CONSECUTIVE_FAILURES")

    # 限流
    rate_limit_enabled: bool = Field(default=True, alias="RATE_LIMIT_ENABLED")
    rate_limit_requests: int = Field(default=60, alias="RATE_LIMIT_REQUESTS")
    rate_limit_window: int = Field(default=60, alias="RATE_LIMIT_WINDOW")

    # 历史快照
    history_enabled: bool = Field(default=True, alias="HISTORY_ENABLED")
    history_retention_days: int = Field(default=7, alias="HISTORY_RETENTION_DAYS")
    max_history_snapshots: int = Field(default=1000, alias="MAX_HISTORY_SNAPSHOTS")

    # 邮件
    smtp_host: str = Field(default="smtp.163.com", alias="SMTP_HOST")
    smtp_port: int = Field(default=465, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    mail_from: str = Field(default="", alias="MAIL_FROM")

    # 压缩
    enable_gzip: bool = Field(default=True, alias="ENABLE_GZIP")
    gzip_min_size: int = Field(default=500, alias="GZIP_MIN_SIZE")

    # 服务
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")

    model_config = {"env_file": str(BASE_DIR / ".env"), "extra": "ignore"}

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.cors_origins:
            # 开发模式允许 localhost；生产模式需显式配置（nginx 同源代理不需要 CORS）
            return ["http://localhost:5173", "http://localhost:8000"] if self.debug else []
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


# 用户运行时配置（JSON文件持久化）
DEFAULT_USER_CONFIG = {
    "version": "1.0",
    "keywords": [],
    "platforms": [],  # 空列表表示全部平台
    "update_interval": 300,
    "email_enabled": False,
    "email_to": [],
    "email_frequency": "daily",
    "email_time": "09:00",
    "webhook_enabled": False,
    "webhook_url": "",
    "webhook_type": "generic",  # generic / wechat / dingtalk / feishu
}

# 平台配置 - 合并两个项目的平台定义
PLATFORM_CONFIG = {
    # 视频/社区
    "bilibili": {"name": "哔哩哔哩", "category": "视频/社区", "color": "#f472b6", "icon": "📺", "url": "https://www.bilibili.com/search?keyword={title}"},
    "acfun": {"name": "AcFun", "category": "视频/社区", "color": "#ef4444", "icon": "🅰️", "url": "https://www.acfun.cn/search?keyword={title}"},
    "weibo": {"name": "微博", "category": "视频/社区", "color": "#ef4444", "icon": "🔥", "url": "https://s.weibo.com/weibo?q={title}"},
    "zhihu": {"name": "知乎", "category": "视频/社区", "color": "#3b82f6", "icon": "🧠", "url": "https://www.zhihu.com/search?type=content&q={title}"},
    "zhihu-daily": {"name": "知乎日报", "category": "视频/社区", "color": "#60a5fa", "icon": "📅", "url": "https://www.zhihu.com/search?q={title}"},
    "douyin": {"name": "抖音", "category": "视频/社区", "color": "#1a1a1a", "icon": "🎵", "url": "https://www.douyin.com/search/{title}"},
    "kuaishou": {"name": "快手", "category": "视频/社区", "color": "#f97316", "icon": "📹", "url": "https://www.kuaishou.com/search?keyword={title}"},
    "douban-movie": {"name": "豆瓣电影", "category": "视频/社区", "color": "#16a34a", "icon": "🎬", "url": "https://movie.douban.com/subject_search?search_text={title}"},
    "douban-group": {"name": "豆瓣小组", "category": "视频/社区", "color": "#22c55e", "icon": "👥", "url": "https://www.douban.com/group/search?q={title}"},
    "tieba": {"name": "百度贴吧", "category": "视频/社区", "color": "#2563eb", "icon": "💬", "url": "https://tieba.baidu.com/f?kw={title}"},
    "hupu": {"name": "虎扑", "category": "视频/社区", "color": "#b91c1c", "icon": "🏀", "url": "https://so.hupu.com/search?q={title}"},
    "miyoushe": {"name": "米游社", "category": "视频/社区", "color": "#8b5cf6", "icon": "🎮", "url": "https://www.miyoushe.com/search?keyword={title}"},
    "ngabbs": {"name": "NGA", "category": "视频/社区", "color": "#b45309", "icon": "⚔️", "url": "https://bbs.nga.cn/thread.php?keyword={title}"},
    "v2ex": {"name": "V2EX", "category": "视频/社区", "color": "#374151", "icon": "💻", "url": "https://www.google.com/search?q=site:v2ex.com+{title}"},
    "52pojie": {"name": "吾爱破解", "category": "视频/社区", "color": "#9333ea", "icon": "🔓", "url": "https://www.52pojie.cn/search.php?keyword={title}"},
    "hostloc": {"name": "主机交流", "category": "视频/社区", "color": "#4f46e5", "icon": "🌐", "url": "https://www.hostloc.com/search.php?q={title}"},
    "coolapk": {"name": "酷安", "category": "视频/社区", "color": "#22c55e", "icon": "📱", "url": "https://www.coolapk.com/search?q={title}"},
    # 新闻/资讯
    "baidu": {"name": "百度", "category": "新闻/资讯", "color": "#2563eb", "icon": "🐾", "url": "https://www.baidu.com/s?wd={title}"},
    "thepaper": {"name": "澎湃新闻", "category": "新闻/资讯", "color": "#0891b2", "icon": "🗞️", "url": "https://www.thepaper.cn/search?keyWord={title}"},
    "toutiao": {"name": "今日头条", "category": "新闻/资讯", "color": "#dc2626", "icon": "📰", "url": "https://www.toutiao.com/search/{title}"},
    "qq-news": {"name": "腾讯新闻", "category": "新闻/资讯", "color": "#1d4ed8", "icon": "🐧", "url": "https://www.qq.com/search?keyword={title}"},
    "sina": {"name": "新浪热搜", "category": "新闻/资讯", "color": "#eab308", "icon": "👁️", "url": "https://news.sina.com.cn/search/{title}"},
    "sina-news": {"name": "新浪新闻", "category": "新闻/资讯", "color": "#ca8a04", "icon": "📰", "url": "https://news.sina.com.cn/search/{title}"},
    "netease-news": {"name": "网易新闻", "category": "新闻/资讯", "color": "#ef4444", "icon": "📧", "url": "https://news.163.com/search?keyword={title}"},
    "huxiu": {"name": "虎嗅", "category": "新闻/资讯", "color": "#1f2937", "icon": "🐯", "url": "https://www.huxiu.com/search?keyword={title}"},
    "ifanr": {"name": "爱范儿", "category": "新闻/资讯", "color": "#f87171", "icon": "❤️", "url": "https://www.ifanr.com/search?q={title}"},
    # 技术/IT
    "sspai": {"name": "少数派", "category": "技术/IT", "color": "#ef4444", "icon": "🥧", "url": "https://sspai.com/search?q={title}"},
    "ithome": {"name": "IT之家", "category": "技术/IT", "color": "#b91c1c", "icon": "🏠", "url": "https://www.ithome.com/search/{title}"},
    "ithome-xijiayi": {"name": "IT之家喜加一", "category": "技术/IT", "color": "#dc2626", "icon": "🎁", "url": "https://www.ithome.com/search/{title}"},
    "juejin": {"name": "掘金", "category": "技术/IT", "color": "#3b82f6", "icon": "💎", "url": "https://juejin.cn/search?q={title}"},
    "jianshu": {"name": "简书", "category": "技术/IT", "color": "#f87171", "icon": "📝", "url": "https://www.jianshu.com/search?q={title}"},
    "guokr": {"name": "果壳", "category": "技术/IT", "color": "#16a34a", "icon": "🐚", "url": "https://www.guokr.com/search?q={title}"},
    "36kr": {"name": "36氪", "category": "技术/IT", "color": "#60a5fa", "icon": "💼", "url": "https://36kr.com/search/articles/{title}"},
    "51cto": {"name": "51CTO", "category": "技术/IT", "color": "#1e3a8a", "icon": "👨‍💻", "url": "https://www.51cto.com/search?q={title}"},
    "csdn": {"name": "CSDN", "category": "技术/IT", "color": "#ea580c", "icon": "©️", "url": "https://so.csdn.net/search?q={title}"},
    "nodeseek": {"name": "NodeSeek", "category": "技术/IT", "color": "#4b5563", "icon": "🔍", "url": "https://www.nodeseek.com/search?keyword={title}"},
    "hellogithub": {"name": "HelloGitHub", "category": "技术/IT", "color": "#1f2937", "icon": "🐙", "url": "https://hellogithub.com/search?q={title}"},
    # 游戏
    "lol": {"name": "英雄联盟", "category": "游戏", "color": "#ca8a04", "icon": "🎮", "url": ""},
    "genshin": {"name": "原神", "category": "游戏", "color": "#a855f7", "icon": "✨", "url": ""},
    "honkai": {"name": "崩坏3", "category": "游戏", "color": "#60a5fa", "icon": "🚀", "url": ""},
    "starrail": {"name": "星穹铁道", "category": "游戏", "color": "#6366f1", "icon": "🚂", "url": ""},
    # 音乐
    "netease-music": {"name": "网易云音乐", "category": "音乐", "color": "#dc2626", "icon": "🎵", "url": "https://music.163.com/search?keyword={title}"},
    "qq-music": {"name": "QQ音乐", "category": "音乐", "color": "#16a34a", "icon": "🎶", "url": "https://y.qq.com/n/ryqq/search?w={title}"},
    # 其他
    "weread": {"name": "微信读书", "category": "其他", "color": "#60a5fa", "icon": "📚", "url": ""},
    "weatheralarm": {"name": "天气预警", "category": "其他", "color": "#f97316", "icon": "⛈️", "url": ""},
    "earthquake": {"name": "地震速报", "category": "其他", "color": "#1f2937", "icon": "🌋", "url": ""},
    "history": {"name": "历史上的今天", "category": "其他", "color": "#d97706", "icon": "📜", "url": ""},
}

# 平台分类
PLATFORM_CATEGORIES = {
    "视频/社区": [k for k, v in PLATFORM_CONFIG.items() if v["category"] == "视频/社区"],
    "新闻/资讯": [k for k, v in PLATFORM_CONFIG.items() if v["category"] == "新闻/资讯"],
    "技术/IT": [k for k, v in PLATFORM_CONFIG.items() if v["category"] == "技术/IT"],
    "游戏": [k for k, v in PLATFORM_CONFIG.items() if v["category"] == "游戏"],
    "音乐": [k for k, v in PLATFORM_CONFIG.items() if v["category"] == "音乐"],
    "其他": [k for k, v in PLATFORM_CONFIG.items() if v["category"] == "其他"],
}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
