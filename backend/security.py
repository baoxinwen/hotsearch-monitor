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
        """初始化或加载加密密钥"""
        if key_env:
            try:
                self._cipher = Fernet(key_env.encode())
                return
            except Exception:
                pass

        if os.path.exists(key_file):
            with open(key_file, "rb") as f:
                self._cipher = Fernet(f.read())
            return

        os.makedirs(os.path.dirname(key_file), exist_ok=True)
        key = Fernet.generate_key()
        with open(key_file, "wb") as f:
            f.write(key)
        self._cipher = Fernet(key)
        logger.info(f"Generated new encryption key: {key_file}")

    def encrypt(self, text: str) -> str:
        if not text or not self._cipher:
            return text
        try:
            return self._cipher.encrypt(text.encode()).decode()
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            return text

    def decrypt(self, token: str) -> str:
        if not token or not self._cipher:
            return token
        try:
            return self._cipher.decrypt(token.encode()).decode()
        except Exception:
            return token


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

    def validate_token(self, token: str, max_age: int = 86400) -> bool:
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

    def __init__(self, max_requests: int = 60, window: int = 60):
        self.max_requests = max_requests
        self.window = window
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
