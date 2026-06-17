# 降低"手填 ID / slug / key"门槛 —— 前端已做 + 需后端配合（转交后端 agent）

> 背景：普通用户被要求手填机器标识（slug、UUID、role_key 等），门槛过高。
> 前端这轮已把能在前端解决的都解决了；下面第 2 节是**需要后端配合**才能进一步去掉的点。

## 1. 前端本轮已完成（无需后端改动）

- **slug 不再强制手填**：组织 / 团队 / 平台开通企业 / 自助开通租户，slug 改为**可选**，
  留空时前端按名称自动派生（ascii 名取 slug；**中文名回退随机串** `org-xxxxxx`，避免空 slug）。
- **加团队成员**：原来手填 user UUID → 改为从**该组织现有成员下拉选**（团队成员本就须先是组织成员）。
- **审计筛选**：操作者由手填 UUID → **用户搜索选择器**；对象类型由手填 → **下拉**。
- **角色授予（org 详情 > 角色授予）**：主体由手填 UUID → 用户搜索 / 团队下拉；role_key 由手填 → 下拉；
  作用域 ID 自动取当前组织 / 团队下拉。
- 其余（实体关系、数据集关联、字段/文件授权、项目/组织成员邀请）此前已是 picker，无手填 ID。

## 2. 需要后端配合（能进一步去掉字段 / 更稳）

### 2.1 slug 服务端可选 + 自动生成（建议）
现状：`POST /v1/signup/tenant` 已支持 slug 缺省派生；但 **`POST /v1/orgs`、`POST /v1/teams`、
`POST /v1/platform/tenants` 仍要求 slug**。前端目前自己兜底生成后再发，但有两点希望后端统一处理：

- **接受 slug 省略**：这三个端点允许 body 不带 slug。
- **服务端派生 + 保证唯一**：缺省时由 name/company_name 派生；**CJK 等无 ascii 的名称**请回退到
  随机/带序号 slug（如 `org-7x3k9`），并在冲突时自动追加后缀，避免 409。

收益：前端可直接**删掉 slug 输入框**，普通用户完全无感；也消除前端兜底与后端规则不一致的风险。

### 2.2 可授予角色清单端点（建议）
现状：角色授予的 `role_key` 是自由文本；前端暂时**硬编码** 6 个键
（`admin/member/owner/manager/contributor/viewer`）做下拉。

- 希望提供：`GET /v1/roles`（或 `/v1/role-defs`）→ `[{ key, label?, scope_types?: string[] }]`，
  列出本租户可授予的角色及其适用作用域。

收益：role_key 下拉由后端驱动，新增/改名角色无需改前端；并能按所选 scope_type 过滤可选角色。

### 2.3 （可选，低优先）审计对象类型枚举
现状：前端硬编码常见 entity_type 列表做下拉筛选。若后端能提供 `GET /v1/audit/entity-types`
（distinct 列表）则更准；不提供也不阻塞。

### 2.4 组织响应回带 `discoverable`（后端已同意配合）
现状：`OrganizationResponse`（`GET /v1/orgs`、create/patch 响应）只含 `{ id, slug, name }`，
不含 `discoverable`，导致前端的"允许被搜索并申请加入"开关无法回显当前真实状态（只能乐观本地态）。

- 请在 `OrganizationResponse` 增加 `discoverable: bool`（域模型 `organizations.discoverable` 已有，
  应用层 DTO `OrganizationResponse` 补一个字段 + `From<Organization>` 映射即可）。
- 前端已把该开关改成 Switch 并按 `org.discoverable` 初始化（字段缺省时回退 false）；后端返回后即自动回显。

---

> 约定不变：RFC7807 / `Paginated<T>` / plan 档 `demo|standard|enterprise|onprem` / `-1=不限`。
> 2.1、2.2 落地后告诉我，我会删掉对应的 slug 字段、把 role_key 下拉切到后端数据源，并补测试。
