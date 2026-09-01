# 热搜监控工具 v1.0

多平台热搜聚合监控工具，支持 47 中文平台热搜抓取、关键词过滤、趋势分析、排名追踪、邮件/Webhook 推送。

## 功能特性

- **47 平台支持** — 哔哩哔哩、微博、知乎、抖音、百度等，平台自动禁用/恢复一目了然
- **聚合热榜流** — 全部平台条目按热度合并排序，虚拟滚动渲染 1400+ 条不卡顿；与上一快照对比显示 ↑↓/新 标记
- **分平台瀑布流** — 按分类分组浏览，卡片高度自适应，每卡默认 10 条可展开
- **实时搜索过滤** — 多关键词搜索（逗号/空格分隔），300ms 防抖，命中高亮，URL 可分享（`/?q=关键词`）
- **趋势分析** — jieba 分词 + 可配置停用词/最小词长降噪，单色柱状图/环图/热度分布/跨平台重合
- **排名追踪** — 快照对比接口（`GET /api/history/compare/{id}`）计算条目升降
- **邮件推送** — SMTP 邮件，支持小时/天/周频率，Jinja2 HTML 模板
- **Webhook 推送** — 企业微信、钉钉、飞书、通用 JSON
- **历史快照** — 时间线浏览（保留 7 天）、快照内搜索、CSV 导出、手动删除
- **安全防护** — CSRF（HMAC-SHA256）、限流、CSP 安全头、Fernet 密码加密
- **自动降级** — 连续失败 5 次自动禁用平台，UI 横幅提示并支持一键重新启用
- **深色/亮色主题** — 深色控制台为默认，暖纸亮色可选，支持跟随系统
- **键盘操作** — `1-4` 切页、`/` 搜索、`R` 刷新、`T` 切主题、`D` 切密度、`Ctrl+K` 命令面板
- **技术栈 UI** — React 19 + TanStack Query + React Router + Radix UI + Recharts，设计令牌单源（AA 对比度）

## 快速开始

### Docker 部署（推荐）

```bash
# 复制配置文件
cp .env.example .env
# 编辑 .env 填写 SMTP 等配置

# 拉取镜像并启动
docker-compose pull && docker-compose up -d
```

访问 http://localhost（前端）和 http://localhost:8000（API）

### 本地开发

```bash
# 后端
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 前端
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

> 本机 8000 端口被系统保留（Hyper-V/WSL）时，可换端口启动后端并让前端代理跟随：
> `BACKEND_PORT=9000 uvicorn main:app --port 9000` + `BACKEND_PORT=9000 npm run dev`

### 运行测试

```bash
cd frontend
npm test        # vitest 单元测试（格式化/合并过滤/CSRF/组件）
npm run build   # 类型检查 + 生产构建
```


## Docker 镜像

镜像托管在 GitHub Container Registry (GHCR)：

- **后端**: `ghcr.io/baoxinwen/hotsearch-monitor-backend`
- **前端**: `ghcr.io/baoxinwen/hotsearch-monitor-frontend`

推送到 `main` 分支或创建 `v*` 标签时自动构建并发布。

### 镜像标签规则

| 触发条件 | 标签 |
|---------|------|
| 推送到 `main` | `main` |
| 推送 `v1.0.0` 标签 | `v1.0.0`, `1.0`, `1.0.0` |
| Pull Request | 仅构建，不推送 |

## 配置说明

### 环境变量（`.env`）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DEBUG` | `false` | 开发模式 |
| `API_KEY` | 空 | API Key 认证（可选） |
| `CORS_ORIGINS` | 空 | CORS 来源（逗号分隔） |
| `HISTORY_ENABLED` | `true` | 启用历史快照 |
| `HISTORY_RETENTION_DAYS` | `7` | 快照保留天数 |
| `BACKEND_PORT` | `8000` | 后端端口映射 |
| `FRONTEND_PORT` | `80` | 前端端口映射 |

> SMTP 和 Webhook 配置通过 Web 界面的「设置 → 推送设置」页面配置，不通过环境变量。

### 运行时配置

通过 Web 界面的「设置」页面配置，保存在 `config/user_config.json`：

- **监控设置**：关键词、平台选择、更新间隔
- **推送设置**：SMTP 邮件（服务器/用户名/密码/收件人/频率）、Webhook（企微/钉钉/飞书）

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/hotsearch` | 获取热搜数据 |
| GET | `/api/hotsearch/platforms` | 获取平台列表 |
| GET | `/api/hotsearch/cache/stats` | 缓存统计 |
| POST | `/api/hotsearch/cache/clear` | 清除缓存 |
| POST | `/api/hotsearch/refresh/{platform}` | 刷新单个平台 |
| POST | `/api/hotsearch/enable/{platform}` | 重新启用被禁用的平台 |
| GET | `/api/config` | 获取配置 |
| POST | `/api/config` | 更新配置 |
| POST | `/api/config/test-email` | 测试邮件 |
| POST | `/api/config/test-webhook` | 测试 Webhook |
| GET | `/api/analysis/keywords` | 关键词分析 |
| GET | `/api/analysis/overview` | 分析概览（支持 `?platforms=` 筛选） |
| POST | `/api/email/send` | 手动发送邮件报告 |
| POST | `/api/email/test` | 测试邮件发送（支持传入 SMTP 配置） |
| GET | `/api/email/verify` | 验证 SMTP 连接 |
| GET | `/api/history/dates` | 历史日期列表 |
| GET | `/api/history/{date}` | 指定日期快照摘要 |
| GET | `/api/history/detail/{snapshot_id}` | 快照完整数据 |
| DELETE | `/api/history/{snapshot_id}` | 删除快照 |
| GET | `/api/csrf-token` | 获取 CSRF 令牌 |
| GET | `/health` | 健康检查 |

## 技术栈

**后端**: Python 3.12 · FastAPI · httpx · jieba · Jinja2 · cryptography · pydantic-settings

**前端**: React 19 · TypeScript · Vite · Tailwind CSS · Recharts · Lucide Icons · IBM Plex Sans

**部署**: Docker · nginx · GitHub Actions CI/CD（推送即构建）· GHCR

## License

MIT
