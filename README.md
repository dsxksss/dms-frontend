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
| `npm run e2e` | 端到端烟测（Playwright） |
| `npm run lint` / `npm run format` | 代码检查 / 格式化 |

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
