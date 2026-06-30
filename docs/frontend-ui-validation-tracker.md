# Frontend UI Validation Tracker

Last baseline: 2026-06-30, branch `feat/backend-sync-0624`, frontend commit `e0e7f58`.

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
