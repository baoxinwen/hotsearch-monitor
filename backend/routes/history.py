"""历史快照API"""

import asyncio
import logging
import re

from fastapi import APIRouter

from history import history_manager

logger = logging.getLogger(__name__)

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

    snapshots = await asyncio.to_thread(history_manager.get_snapshot_summaries, date)
    return {"success": True, "date": date, "snapshots": snapshots, "count": len(snapshots)}


@router.get("/detail/{snapshot_id}")
async def get_snapshot_detail(snapshot_id: str):
    """获取单个快照的完整数据"""
    snapshot = await asyncio.to_thread(history_manager.get_snapshot_detail, snapshot_id)
    if not snapshot:
        return {"success": False, "message": "快照不存在"}
    return {"success": True, "snapshot": snapshot}


@router.get("/compare/{snapshot_id}")
async def compare_snapshot(snapshot_id: str):
    """快照对比：找出该快照与上一个快照之间的条目排名变化

    changes 以「平台|标题」为键，值为 {title, platform, prev_rank, rank, delta, status}
    status: up=排名上升 / down=下降 / new=新上榜
    时间线直接由文件名（日期_时间_id）推导，无需解析全部快照内容。
    """
    if not re.match(r'^[a-f0-9]{8}$', snapshot_id):
        return {"success": False, "message": "无效的快照 ID"}

    try:
        files = await asyncio.to_thread(
            sorted, history_manager.history_dir.glob("hotsearch_*.json"))
        ids = [f.stem.split("_")[-1] for f in files]
        if snapshot_id not in ids:
            return {"success": False, "message": "快照不存在"}
        idx = ids.index(snapshot_id)
        if idx == 0:
            return {"success": True, "baseline_id": snapshot_id, "previous_id": None, "changes": {}}

        current = await asyncio.to_thread(history_manager.get_snapshot_detail, snapshot_id)
        if not current:
            return {"success": False, "message": "快照不存在"}

        # 向前找一个可正常解析的上一快照（可能被并发删除或文件损坏）
        previous = None
        prev_id = None
        for j in range(idx - 1, -1, -1):
            previous = await asyncio.to_thread(history_manager.get_snapshot_detail, ids[j])
            if previous:
                prev_id = ids[j]
                break
        if not previous:
            return {"success": True, "baseline_id": snapshot_id, "previous_id": None, "changes": {}}

        def _index(snap):
            out = {}
            for platform, items in (snap.get("data") or {}).items():
                if not isinstance(items, list):
                    continue
                for item in items:
                    title = (item.get("title") or "").strip()
                    if title:
                        out[(platform, title)] = item.get("rank", 0)
            return out

        prev_index = await asyncio.to_thread(_index, previous)
        changes = {}
        for platform, items in (current.get("data") or {}).items():
            if not isinstance(items, list):
                continue
            for item in items:
                title = (item.get("title") or "").strip()
                if not title:
                    continue
                rank = item.get("rank", 0)
                prev_rank = prev_index.get((platform, title))
                if prev_rank is None:
                    status = "new"
                    delta = 0
                elif prev_rank > rank:
                    status, delta = "up", prev_rank - rank
                elif prev_rank < rank:
                    status, delta = "down", rank - prev_rank
                else:
                    continue  # 排名未变，不进入 changes
                changes[f"{platform}|{title}"] = {
                    "title": title,
                    "platform": platform,
                    "prev_rank": prev_rank or 0,
                    "rank": rank,
                    "delta": delta,
                    "status": status,
                }

        return {
            "success": True,
            "baseline_id": snapshot_id,
            "previous_id": prev_id,
            "changes": changes,
        }
    except Exception:
        logger.exception("快照对比失败")
        return {"success": False, "message": "对比失败，请稍后重试"}


@router.delete("/{snapshot_id}")
async def delete_snapshot(snapshot_id: str):
    """删除快照"""
    deleted = await asyncio.to_thread(history_manager.delete_snapshot, snapshot_id)
    if deleted:
        return {"success": True, "message": "已删除"}
    return {"success": False, "message": "快照不存在"}
