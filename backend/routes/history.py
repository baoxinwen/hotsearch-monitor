"""历史快照API"""

from fastapi import APIRouter, Query

from history import history_manager

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("/dates")
async def get_history_dates():
    """获取有快照的日期列表"""
    dates = history_manager.get_dates()
    return {"success": True, "dates": dates, "count": len(dates)}


@router.get("/{date}")
async def get_history_by_date(date: str):
    """获取指定日期的快照"""
    import re
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', date):
        return {"success": False, "message": "无效的日期格式，应为 YYYY-MM-DD"}

    snapshots = history_manager.get_snapshots(date)
    return {"success": True, "date": date, "snapshots": snapshots, "count": len(snapshots)}


@router.delete("/{snapshot_id}")
async def delete_snapshot(snapshot_id: str):
    """删除快照"""
    if history_manager.delete_snapshot(snapshot_id):
        return {"success": True, "message": "已删除"}
    return {"success": False, "message": "快照不存在"}
