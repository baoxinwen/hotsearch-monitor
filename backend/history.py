"""历史快照管理 - 合并两者实现"""

import json
import logging
import os
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import uuid

from config import get_settings

logger = logging.getLogger(__name__)


class HistoryManager:
    """历史快照管理器"""

    def __init__(self, data_dir: str = None):
        settings = get_settings()
        self.enabled = settings.history_enabled
        self.retention_days = settings.history_retention_days
        self.max_snapshots = settings.max_history_snapshots
        self.history_dir = Path(data_dir) if data_dir else Path(__file__).parent.parent / "data" / "history"
        self.history_dir.mkdir(parents=True, exist_ok=True)

    def save_snapshot(self, data: Dict[str, List[dict]],
                      filtered_data: Dict[str, List[dict]],
                      errors: Dict[str, str],
                      keywords: List[str] = None) -> Optional[str]:
        """保存快照"""
        if not self.enabled:
            return None

        try:
            now = datetime.now()
            date_str = now.strftime("%Y-%m-%d")
            time_str = now.strftime("%H-%M-%S")
            snapshot_id = str(uuid.uuid4())[:8]
            filename = f"hotsearch_{date_str}_{time_str}_{snapshot_id}.json"

            total = sum(len(v) for v in data.values() if isinstance(v, list))
            filtered = sum(len(v) for v in filtered_data.values() if isinstance(v, list))

            snapshot = {
                "id": snapshot_id,
                "timestamp": int(now.timestamp() * 1000),
                "date": date_str,
                "time": time_str,
                "data": data,
                "filtered_data": filtered_data,
                "total_count": total,
                "filtered_count": filtered,
                "errors": errors,
                "keywords": keywords or [],
            }

            filepath = self.history_dir / filename
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(snapshot, f, ensure_ascii=False, indent=2)

            logger.info(f"已保存历史快照: {filename}")
            self._cleanup()
            return snapshot_id

        except Exception as e:
            logger.error(f"保存快照失败: {e}")
            return None

    def get_dates(self) -> List[str]:
        """获取有快照的日期列表"""
        dates = set()
        for f in self.history_dir.glob("hotsearch_*.json"):
            parts = f.stem.split("_")
            if len(parts) >= 3:
                dates.add(parts[1])
        return sorted(dates, reverse=True)

    def get_snapshots(self, date: str) -> List[dict]:
        """获取指定日期的快照列表"""
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', date):
            return []

        snapshots = []
        for f in sorted(self.history_dir.glob(f"hotsearch_{date}_*.json")):
            try:
                with open(f, "r", encoding="utf-8") as fh:
                    snapshots.append(json.load(fh))
            except Exception as e:
                logger.warning(f"读取快照失败 {f.name}: {e}")
        return snapshots

    def delete_snapshot(self, snapshot_id: str) -> bool:
        """删除快照"""
        if not re.match(r'^[a-f0-9-]{1,36}$', snapshot_id):
            return False
        for f in self.history_dir.glob(f"*_{snapshot_id}_*.json"):
            try:
                f.unlink()
                return True
            except OSError:
                pass
        return False

    def _cleanup(self):
        """清理过期和超限快照"""
        try:
            cutoff = time.time() - self.retention_days * 86400
            files = sorted(self.history_dir.glob("hotsearch_*.json"), key=lambda f: f.stat().st_mtime)

            to_delete = []
            for f in files:
                if f.stat().st_mtime < cutoff:
                    to_delete.append(f)

            # 超过最大数量限制
            keep_count = len(files) - len(to_delete)
            if keep_count > self.max_snapshots:
                excess = files[:keep_count - self.max_snapshots]
                to_delete.extend(excess)

            for f in to_delete:
                try:
                    f.unlink()
                except OSError:
                    pass

            if to_delete:
                logger.info(f"已清理 {len(to_delete)} 个过期快照")

        except Exception as e:
            logger.error(f"清理快照失败: {e}")


# 全局实例
history_manager = HistoryManager()
