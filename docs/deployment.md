# 部署指南（前端 + 后端）

> 本文讲清楚 **dms-frontend（Web 前端）** 与 **dms-backend（Rust API + Postgres）**
> 如何一起部署：架构、配置、初始化、WeMol SSO、本地联调与生产上线全流程。

---

## 1. 架构：前后端分离（默认，推荐）

```
            ┌─────────────────────────── web 容器 (nginx) ───────────────────────────┐
浏览器 ──▶  │  托管 dist 静态文件 + SPA 回退(/ → index.html)                          │
            │  /v1/*、/healthz、/readyz、/metrics ──反代──▶ backend:8080              │
            └───────────────────────────────────────────────────────────────────────┘
                                                   │
                                          ┌────────▼────────┐      ┌──────────────┐
                                          │ backend (:8080) │ ──▶  │ Postgres 16  │
                                          │  纯 API + /docs │      │  多租户 RLS  │
                                          └─────────────────┘      └──────────────┘
```

- **前端 dist 由 nginx 容器托管**（不是后端）。见 [`Dockerfile`](../Dockerfile) + [`nginx.conf`](../nginx.conf)。
- nginx 反代 `/v1` 到后端 → **同源、无 CORS**，并透传 `X-Forwarded-For`（后端审计记录真实 IP）。
- **后端是纯 API 服务**（额外提供 `/docs` Swagger UI），**不需要也不托管前端静态文件**。

> ❓ **后端要不要做一个"托管 dist 的页面 API"？** —— 不需要。dist 由 nginx 托管、`/v1` 反代即可。
> 见下方 §6「可选：后端单体托管 dist」——仅离线/单容器场景才考虑，且需后端改造，**默认不用**。

---

## 2. 配置一览

### 后端（环境变量；`DMS__<段>__<键>` 双下划线映射到 config）

| 变量 | 说明 | 示例 |
|---|---|---|
| `APP_ENV` | 选配置档：`local` / `cloud` / `onprem` | `onprem` |
| `DMS__DATABASE__URL` | 运行时连接串（**受 RLS 的应用角色 `dms_app`**） | `postgres://dms_app:***@postgres:5432/dms` |
| `DMS__DATABASE__MIGRATION_URL` | 迁移连接串（**拥有者角色 `dms`**，DDL 权限） | `postgres://dms:***@postgres:5432/dms` |
| `DMS__DATABASE__RUN_MIGRATIONS_ON_START` | 启动时自动迁移 | `true` |
| `DMS__AUTH__JWT_SECRET` | 会话签名密钥（**生产必改**，`openssl rand -hex 32`） | `…` |
| `DMS__AUTH__DEFAULT_TENANT` | 缺省租户 slug（私有化/单企业、及 **WeMol SSO** 需要） | `acme` |
| `BOOTSTRAP_EMAIL` / `BOOTSTRAP_PASSWORD` | `bootstrap` 子命令建首个企业+管理员用 | — |
| `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` | `platform-admin` 子命令建平台超管用 | — |

复杂度档由**编译期 feature** 决定（镜像 `--build-arg DMS_FEATURES=full`）。`full` 含多租户认证、
registry、orgs、dataset、esign、audit、platform、**sso-wemol** 等。

### 前端（**构建期** `VITE_*`，写进 dist；改了要重新 `npm run build` / 重建镜像）

| 变量 | 说明 | 默认 |
|---|---|---|
| `VITE_API_BASE_URL` | API 基址。**留空=同源**（经 nginx 反代，推荐） | 空 |
| `VITE_API_PROXY` | 仅开发期 vite proxy 目标 | `http://127.0.0.1:8080` |
| `VITE_DEFAULT_TENANT` | 单租户部署设它后登录页隐藏租户输入 | 空 |
| `VITE_TENANT_HOST_SUFFIX` | SaaS 子域名取租户后缀（须与后端 `tenant_host_suffix` 一致） | 空 |
| `VITE_WEMOL_SSO` | `off` 时登录页默认邮箱+密码、WeMol 作次选；默认 WeMol 优先 | 空(=on) |

完整说明见 [`.env.example`](../.env.example)。

---

## 3. 本地开发联调

> 前置：Docker、Rust 1.94、Node 22。后端在 `../dms-backend`。

```bash
# ── 后端（在 dms-backend 目录）──
# 1. 起 Postgres（端口被占用可 DMS_DB_PORT=5433）
docker compose -f deploy/docker/docker-compose.yml up -d postgres

# 2. 本地配置：cp config/local.toml.example config/local.toml；export APP_ENV=local
#    （local.toml 里 database.url 指向 5433，run_migrations_on_start=true）

# 3. 初始化首个企业 + 管理员（顺带迁移）
APP_ENV=local BOOTSTRAP_EMAIL=admin@acme.com BOOTSTRAP_PASSWORD=change-me \
  cargo run -p dms-server --features full -- bootstrap

# 4.（可选）平台超管，供 seed-demo / 平台后台
APP_ENV=local PLATFORM_ADMIN_EMAIL=root@platform.test PLATFORM_ADMIN_PASSWORD='Platform0rd!' \
  cargo run -p dms-server --features full -- platform-admin

# 5. 起服务（:8080）
APP_ENV=local cargo run -p dms-server --features full

# 6.（可选）灌演示数据（demo/恒瑞/礼来），统一密码 Passw0rd1!
BASE=http://127.0.0.1:8080 bash scripts/seed-demo.sh

# ── 前端（在 dms-frontend 目录）──
npm install
npm run dev          # http://localhost:5173 ，/v1 经 vite proxy 转发到 :8080
```

登录：邮箱 `admin@acme.com` / 密码 `change-me`（或 seed 的 `admin@hengrui.com` / `Passw0rd1!`）。

---

## 4. 生产部署（Model A：docker-compose 组合）

后端、前端各有镜像；用一份 compose 把 `postgres + backend + web(nginx)` 拉到同一网络，
nginx 以服务名 `backend` 反代。示例（自包含栈）：

```yaml
# docker-compose.prod.yml
name: dms
services:
  postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_USER: dms, POSTGRES_PASSWORD: ${PG_PASS}, POSTGRES_DB: dms }
    volumes:
      - dms_pg:/var/lib/postgresql/data
      - ./dms-backend/deploy/docker/initdb:/docker-entrypoint-initdb.d:ro  # 建 dms_app 角色
    healthcheck: { test: ["CMD-SHELL","pg_isready -U dms -d dms"], interval: 5s, retries: 10 }

  backend:                                   # 镜像名须为 `backend`（nginx 反代用此名）
    build: { context: ./dms-backend, dockerfile: deploy/docker/Dockerfile, args: { DMS_FEATURES: full } }
    environment:
      APP_ENV: onprem
      DMS__DATABASE__URL: postgres://dms_app:${APP_PASS}@postgres:5432/dms
      DMS__DATABASE__MIGRATION_URL: postgres://dms:${PG_PASS}@postgres:5432/dms
      DMS__DATABASE__RUN_MIGRATIONS_ON_START: "true"
      DMS__AUTH__JWT_SECRET: ${JWT_SECRET}          # openssl rand -hex 32
      DMS__AUTH__DEFAULT_TENANT: acme               # 私有化单企业；WeMol SSO 也需要
    depends_on: { postgres: { condition: service_healthy } }

  web:
    build: ./dms-frontend                    # nginx 托管 dist + 反代 /v1 → backend:8080
    ports: ["80:80"]
    depends_on: [backend]

volumes: { dms_pg: {} }
```

```bash
PG_PASS=… APP_PASS=… JWT_SECRET=$(openssl rand -hex 32) \
  docker compose -f docker-compose.prod.yml up -d --build

# 首次：建初始管理员（迁移已在 backend 启动时自动跑）
docker compose -f docker-compose.prod.yml run --rm \
  -e BOOTSTRAP_EMAIL=admin@acme.com -e BOOTSTRAP_PASSWORD=… backend bootstrap
```

> 前端仓库自带的 [`docker-compose.yml`](../docker-compose.yml) 是"只起 web"的最小版（含注释掉的
> backend/db 一键起）；后端仓库另有 [`deploy/compose/onprem.yml`](../../dms-backend/deploy/compose/onprem.yml)
> （app+db 自包含）与 `cloud.yml`。上面的组合版把两者拼全，可直接用。

### 镜像单独构建

```bash
# 后端（在 dms-backend）
docker build -f deploy/docker/Dockerfile --build-arg DMS_FEATURES=full -t dms-server:full .
# 前端（在 dms-frontend）—— 改任何 VITE_* 都要重建
docker build -t dms-web .
```

---

## 5. WeMol 账号 SSO（可选）

后端配好即可，前端只发账号密码（无前端改动）：

```toml
# 后端 config/<env>.toml （或等价 DMS__AUTH__* 环境变量）
[auth]
default_tenant = "acme"           # WeMol 用户非邮箱定位，JIT 映射进此企业（必填）

[auth.wemol]
base_url = "https://wemol.example.com"   # 你的 WeMol 平台
# login_path = "/api/sys/login"          # 系统用户改这个；普通用户默认 /api/user/login
```

前端：默认 WeMol 为首选登录入口；未配 WeMol 的部署设 `VITE_WEMOL_SSO=off` 默认走邮箱+密码。

> ⚠️ **WeMol/SSO 用户落地是"零权限"的**：JIT 映射进企业后没有任何基础角色，登录后看不到组织/项目。
> 需由企业管理员授予基础租户角色（owner/admin/member）。这是当前后端的 onboarding 行为，
> 部署时请知悉（可在 [frontend-sync](../../dms-backend/docs/frontend-sync.md) 反馈给后端补默认角色）。

---

## 6. 可选：后端单体托管 dist（离线/单容器）

私有化离线、希望"一个容器搞定"时，可让后端直接托管前端 dist（去掉 nginx）。
**当前后端未实现**，需在后端加：

1. `tower_http::services::ServeDir` 指向打包进镜像的 `dist/`，加 SPA 回退到 `index.html`；
2. 把前端 `npm run build` 的 `dist/` 在后端镜像里 `COPY` 进去（或多阶段构建）；
3. 前端构建时 `VITE_API_BASE_URL` 留空（同源）。

权衡：单体部署简单、无 nginx；但前后端发版耦合、静态缓存/压缩需自己处理。
**默认仍推荐 §1 的分离模式**（nginx 托管静态更专业，前后端可独立发版）。

---

## 7. Kubernetes / Helm

后端提供 Helm chart：[`dms-backend/deploy/helm/dms-backend`](../../dms-backend/deploy/helm/dms-backend)
（`values-cloud.yaml` / `values-onprem.yaml`、Deployment/Service/Ingress/HPA/Secret）。
前端可另起一个 nginx Deployment 托管 dist 并经 Ingress 把 `/v1` 路由到后端 Service，
或用同一 Ingress 按路径分流（`/v1`→backend、`/`→web）。

---

## 8. 初始化与运维速查

| 操作 | 命令 |
|---|---|
| 迁移 | 随服务启动自动（`run_migrations_on_start=true`），或 `dms-server bootstrap` 顺带 |
| 建首个企业+管理员 | `dms-server bootstrap`（`BOOTSTRAP_EMAIL/PASSWORD`） |
| 建平台超管 | `dms-server platform-admin`（`PLATFORM_ADMIN_EMAIL/PASSWORD`） |
| 健康检查 | `GET /healthz`（存活）、`GET /readyz`（依赖就绪） |
| 指标 | `GET /metrics`（Prometheus） |
| API 文档 | `GET /docs`（Swagger UI）、`crates/api/openapi.json` |
| 数据库角色 | 运行时 `dms_app`(NOSUPERUSER NOBYPASSRLS)；迁移/DDL 用 `dms`(owner)。生产经 IaC provision，勿写进迁移 |

---

## 9. 常见坑

- **前端 `VITE_*` 是构建期注入**：改了必须重新 build / 重建镜像，运行时改环境变量无效。
- **nginx 反代服务名必须是 `backend`**：[`nginx.conf`](../nginx.conf) 写死 `proxy_pass http://backend:8080`，
  compose 里后端服务名要叫 `backend`（或改 nginx.conf）。
- **两个数据库角色别混用**：`migration_url` 用 owner（`dms`），`url` 用受 RLS 的 `dms_app`，否则 RLS 形同虚设或迁移没权限。
- **`JWT_SECRET` 生产必改**，且多副本间一致，否则会话互相不认。
- **Windows 用 curl 发中文 body 会乱码**（ANSI 码页）：写 UTF-8 临时文件 + `--data-binary @file`，或用前端/脚本发。
