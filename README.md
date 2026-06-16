# DMS 前端

[DMS V1.0](../dms-backend)（药研数据资产平台）的 Web 前端：登录后管理 Project / Registry /
Dataset / Files / 审计 / 组织的数据驾驶舱式界面。

## 技术栈

- **React 19 + Vite + TypeScript**
- **shadcn/ui + Tailwind v4**（Linear-clean 数据驾驶舱：中性灰 + 单一强调色，深/浅双主题）
- **TanStack Query / Table**（服务端状态 + 表格）
- **React Router v7**、**Zustand**（会话/UI 偏好）
- **React Hook Form + Zod**（含按 Registry Schema 动态生成表单）
- **react-i18next**（中英双语，zh-CN 默认）
- 测试：**Vitest + Testing Library + MSW**；E2E：**Playwright**

## 开发

```bash
npm install
npm run dev        # http://localhost:5173 （/v1 经 proxy 转发到后端 8080，免 CORS）
```

需要本地后端在 `http://127.0.0.1:8080` 运行（见 ../dms-backend）。可用 `VITE_API_PROXY` 改目标。

## 常用脚本

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器（含 API proxy） |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run typecheck` | 仅类型检查 |
| `npm test` | 单元/组件测试（Vitest） |
| `npm run e2e` | 端到端烟测（Playwright，需后端 :8080 + dev :5173 在跑；首次 `npx playwright install chromium`） |
| `npm run lint` / `npm run format` | 代码检查 / 格式化 |

## 部署

```bash
docker build -t dms-frontend .
# 前端经 nginx 反代 /v1 到同网络的 backend:8080（同源、无 CORS、透传 X-Forwarded-For）
docker compose up -d        # web → :8088（后端见 docker-compose.yml 注释）
```

- 多阶段 `Dockerfile`（node 构建 → nginx 托管），`nginx.conf` 含 SPA 回退 + API 反代。
- 后端在另一仓库（dms-backend）；compose 里以服务名 `backend` 反代，或解开注释一键起后端+DB。
- CI：`.github/workflows/ci.yml`（lint / typecheck / test / build）。

## 目录

```
src/
  api/          # 类型化 API 客户端（client/types + 各资源）
  hooks/        # TanStack Query hooks
  auth/         # 会话、ProtectedRoute、权限门
  components/   # 共享 UI（含 shadcn ui/）
  features/     # 各业务模块页面
  lib/          # 工具（cn、主题、错误映射、角色、字段类型映射）
  i18n/         # i18n 与中英文案
```

API 契约见后端 [docs/api.md](../dms-backend/docs/api.md)。
