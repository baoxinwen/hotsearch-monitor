"""安全中间件 - CSRF保护、限流、加密 (来自 hotsearch-monitor)"""

import hashlib
import hmac
import html
import logging
import os
import re
import secrets
import time
from collections import defaultdict
from functools import wraps
from typing import Optional, Tuple

from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)


# ==================== 加密 ====================

class Encryption:
    """Fernet对称加密，用于密码存储"""

    def __init__(self, key: str = ""):
        self._cipher = None
        if key:
            try:
                self._cipher = Fernet(key.encode() if isinstance(key, str) else key)
            except Exception:
                pass

    def init_key(self, key_file: str, key_env: str = ""):
        """初始化或加载加密密钥。配置错误时直接抛错（快速失败），不做静默降级。"""
        if key_env:
            self._cipher = Fernet(key_env.encode())
            return

        if os.path.exists(key_file):
            with open(key_file, "rb") as f:
                self._cipher = Fernet(f.read())
            return

        os.makedirs(os.path.dirname(key_file), exist_ok=True)
        key = Fernet.generate_key()
        with open(key_file, "wb") as f:
            f.write(key)
        if os.name == "posix":
            os.chmod(key_file, 0o600)
        self._cipher = Fernet(key)
        logger.info(f"Generated new encryption key: {key_file}")

    def encrypt(self, text: str) -> str:
        if not text:
            return text
        if not self._cipher:
            # 安全策略：加密不可用时拒绝保存，绝不明文落盘
            raise RuntimeError("加密未初始化，拒绝明文存储敏感数据")
        try:
            return self._cipher.encrypt(text.encode()).decode()
        except Exception as e:
            raise RuntimeError(f"加密失败: {e}") from e

    def decrypt(self, token: str) -> str:
        if not token:
            return token
        if not self._cipher:
            logger.warning("加密未初始化，无法解密已存储的敏感数据")
            return ""
        try:
            return self._cipher.decrypt(token.encode()).decode()
        except Exception:
            # 解密失败说明密文损坏或密钥不匹配——绝不能把密文当密码发出去
            logger.error("解密失败：密文无效或密钥不匹配，已丢弃该值")
            return ""


# ==================== CSRF ====================

class CSRFProtection:
    """CSRF令牌管理"""

    def __init__(self, secret_key: str):
        self.secret_key = secret_key

    def generate_token(self) -> str:
        timestamp = str(int(time.time()))
        random_str = secrets.token_hex(16)
        data = f"{timestamp}:{random_str}"
        signature = hmac.new(self.secret_key.encode(), data.encode(), hashlib.sha256).hexdigest()
        return f"{data}:{signature}"

    def validate_token(self, token: str, max_age: int = 7200) -> bool:
        if not token:
            return False
        try:
            parts = token.split(":")
            if len(parts) != 3:
                return False
            timestamp, random_str, signature = parts
            if int(time.time()) - int(timestamp) > max_age:
                return False
            data = f"{timestamp}:{random_str}"
            expected = hmac.new(self.secret_key.encode(), data.encode(), hashlib.sha256).hexdigest()
            return hmac.compare_digest(signature, expected)
        except Exception:
            return False


# ==================== 限流 ====================

class RateLimiter:
    """内存限流器"""

    def __init__(self, max_requests: int = 60, window: int = 60, max_ips: int = 10000):
        self.max_requests = max_requests
        self.window = window
        self.max_ips = max_ips
        self.requests: dict = defaultdict(list)
        self.blocked: dict = {}
        self._last_cleanup = time.time()

    def _cleanup(self, now: float):
        """定期清理过期条目，防止内存泄漏"""
        if now - self._last_cleanup < self.window:
            return
        self._last_cleanup = now
        expired_ips = [ip for ip, ts in self.requests.items()
                       if not ts or now - ts[-1] > self.window * 2]
        for ip in expired_ips:
            del self.requests[ip]
        expired_blocks = [ip for ip, t in self.blocked.items() if now >= t]
        for ip in expired_blocks:
            del self.blocked[ip]

    def is_allowed(self, ip: str) -> Tuple[bool, int]:
        now = time.time()
        self._cleanup(now)

        # 防伪造 IP 撑爆内存：超过容量上限时丢弃最久未活跃的条目
        if ip not in self.requests and len(self.requests) >= self.max_ips:
            oldest = min(self.requests.items(), key=lambda kv: kv[1][-1] if kv[1] else 0)[0]
            self.requests.pop(oldest, None)

        if ip in self.blocked:
            if now < self.blocked[ip]:
                return False, 0
            del self.blocked[ip]

        timestamps = self.requests[ip]
        timestamps[:] = [t for t in timestamps if now - t < self.window]

        if len(timestamps) >= self.max_requests:
            self.blocked[ip] = now + 30
            return False, 0

        timestamps.append(now)
        return True, self.max_requests - len(timestamps)

    def get_remaining(self, ip: str) -> int:
        now = time.time()
        timestamps = self.requests[ip]
        timestamps[:] = [t for t in timestamps if now - t < self.window]
        return max(0, self.max_requests - len(timestamps))


# ==================== 工具函数 ====================

def escape_html(text: str) -> str:
    if not text or not isinstance(text, str):
        return ""
    return html.escape(text, quote=True)


def validate_email(email: str) -> bool:
    if not email or not isinstance(email, str):
        return False
    return bool(re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email.strip()))


def validate_time_format(time_str: str) -> bool:
    if not time_str or not isinstance(time_str, str):
        return False
    return bool(re.match(r'^([01]\d|2[0-3]):([0-5]\d)$', time_str))


def sanitize_for_log(text) -> str:
    """日志净化：替换控制字符防止伪造日志行，并截断超长内容"""
    if not isinstance(text, str):
        text = str(text)
    return re.sub(r"[\r\n\t]+", " ", text)[:200]


def sanitize_keywords(keywords: list) -> list:
    if not isinstance(keywords, list):
        return []
    return [k.strip()[:100] for k in keywords[:50] if k and isinstance(k, str) and k.strip()]


def parse_score(val) -> int:
    """解析中文热度数值 (来自 trendsentinel)"""
    if val is None:
        return 0
    if isinstance(val, (int, float)):
        return int(val)
    if not isinstance(val, str):
        return 0
    val = val.strip()
    if not val:
        return 0
    multiplier = 1
    if "亿" in val:
        multiplier = 100_000_000
    elif "千万" in val or "kw" in val.lower():
        multiplier = 10_000_000
    elif "万" in val or val.lower().endswith("w"):
        multiplier = 10_000
    num_str = re.sub(r'[^\d.]', '', val)
    if not num_str:
        return 0
    try:
        return int(float(num_str) * multiplier)
    except (ValueError, TypeError):
        return 0


# 全局实例
encryption = Encryption()
