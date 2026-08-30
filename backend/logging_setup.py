"""统一日志配置：标准库 logging + RotatingFileHandler 按大小轮转与保留。

用法（main.py）：
    setup_logging(settings.debug)   # 导入时调用一次

所有模块继续使用 logging.getLogger(__name__)。

说明：曾评估迁移 loguru，但实测 0.7.3 在 Python 3.13 + Windows 下
轮转触发时静默停止写入（enqueue/参数变体均复现，详见审查记录）；
标准库 RotatingFileHandler 同环境验证正常，故采用标准库方案。
"""

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

LOG_DIR = Path(__file__).parent.parent / "logs"
_FORMAT = "%(asctime)s %(levelname)s [%(module)s:%(funcName)s:%(lineno)d] %(message)s"


def setup_logging(debug: bool = False, max_bytes: int = 5 * 1024 * 1024, backup_count: int = 3) -> None:
    """配置三路 sink：控制台 + 全量轮转文件 + 错误轮转文件。

    max_bytes/backup_count 参数主要供轮转行为测试使用。
    """
    level = logging.DEBUG if debug else logging.INFO
    LOG_DIR.mkdir(exist_ok=True)

    root = logging.getLogger()
    root.setLevel(level)
    # 清掉旧 handler（模块重载/重复调用时避免重复输出）
    for h in root.handlers[:]:
        root.removeHandler(h)
        h.close()

    console = logging.StreamHandler()
    console.setLevel(level)
    console.setFormatter(logging.Formatter(_FORMAT))
    root.addHandler(console)

    hot_file = RotatingFileHandler(
        LOG_DIR / "hotsearch.log", maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8",
    )
    hot_file.setLevel(max(level, logging.INFO))
    hot_file.setFormatter(logging.Formatter(_FORMAT))
    root.addHandler(hot_file)

    err_file = RotatingFileHandler(
        LOG_DIR / "error.log", maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8",
    )
    err_file.setLevel(logging.ERROR)
    err_file.setFormatter(logging.Formatter(_FORMAT))
    root.addHandler(err_file)
