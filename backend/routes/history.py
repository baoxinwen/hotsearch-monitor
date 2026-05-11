"""历史快照API"""

import re

from fastapi import APIRouter

from history import history_manager

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("/dates")
async def get_history_dates():
    """获取有快照的日期列表"""
    dates = history_manager.get_dates()
    return {"success": True, "dates": dates, "count": len(dates)}


@router.get("/{date}")
async def get_history_by_date(date: str):
    """获取指定日期的快照摘要列表（不含完整数据）"""
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', date):
        return {"success": False, "message": "无效的日期格式，应为 YYYY-MM-DD"}

    snapshots = history_manager.get_snapshot_summaries(date)
    return {"success": True, "date": date, "snapshots": snapshots, "count": len(snapshots)}


@router.get("/detail/{snapshot_id}")
async def get_snapshot_detail(snapshot_id: str):
    """获取单个快照的完整数据"""
    snapshot = history_manager.get_snapshot_detail(snapshot_id)
    if not snapshot:
        return {"success": False, "message": "快照不存在"}
    return {"success": True, "snapshot": snapshot}


@router.delete("/{snapshot_id}")
async def delete_snapshot(snapshot_id: str):
    """删除快照"""
    if history_manager.delete_snapshot(snapshot_id):
        return {"success": True, "message": "已删除"}
    return {"success": False, "message": "快照不存在"}
