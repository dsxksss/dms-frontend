# Agent Guidelines

## Frontend UI Validation

- When a browser UI validation pass is already documented as passing, do not restart a full UI sweep from the beginning unless the user explicitly asks for a full regression, or the current change affects global routing, authentication, layout shell, or shared UI primitives.
- Continue validation from `docs/frontend-ui-validation-tracker.md`. Use the latest documented baseline and the open findings list as the starting point.
- If a new bug or broken button is found during UI validation, first record it in `docs/frontend-ui-validation-tracker.md` with reproduction steps, affected route, expected behavior, actual behavior, and current status.
- Fix recorded findings one by one. After each fix, update the same document with the commit or working-tree state, the verification route, the test account used when relevant, and whether the issue is resolved.
- Keep browser checks reversible where possible. For destructive or permission-changing actions, ask before executing unless the user has already explicitly authorized that exact action.
