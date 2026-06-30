# Frontend UI Validation Tracker

Last baseline: 2026-06-30, branch `feat/backend-sync-0624`, frontend commit `73ee923`.

## Purpose

This document is the continuation point for browser UI validation and frontend button stability work. When the latest baseline below is still applicable, future validation should start from the open findings and recently changed areas instead of repeating the full browser UI sweep from the beginning.

## Workflow

1. Before testing, check this document for open findings and the latest verified baseline.
2. If a new issue is found, add it to **Open Findings** before fixing it.
3. Fix findings one by one.
4. After each fix, update the finding with verification evidence and move it to **Resolved Findings** when confirmed.
5. Run a focused regression around the affected page/component. Run a full UI sweep only when the change touches global routing, authentication, layout shell, shared UI primitives, or when explicitly requested.

## Latest Passing Baseline

The following browser UI areas have been verified as passing during the current stabilization pass:

- Organization workflows: create, rename, delete permissions, tabs, organization registry type/record create/edit/delete confirmation, cleanup of temporary org/type/record data.
- Project workflows: create, rename, archive/unarchive/delete, context-menu archive/delete, project settings archive button, cleanup of temporary projects.
- File workflows: upload of PDF, PNG, ZIP, SMI, TXT, OUT; TXT preview; file context menu; move; confidential flag; grants; cleanup of temporary uploaded files.
- Asset and registry workflows: asset type multilingual fields and description; registry type/record create/edit/delete; import dialogs; field settings; recycle bin; from-asset dialogs; convert-to-dataset; drawer and context-menu coverage.
- Dataset workflows: create/delete temporary dataset; detail page; edit dialog; export; version upload entry; role dropdown; delete confirmation; cleanup of temporary datasets.
- Notebook workflows: create, edit, save, view modes, archive/unarchive/delete temporary notebook records.
- Project settings and audit: project rename/restore; member add/invite dialogs; visibility round-trip; unit catalog create/delete; fine-grained grants dialog; audit change dialog; raw JSON summary; pagination.
- Global search and public datasets: global search result navigation; public datasets empty state.
- Authentication and shell: app logout/login; login mode toggle; platform console link; platform invalid login error; return to app; Wemol login.
- Platform admin workflows: overview; tenant create dialog open/cancel; tenant detail suspend confirmation cancel; platform system dataset create/delete; global settings switch/select draft behavior; tenant plan select draft behavior; tenant detail back link; platform side navigation; language toggle; account menu open.
- Onboarding guide removal: no onboarding/guide/tour/get-started source or visible browser entry remains; `npm run build` passed.

Known intentionally skipped or confirmation-required actions:

- Platform "退出控制台" was not clicked because it logs out the platform admin session and requires explicit authorization to re-enter platform administrator credentials.
- Real permission changes such as changing an existing project member role were not performed without explicit authorization.

## Open Findings

No open findings at this baseline.

## Resolved Findings

2026-06-30 - Registry record table column resizing
Route: `/projects/:id/registry`
Repro: Registry record tables use fixed CSS grid columns, so long field values can only be truncated and users cannot widen important columns.
Expected: The record table header supports dragging column edges to widen or narrow ID and field columns while keeping rows aligned.
Actual: Column widths were static.
Fix: Added reusable resizable grid column helpers to `src/components/data-grid.tsx` and wired the project registry record table to use visible vertical line drag handles for ID and visible field columns. The action column remains fixed.
Verification: `npm run build` passed. Browser verified `/projects/019f03a2-cce1-7df3-a08c-ffdfdeae1640/registry`; the visible `name` column resize line is the hit target, dragging it changed that column template up to `minmax(520px, 1fr)`, with the header and first row cell both measuring 520px after resize, records still present, and no console errors.
Commit: frontend this commit

2026-06-30 - Registry record bulk delete entry
Route: `/projects/:id/data`, `/projects/:id/registry`
Repro: When a registry type contains many records, deleting records one by one and permanently deleting records one by one from the record trash is inefficient.
Expected: Users with delete permission can soft-delete all records of the current type from the record list, and permanently clear the current type's record trash from the trash dialog, with destructive confirmation.
Actual: Only per-record delete / purge actions were available.
Fix: Added a delete-permission-gated `删除全部记录` icon action in the current type's record table header action column and a `清空回收站` action inside the record trash dialog. Both actions fetch every page for the current type, execute the existing soft-delete / purge APIs, invalidate registry queries, and require destructive confirmation before doing any work.
Verification: `npm run build` passed. Browser verified `/projects/019f03a2-cce1-7df3-a08c-ffdfdeae1640/registry` has a single table header row with a `删除全部记录` icon action, opens the `删除全部记录？` confirmation for `ADC` with 10 records, and cancel leaves `共 10 条`; `/projects/019f03a2-cce1-7df3-a08c-ffdfdeae1640/data` record trash shows `清空回收站`, opens the `清空记录回收站？` confirmation for `库存 Inventory` with 34 records, and no console errors were reported. Destructive confirms were not clicked.
Commit: frontend this commit

2026-06-30 - Field labels support independent zh/en display names
Route: `/projects/:id/registry`, `/orgs/:id`, `/settings`, `/system/settings`
Repro: Dynamic registry fields and settings-like fields relied on a single display string or technical `name`, making bilingual UI and field editing inconvenient.
Expected: Fields support separate `zh_label` and `en_label` display names while keeping `name`/`key` as the stable technical identifier.
Actual: Registry field UIs rendered `f.name` directly; platform settings returned a single `label`; personal settings labels were static i18n text without an explicit field metadata model.
Fix: Added optional `zh_label/en_label` to backend registry field definitions; added `zh_label/en_label/name` metadata to platform settings responses; added frontend field label helpers, field-builder inputs, and label-aware display across registry lists, forms, drawers, grants, conversion dialogs, org registry, platform settings, and personal settings.
Verification: `cargo check` passed in `dms-backend`; `npm run build` passed in `dms-frontend`; browser verified `/settings` labels and `/projects/019f03a2-cce1-7df3-a08c-ffdfdeae1640/registry` new asset type dialog shows `中文标签 / 英文标签 / 字段名` after adding a field, with no console errors.
Commit: backend `b62da42`; frontend this commit

Use this format for future fixes:

```text
YYYY-MM-DD - <short title>
Route:
Repro:
Expected:
Actual:
Fix:
Verification:
Commit:
```
