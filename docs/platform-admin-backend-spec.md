# 平台超管（跨企业）—— 后端接口需求（转交后端 agent）

> 目的：让前端的 `/admin → 平台超管` 从占位变成可用。当前后端是多租户 + **RLS 严格隔离**，
> 没有任何跨租户端点，所以平台超管必须由后端新开一条**受控的跨租户特权路径**。
> 下列为前端将消费的契约草案；具体实现/字段以后端为准，定稿后把最终形态发我即可对接。

## 0. 核心难点 & 建议的鉴权模型

平台超管要**跨所有企业(tenant)**读写，这与现有 RLS（按 `app.current_tenant` 隔离）冲突。建议：

- **平台管理员身份独立于租户**：不是某企业内的普通用户。可选实现：
  - 新增 `platform_admins` 概念（或在 users 上加 `is_platform_admin`），登录后签发带 **`platform` 作用域**的会话（JWT 里标 `scope=platform`，不绑定单一 tenant）。
  - 平台端点用**拥有者连接**（owner / BYPASSRLS，或显式不设 `app.current_tenant`）查询 `tenants` 表（该表本就无 RLS）及跨租户聚合；普通 `/v1/*` 仍走受 RLS 约束的 `dms_app`。
- **强约束**：平台端点全部要求 `platform` 作用域；越权返回 `403`。建议平台操作单独审计（who/what/IP），高敏感。
- 与现有 license 联动：企业数上限、机器绑定等已在后端（license-* 子命令），平台端只读/展示其状态即可。

> 若你倾向"复用现有 tenant 用户 + 一个特殊 `platform:admin` 权限键"也行，关键是该身份能合法跨 RLS。
> 前端不关心内部实现，只要有下面这组 `/v1/platform/*` 端点 + 一个"我是不是平台管理员"的判定。

## 1. 鉴权 / 身份

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/v1/platform/login` 或复用 `/v1/auth/login` | 平台管理员登录，返回 `SessionTokens`（带 platform 作用域）。复用现有登录亦可，但响应/令牌需能让前端识别"平台作用域"。|
| GET | `/v1/platform/me` | 返回当前是否平台管理员 + 可用能力，如 `{ "platform_admin": true, "permissions": ["platform:tenants:read","platform:tenants:write"] }`。前端用它决定是否展示平台超管入口。|

> 若复用 `/v1/auth/login`：请在 `/v1/me` 或新 `/v1/platform/me` 暴露 `platform_admin: bool`，前端据此放行 `/admin/platform`。

## 2. 企业（tenant）管理

分页统一用现有 `Paginated<T> { items, total, limit, offset }`；错误 RFC7807。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/v1/platform/tenants?search=&limit=&offset=` | 列出所有企业（按 slug/name 模糊）。→ `Paginated<TenantCard>` |
| GET | `/v1/platform/tenants/{id}` | 企业详情 + 用量。→ `TenantDetail` |
| POST | `/v1/platform/tenants` | 由平台开通新企业（同 signup/tenant，但管理员发起）。Body `{ company_name, slug?, plan?, admin_email, admin_password }` → `TenantDetail` |
| PATCH | `/v1/platform/tenants/{id}` | 改套餐/配额/状态。Body 见下。→ `TenantDetail` |
| POST | `/v1/platform/tenants/{id}/suspend`·`/activate` | 停用 / 恢复企业（停用后该企业无法登录/读写）。→ `TenantDetail` |

**TenantCard / TenantDetail（前端要展示的字段）**
```jsonc
{
  "id": "uuid",
  "slug": "acme",
  "name": "恒瑞医药",
  "plan": "standard",                 // demo | standard | enterprise | onprem
  "max_orgs": 5,                       // -1 = 不限
  "max_users_per_org": 20,
  "storage_bytes": 107374182400,      // 配额（字节）
  "active": true,                     // 是否停用
  "created_at": "2026-06-16T...Z",
  // 用量（TenantDetail 至少给这些，TenantCard 能给最好）：
  "usage": { "orgs": 3, "users": 42, "storage_used": 5242880 }
}
```

**PATCH 请求体**（字段可选，传什么改什么）
```jsonc
{ "plan": "enterprise", "max_orgs": 10, "max_users_per_org": 1000, "storage_bytes": 5497558138880, "active": true }
```
> 说明：改 `plan` 时是否自动套用该档的三项配额、还是三项需显式传——后端定，告诉我即可（前端会按"选 plan 自动带出该档默认值、也可手动覆盖"来做）。

## 3. 概览 / 统计（平台 dashboard 用）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/v1/platform/stats` | 平台总览：`{ "tenants": 12, "active_tenants": 11, "users": 380, "storage_used": 123456789 }` |

## 4. License（已存在能力，平台端只读展示）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/v1/platform/license` | license 状态：`{ "max_tenants": 5, "used_tenants": 3, "machine_bound": true, "valid": true, "expires_at": "..." }`（对应现有 `license-status` 子命令的信息）|

## 5. （可选）跨企业审计

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/v1/platform/audit?tenant=&limit=&offset=` | 跨企业审计查询（平台级排障/合规）。→ `Paginated<AuditEntry>`（复用现有 AuditEntry 形态）|

## 6. 权限键建议

- `platform:tenants:read` / `platform:tenants:write`、`platform:license:read`、`platform:audit:read`。
- 平台管理员持有上述键；前端按键显隐操作（建/改/停用企业）。

---

## 前端就绪情况（后端落地后我接什么）

`/admin/platform` 占位页已在；后端给出上述端点后，前端将补：
- **企业列表**（搜索/分页、plan 徽章、用量列、停用状态）；
- **企业详情**（用量 + 改套餐/配额表单：选 plan 自动带出三项默认、可手改；停用/恢复）；
- **新建企业**（平台发起开通）；
- **平台概览**（stats 卡片）+ **license 状态**卡片；
- 平台超管入口的可见性改由 `/v1/platform/me` 的 `platform_admin` 判定（替换当前的占位）。

> 约定不变：RFC7807 错误、`Paginated<T>`、plan 档位 `demo/standard/enterprise`、配额 `-1=不限`。
> 定稿后把最终端点 + 字段（或 openapi.json）发我，我按现有模式接，并补测试。
