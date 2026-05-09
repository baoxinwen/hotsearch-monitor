"""JSON文件锁存储 - 来自 trendsentinel 的实现，改为 Python 版本"""

import json
import os
import time
import shutil
import logging
from pathlib import Path
from typing import Any, Callable, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class JsonStorage:
    """JSON文件存储，支持文件锁和备份轮转"""

    def __init__(self, data_dir: str = "./data", max_backups: int = 5):
        self.data_dir = Path(data_dir)
        self.max_backups = max_backups
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _filepath(self, filename: str) -> Path:
        if not filename.endswith(".json"):
            filename += ".json"
        return self.data_dir / filename

    def _lockpath(self, filename: str) -> Path:
        return self._filepath(filename).with_suffix(".json.lock")

    def _acquire_lock(self, filename: str, timeout: float = 5.0) -> bool:
        lock_path = self._lockpath(filename)
        start = time.time()
        while True:
            try:
                # 独占创建锁文件
                fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                os.write(fd, f'{os.getpid()}:{time.time()}'.encode())
                os.close(fd)
                return True
            except FileExistsError:
                # 检查是否是过期锁 (>30秒)
                try:
                    mtime = os.path.getmtime(str(lock_path))
                    if time.time() - mtime > 30:
                        logger.warning(f"Removing stale lock: {lock_path}")
                        os.remove(str(lock_path))
                        continue
                except OSError:
                    pass
                if time.time() - start > timeout:
                    logger.error(f"Lock timeout for {filename}")
                    return False
                time.sleep(0.1)

    def _release_lock(self, filename: str):
        lock_path = self._lockpath(filename)
        try:
            os.remove(str(lock_path))
        except OSError:
            pass

    def _create_backup(self, filename: str):
        filepath = self._filepath(filename)
        if not filepath.exists():
            return
        ts = datetime.now().strftime("%Y%m%d%H%M%S")
        backup_path = filepath.with_suffix(f".{ts}.bak")
        try:
            shutil.copy2(str(filepath), str(backup_path))
            self._clean_old_backups(filename)
        except Exception as e:
            logger.warning(f"Backup failed for {filename}: {e}")

    def _clean_old_backups(self, filename: str):
        filepath = self._filepath(filename)
        pattern = filepath.stem
        parent = filepath.parent
        backups = sorted(
            [f for f in parent.glob(f"{pattern}.*.bak")],
            key=lambda f: f.stat().st_mtime,
            reverse=True,
        )
        for old in backups[self.max_backups:]:
            try:
                old.unlink()
            except OSError:
                pass

    def read(self, filename: str, default: Any = None) -> Any:
        filepath = self._filepath(filename)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            if default is not None:
                self.write(filename, default)
            return default
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error in {filename}: {e}")
            return default

    def write(self, filename: str, data: Any) -> bool:
        if not self._acquire_lock(filename):
            return False
        try:
            self._create_backup(filename)
            filepath = self._filepath(filename)
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            logger.error(f"Write error for {filename}: {e}")
            return False
        finally:
            self._release_lock(filename)

    def update(self, filename: str, update_fn: Callable, default: Any = None) -> Any:
        current = self.read(filename, default)
        updated = update_fn(current)
        self.write(filename, updated)
        return updated

    def delete(self, filename: str) -> bool:
        filepath = self._filepath(filename)
        try:
            self._create_backup(filename)
            filepath.unlink()
            return True
        except OSError as e:
            logger.error(f"Delete error for {filename}: {e}")
            return False

    def exists(self, filename: str) -> bool:
        return self._filepath(filename).exists()

    def list_backups(self, filename: str) -> list:
        filepath = self._filepath(filename)
        pattern = filepath.stem
        parent = filepath.parent
        return sorted(
            [f.name for f in parent.glob(f"{pattern}.*.bak")],
            reverse=True,
        )
