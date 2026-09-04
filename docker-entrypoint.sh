#!/bin/sh
set -e

# 以 root 启动时：修正 bind-mount 宿主目录的属主，再降权为 appuser 运行。
# （历史镜像以 root 写入过这些目录；宿主属主不确定，跳过测试直接修正亦可）
if [ "$(id -u)" = "0" ]; then
    chown -R appuser:appuser /app/data /app/config /app/logs 2>/dev/null || true
    exec gosu appuser "$@"
fi

exec "$@"
