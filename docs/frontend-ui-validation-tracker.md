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

2026-06-30 - Runtime browser verification pending for registry record search/sort
Route: `/projects/:id/registry`
Repro: After adding server-side record search/sort support, the already running `http://localhost:8080` service showed the new search UI but continued returning 10 `ADC` rows for an impossible search string.
Expected: After the backend process is restarted with the current code, searching `definitely-no-match-062630` returns 0 matching records and clicking sortable headers changes the server-side order.
Actual: Browser verified the new frontend controls are loaded, but the current runtime still behaved like the old backend and did not filter the rows.
Status: Restart the local backend/frontend service and rerun the focused browser search/sort check from this route.

## Resolved Findings

2026-06-30 - Registry column resize changes only the dragged column
Route: `/projects/:id/registry`
Repro: Dragging one resize line caused other table columns to resize at the same time.
Expected: Dragging a column edge changes only that column; existing widths of the other columns stay fixed during the drag.
Actual: `useResizableGridColumns` kept non-fixed columns as `minmax(width, fr)`, so browser grid layout redistributed free space while dragging. When dragging the inner line element, the resize handler could also measure the wrong parent and lock incorrect widths.
Fix: On resize start, walk up to the actual CSS grid header row, measure every current column as a pixel width, lock the grid to those pixel widths, then update only the dragged column during pointer movement.
Verification: `npm run build` passed. Browser verified `/projects/019f03a2-cce1-7df3-a08c-ffdfdeae1640/registry`: dragging the `name` resize line by 120px changed widths from `[200,286,286,286,286,48]` to `[200,406,286,286,286,48]`; deltas were `[0,120,0,0,0,0]`.
Commit: frontend this commit

2026-06-30 - Registry bulk delete action aligned with search toolbar
Route: `/projects/:id/registry`
Repro: The `删除全部记录` action lived in the record table header action column, making it look like another table header control instead of a list-level destructive action.
Expected: The bulk delete action should sit on the same toolbar row as search/filter controls while the table header remains focused on column labels and sorting.
Actual: `删除全部记录` was rendered in the table header's rightmost cell.
Fix: Added an `actions` slot to `GridSearchToolbar`, moved the `删除全部记录` button into that toolbar, and left the table action header cell blank for row action alignment. The button visibility now uses the current type's total record count rather than the filtered search result count.
Verification: `npm run build` passed. Browser verified `/projects/019f03a2-cce1-7df3-a08c-ffdfdeae1640/registry`: one `删除全部记录` button is rendered on the same row as `搜索记录…` (`searchY=349.3125`, `deleteY=351.3125`), and it appears above the table header (`sortY=409.3125`) rather than inside the header.
Commit: frontend this commit

2026-06-30 - Registry search matches field values by selected field
Route: `/projects/:id/registry`
Repro: The record table search used the whole JSON text, so it could match field names such as `name/heavy/light` instead of only user-entered record values; when the running backend ignored the new search parameter, every input appeared to match.
Expected: Search should match record field values. Users can choose all fields or a specific field to search against.
Actual: Search behavior was too broad and not field-aware.
Fix: Added `search_field` to project and organization record list APIs. Backend search now matches `jsonb_each_text(data)` values for all-fields search, or `data ->> search_field` for a selected field; it no longer searches JSON key names. `GridSearchToolbar` now supports an optional field selector, and the registry record table exposes `全部字段` plus every field in the current type.
Verification: `npm run build` passed in `dms-frontend`; `cargo check` passed in `dms-backend`. Browser verified `/projects/019f03a2-cce1-7df3-a08c-ffdfdeae1640/registry` shows the `全部字段` selector next to `搜索记录…`, keeps focus while typing `name`, and the selector menu lists `全部字段`, `name`, `heavy`, `light`, `linker`, `payload`, and `weight` for the current `ADC` type. Runtime filtering still requires restarting the already running backend service; see the open runtime verification finding.
Commit: backend/frontend this commit

2026-06-30 - Registry search input keeps focus while typing
Route: `/projects/:id/registry`
Repro: Type into the record table search box. After the first debounced search request starts, the table area refreshes and the search input loses focus, so continuing to type requires clicking the input again.
Expected: Users can type a full search query continuously; list refreshes should not unmount the search input or steal focus.
Actual: Query parameter changes put the records query back into loading state, causing `RecordsGrid` to render `TableSkeleton` and unmount the search toolbar.
Fix: Added `placeholderData: keepPreviousData` to project and organization record list queries, so search/sort/page parameter changes keep the previous result rendered while the new request is in flight.
Verification: `npm run build` passed. Browser verified `/projects/019f03a2-cce1-7df3-a08c-ffdfdeae1640/registry`: after typing `a` and waiting past the debounce interval, the search input remained focused, no skeleton rendered, and continuing to type `bc` produced `abc` without another click.
Commit: frontend this commit

2026-06-30 - Registry record table column resizing
Route: `/projects/:id/registry`
Repro: Registry record tables use fixed CSS grid columns, so long field values can only be truncated and users cannot widen important columns.
Expected: The record table header supports dragging column edges to widen or narrow ID and field columns while keeping rows aligned; very wide columns should create table-level horizontal scrolling instead of hitting an artificial maximum width.
Actual: Column widths were static.
Fix: Added reusable resizable grid column helpers to `src/components/data-grid.tsx` and wired the project registry record table to use visible vertical line drag handles for ID and visible field columns. The action column remains fixed. Registry record columns no longer have a maximum drag width, and the table card scrolls horizontally when resized columns exceed the available width.
Verification: `npm run build` passed. Browser verified `/projects/019f03a2-cce1-7df3-a08c-ffdfdeae1640/registry` exposes visible resize-line controls such as `拖拽调整 ID 列宽`; dragging the ID column expanded it from about 200px to 1025px, and the table card changed from `scrollWidth=1425` to `scrollWidth=5205` while `clientWidth=1425`, confirming horizontal scrolling instead of a max-width cap.
Commit: frontend this commit

2026-06-30 - Registry record table search and sort
Route: `/projects/:id/registry`
Repro: Registry record tables only supported pagination and manual scanning; users could not search records or sort by visible columns.
Expected: Record tables expose a reusable search toolbar and sortable headers; query state should go through the backend list API so pagination, search, and sorting operate on the full result set.
Actual: No record search input or sortable column headers were available.
Fix: Added reusable `GridSearchToolbar`, `GridSortButton`, and `GridSortState` helpers to `src/components/data-grid.tsx`; wired project and organization registry list APIs/hooks for `search`, `sort`, and `desc`; added backend `EntityFilter` support for text search and field/ID ordering; connected the project registry record table to debounced search, sortable visible columns, reset-on-filter pagination, and a distinct no-match empty state.
Verification: `npm run build` passed in `dms-frontend`; `cargo check` passed in `dms-backend` after allowing crate downloads. Browser verified `/projects/019f03a2-cce1-7df3-a08c-ffdfdeae1640/registry` renders one `搜索记录…` input, sortable header buttons (`排序 ID`, field headers), active sort styling after clicking `排序 ID`, and the resized table still creates horizontal scrolling. Runtime search-result filtering is pending until the already running service is restarted with the current backend code; see Open Findings.
Commit: backend/frontend this commit

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
