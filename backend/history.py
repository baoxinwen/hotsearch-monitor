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
        self._save_count = 0
        self._last_cleanup = time.time()

    def save_snapshot(self, data: Dict[str, List[dict]],
                      filtered_data: Dict[str, List[dict]],
                      errors: Dict[str, str],
                      keywords: List[str] = None) -> Optional[str]:
        """保存快照"""
        if not self.enabled:
            return None

        self._maybe_cleanup()
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

            # 原子写：先写临时文件再 replace，崩溃不会留下半截 JSON
            filepath = self.history_dir / filename
            tmp_path = filepath.with_suffix(".tmp")
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(snapshot, f, ensure_ascii=False)  # 不加 indent，减半磁盘体积
            os.replace(tmp_path, filepath)

            # 元数据 sidecar：摘要/对比端点秒读，无需解析全量快照
            meta = {k: snapshot[k] for k in ("id", "timestamp", "date", "time",
                                             "total_count", "filtered_count", "keywords")}
            meta_path = self.history_dir / f"meta_{date_str}_{time_str}_{snapshot_id}.json"
            tmp_meta = meta_path.with_suffix(".tmp")
            with open(tmp_meta, "w", encoding="utf-8") as f:
                json.dump(meta, f, ensure_ascii=False)
            os.replace(tmp_meta, meta_path)

            logger.info(f"已保存历史快照: {filename}")
            self._save_count += 1
            self._maybe_cleanup()
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

    def get_snapshot_summaries(self, date: str) -> List[dict]:
        """获取指定日期的快照摘要（不含完整数据，仅元信息）。
        优先读元数据 sidecar（KB 级），旧快照无 sidecar 时才回退解析全量文件。"""
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', date):
            return []

        summaries = []
        meta_files = sorted(self.history_dir.glob(f"meta_{date}_*.json"))
        sidecar_ids = set()
        for f in meta_files:
            try:
                with open(f, "r", encoding="utf-8") as fh:
                    m = json.load(fh)
                m["time"] = str(m.get("time", "")).replace("-", ":")
                summaries.append(m)
                if m.get("id"):
                    sidecar_ids.add(m["id"])
            except Exception as e:
                logger.warning(f"读取快照元数据失败 {f.name}: {e}")

        # 补齐无 sidecar 的旧快照（只解析尚未迁移的文件）
        for f in sorted(self.history_dir.glob(f"hotsearch_{date}_*.json")):
            if f.stem.split("_")[-1] in sidecar_ids:
                continue
            try:
                with open(f, "r", encoding="utf-8") as fh:
                    snap = json.load(fh)
                summaries.append({
                    "id": snap.get("id"),
                    "timestamp": snap.get("timestamp"),
                    "date": snap.get("date"),
                    "time": snap.get("time", "").replace("-", ":"),
                    "total_count": snap.get("total_count", 0),
                    "filtered_count": snap.get("filtered_count", 0),
                    "keywords": snap.get("keywords", []),
                })
            except Exception as e:
                logger.warning(f"读取快照失败 {f.name}: {e}")

        summaries.sort(key=lambda x: (x.get("timestamp") or 0, x.get("id") or ""))
        return summaries

    def get_snapshot_detail(self, snapshot_id: str) -> Optional[dict]:
        """获取单个快照的完整数据"""
        if not re.match(r'^[a-f0-9-]{1,36}$', snapshot_id):
            return None
        for f in self.history_dir.glob(f"hotsearch_*_{snapshot_id}.json"):
            try:
                with open(f, "r", encoding="utf-8") as fh:
                    snap = json.load(fh)
                    snap["time"] = snap.get("time", "").replace("-", ":")
                    return snap
            except Exception as e:
                logger.warning(f"读取快照失败 {f.name}: {e}")
        return None

    def get_snapshots(self, date: str) -> List[dict]:
        """获取指定日期的完整快照数据（含 data 字段，用于趋势分析）"""
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', date):
            return []
        snapshots = []
        for f in sorted(self.history_dir.glob(f"hotsearch_{date}_*.json")):
            try:
                with open(f, "r", encoding="utf-8") as fh:
                    snap = json.load(fh)
                    snap["time"] = snap.get("time", "").replace("-", ":")
                    snapshots.append(snap)
            except Exception as e:
                logger.warning(f"读取快照失败 {f.name}: {e}")
        return snapshots

    def delete_snapshot(self, snapshot_id: str) -> bool:
        """删除快照"""
        if not re.match(r'^[a-f0-9-]{1,36}$', snapshot_id):
            return False
        for f in self.history_dir.glob(f"hotsearch_*_{snapshot_id}.json"):
            try:
                f.unlink()
                meta = f.parent / ("meta_" + f.name[len("hotsearch_"):])
                if meta.exists():
                    meta.unlink()
                return True
            except OSError:
                pass
        return False

    def _cleanup(self):
        """清理过期和超限快照（含元数据 sidecar）"""
        try:
            cutoff = time.time() - self.retention_days * 86400
            all_files = set(self.history_dir.glob("hotsearch_*.json"))
            all_files.update(self.history_dir.glob("meta_*.json"))
            files = sorted(all_files, key=lambda f: f.stat().st_mtime)

            to_delete = {f for f in files if f.stat().st_mtime < cutoff}

            # 超过最大数量限制（按快照主文件计数；从最旧补删，set 去重）
            main_files = [f for f in files if f.name.startswith("hotsearch_")]
            excess = main_files[:max(0, len(main_files) - self.max_snapshots)]
            for f in excess:
                to_delete.add(f)
                meta = f.parent / ("meta_" + f.name[len("hotsearch_"):])
                if meta in files:
                    to_delete.add(meta)

            for f in to_delete:
                try:
                    f.unlink()
                except OSError:
                    pass

            if to_delete:
                logger.info(f"已清理 {len(to_delete)} 个过期快照文件")

        except Exception as e:
            logger.error(f"清理快照失败: {e}")

    def _maybe_cleanup(self):
        """时间驱动的清理：每小时最多跑一次（与保存成败解耦）"""
        now = time.time()
        if now - self._last_cleanup >= 3600:
            self._last_cleanup = now
            self._cleanup()


# 全局实例
history_manager = HistoryManager()
