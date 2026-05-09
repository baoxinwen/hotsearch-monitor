"""Pydantic 数据模型"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class HotSearchItem(BaseModel):
    """热搜条目"""
    id: str = ""
    rank: int = 0
    title: str
    score: int = 0
    platform: str
    url: str = ""
    category: str = ""
    timestamp: int = Field(default_factory=lambda: int(datetime.now().timestamp() * 1000))


class PlatformData(BaseModel):
    """单个平台的热搜数据"""
    items: List[HotSearchItem] = []
    error: str = ""
    update_time: str = ""


class FetchRequest(BaseModel):
    """获取热搜请求"""
    platforms: Optional[str] = None  # 逗号分隔
    keyword: Optional[str] = None
    min_score: Optional[int] = None
    force_refresh: bool = False


class ConfigUpdate(BaseModel):
    """配置更新请求"""
    keywords: Optional[List[str]] = None
    platforms: Optional[List[str]] = None
    update_interval: Optional[int] = None
    email_enabled: Optional[bool] = None
    email_to: Optional[List[str]] = None
    email_frequency: Optional[str] = None
    email_time: Optional[str] = None


class EmailConfig(BaseModel):
    """邮件配置"""
    enabled: bool = False
    recipients: List[str] = []
    frequency: str = "daily"  # hourly / daily / weekly
    send_time: str = "09:00"


class EmailSendRequest(BaseModel):
    """邮件发送请求"""
    recipients: Optional[List[str]] = None
    subject: Optional[str] = None
    platforms: Optional[str] = None
    keyword: Optional[str] = None


class HistorySnapshot(BaseModel):
    """历史快照"""
    id: str
    timestamp: int
    date: str
    time: str
    data: Dict[str, List[dict]]
    filtered_data: Dict[str, List[dict]]
    total_count: int = 0
    filtered_count: int = 0
    errors: Dict[str, str] = {}


class ApiResponse(BaseModel):
    """统一API响应"""
    success: bool = True
    data: Optional[dict] = None
    message: Optional[str] = None
    status_code: int = 200
