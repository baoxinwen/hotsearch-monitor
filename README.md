# 热搜监控工具 v1.0

多平台热搜聚合监控工具，支持 48+ 中文平台热搜抓取、关键词过滤、趋势分析、邮件/Webhook 推送。

## 功能特性

- **48+ 平台支持** — 哔哩哔哩、微博、知乎、抖音、百度、GitHub 等
- **实时搜索过滤** — 多关键词搜索（逗号/空格分隔），任一匹配即显示
- **趋势分析** — 中文分词（jieba）关键词频率统计 + 交互式图表（点击/悬停/缩放）
- **邮件推送** — SMTP 邮件，支持小时/天/周频率，Jinja2 HTML 模板
- **Webhook 推送** — 企业微信、钉钉、飞书、通用 JSON
- **历史快照** — 自动保存热搜快照，支持浏览和 CSV 导出
- **安全防护** — CSRF（HMAC-SHA256）、限流、CSP 安全头、Fernet 密码加密
- **自动降级** — 连续失败 5 次自动禁用平台，指数退避重试
- **暗色/亮色主题** — 支持跟随系统自动切换
- **PostHog 风格 UI** — 暖色调设计，IBM Plex Sans 字体，自定义 SVG 饼图

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
| `SMTP_HOST` | `smtp.163.com` | SMTP 服务器 |
| `SMTP_PORT` | `465` | SMTP 端口（465=SSL，587=STARTTLS） |
| `SMTP_USER` | 空 | SMTP 用户名 |
| `SMTP_PASSWORD` | 空 | SMTP 密码/授权码 |
| `HISTORY_ENABLED` | `true` | 启用历史快照 |
| `HISTORY_RETENTION_DAYS` | `7` | 快照保留天数 |
| `BACKEND_PORT` | `8000` | 后端端口映射 |
| `FRONTEND_PORT` | `80` | 前端端口映射 |

### 运行时配置

通过 Web 界面的「设置」页面配置：

- 监控关键词（每行一个）
- 监控平台选择（48+ 平台）
- 更新间隔
- 邮件推送（收件人、频率、SMTP 配置）
- Webhook 推送（URL、类型：企业微信/钉钉/飞书）

配置保存在 `config/user_config.json`。

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/hotsearch` | 获取热搜数据 |
| POST | `/api/hotsearch/refresh/{platform}` | 刷新单个平台 |
| GET | `/api/hotsearch/platforms` | 获取平台列表 |
| GET | `/api/config` | 获取配置 |
| POST | `/api/config` | 更新配置 |
| POST | `/api/config/test-email` | 测试邮件 |
| POST | `/api/config/test-webhook` | 测试 Webhook |
| GET | `/api/analysis/keywords` | 关键词分析 |
| GET | `/api/analysis/overview` | 分析概览（支持 `?platforms=` 筛选） |
| POST | `/api/email/send` | 手动发送邮件报告 |
| POST | `/api/email/test` | 测试邮件发送（支持传入 SMTP 配置） |
| GET | `/api/history/dates` | 历史日期列表 |
| GET | `/api/history/{date}` | 指定日期快照 |
| GET | `/health` | 健康检查 |

## 技术栈

**后端**: Python 3.12 · FastAPI · httpx · jieba · Jinja2 · cryptography · pydantic-settings

**前端**: React 19 · TypeScript · Vite · Tailwind CSS · Recharts · Lucide Icons · IBM Plex Sans

**部署**: Docker · nginx · GitHub Actions CI/CD（推送即构建）· GHCR

## License

MIT
