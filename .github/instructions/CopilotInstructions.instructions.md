---
applyTo: '**'
---
Work Item Planner – AI Assistant Project Context & Guidelines

## 1. Purpose / Product Summary
Work Item Planner is a lightweight internal web application that helps teams rapidly generate and prefill Azure DevOps (ADO) Work Items (Features / Scenarios / Tasks) from configurable JSON templates. It reduces manual data entry, enforces naming / structural consistency, and accelerates planning scenarios. Hosted as a Node.js (Express) web app on Azure App Service (Linux). Telemetry captured via Azure Application Insights (shared instance for client & server).

Primary user actions:
1. Provide organization / project / iteration / area path metadata.
2. Select or prefill from a template (JSON under `public/work_item_templates/`).
3. Optionally edit / add work items & tasks (with planned rich text descriptions – feature flagged).
4. Submit to create ADO items through REST APIs (handled server‑side in routes – future enhancement area if not yet implemented).

## 2. High-Level Architecture
Node.js Express server (entry: `app.js`)
Views rendered with EJS templates (`views/`)
Static assets served from `public/`
Client-side logic: `public/scripts/*.js`
Work item templates: `public/work_item_templates/*.json` + index file enumerating them
Routing: `routes/` (e.g., `azureDevOps.js`, `index.js`)
Styling: `public/stylesheets/`
Telemetry: Azure Application Insights (browser script + server SDK if added later)
Deployment: GitHub Actions → Azure App Service via OIDC (no publish profile secrets)

## 3. Key Directories Cheat Sheet
`app.js` – Express app setup, middleware registration.
`routes/azureDevOps.js` – ADO integration endpoints (naming and REST usage must remain secure; avoid logging PII / tokens).
`public/scripts/` – Front-end behavior (form handling, feature flag logic, telemetry instrumentation, rich text editor integration, auth redirect handling, etc.).
`public/work_item_templates/` – User-provided template JSON definitions + `work_item_templates_index.js` mapping display names → filenames.
`views/` – EJS view templates (`index.ejs`, `error.ejs`).
`azure-deploy.yml|azure-webapps-node.yml` (GitHub workflow – if present) – Automated deployment pipeline.

## 4. Coding Guidelines (Server & Client)
General:
- Use modern JavaScript (ES2019+) features supported by Node LTS; prefer `const` / `let` over `var`.
- Favor pure functions for data shaping; isolate side effects (API calls, DOM updates, logging).
- Keep modules cohesive: one responsibility per file; if a script grows > ~300 lines consider factoring.

Async & Error Handling:
- Always `await` asynchronous operations; avoid unhandled promise rejections.
- Wrap external service calls (Azure DevOps, Application Insights) with try/catch and propagate a sanitized error message (never propagate tokens).
- Provide user-friendly error state in UI (e.g., toast / inline message) without leaking raw stack traces.

Input Validation & Security:
- Sanitize / validate all incoming query/body params (length, whitelist characters where feasible).
- Reject or escape HTML user input unless explicitly intended for rich text (when rich text feature flag enabled, store HTML safely – avoid script injection; consider sanitization library if expanded).
- Never log secrets, PATs, tokens, or personally identifiable information. Redact IDs if not necessary.
- Enforce least privilege for any new Azure identity scopes; document required permissions.
- Be CORS aware: local dev may require temporary permissive headers; do not broaden production origins without justification.

Feature Flags:
- Rich Text Editor toggle: `window.ENABLE_RICH_TEXT_EDITOR` in `public/scripts/richTextEditor.js`. All conditional logic should check the flag early and degrade gracefully to plain text.
- When adding new flags: attach them to a single configuration module (if introduced) or a consistent global namespace; document default & risk.

Telemetry:
- Use meaningful event names: `workitem.create.start`, `workitem.create.success`, `workitem.create.failure`.
- Include minimal, non-PII dimensions (counts, durations, template identifier, success/failure booleans). Avoid raw titles or user-provided free text.
- Wrap telemetry calls; ensure failures are non-blocking.

Logging:
- Client: keep console noise low; prefer `console.debug` for verbose diagnostics behind an opt-in debug flag.
- Server: structured logs (JSON if logging pipeline introduced later) – include correlation IDs if/when added.

Performance:
- Avoid synchronous blocking operations on request path (e.g., large file IO; load templates once and cache in memory with simple invalidation on startup).
- Minify/concatenate vendor assets only if bundle grows large (currently static vendor libs are included – consider build step in future if size becomes material).

Accessibility (a11y):
- Ensure form controls have labels; actionable elements accessible via keyboard; do not rely solely on color.

## 5. Template Management Rules
- File naming pattern: `team_category_process_v<version>.json` (underscore separators; lowercase; no special chars besides underscore / space).
- Schema: `{ "version": string, "template": { "workitems": [ { title, tasks: [ { title, estimate, description? } ] } ] } }`.
- Update `work_item_templates_index.js` with both the machine key and display name; maintain alphabetical or existing ordering convention.
- Version bump on any backward-incompatible change; keep older versions available until fully deprecated.

## 6. Rich Text Editor (Beta) Guidelines
- Keep all rich text logic isolated to `richTextEditor.js` and optional CSS class toggles (`plain-text-mode`).
- Provide helper functions `getRichTextContent()` / `setRichTextContent()` that abstract mode differences.
- Do not break plain-text path when enhancing formatting features.
- Sanitize or strictly limit allowed tags if adding new markup capabilities.

## 7. Deployment & DevOps Notes
- GitHub Actions uses OIDC with a user-assigned Managed Identity; no secrets/publish profiles committed.
- Do not introduce secret-based auth in workflows; prefer federated credentials.
- If adding new Azure resources, document required roles and scopes (principle of least privilege).
- Keep `azure-deploy.yml` / workflow names consistent; add matrix only if build variants are needed.

## 8. Configuration & Environment Variables
Current known env vars (indicative – verify before use):
- `APPLICATIONINSIGHTS_CONNECTION_STRING` – instrumentation key/connection string for telemetry.
- Add new env vars with clear naming, and document in `README.md` before relying on them.

## 9. Security & Compliance Practices
- Follow SDL: threat model updates when introducing authentication flows, storage, or elevated privileges.
- Validate external API responses (e.g., ADO REST) – do not assume shape; guard for null / missing fields.
- Avoid embedding direct organization identifiers in telemetry or logs without business justification.

## 10. Testing Guidelines
- Prefer lightweight unit tests for pure functions (if test harness introduced – consider Jest for Node, QUnit or similar for isolated browser logic).
- Add smoke test script for template loading (validate schema and index coverage) before merging new templates.
- Edge cases: empty template file, malformed JSON, duplicate template keys, network failures to ADO, rich text disabled vs enabled mode.

## 11. Contribution Review Checklist (for PRs)
Before approving:
- Naming: new files / functions follow camelCase (JS) or kebab-case (static assets) conventions.
- Security: no secrets, tokens, or PII added; inputs validated.
- Feature flag respected where relevant (no unconditional rich text code paths).
- Telemetry added (if feature user-facing) and compliant (no sensitive payloads).
- Templates conform to schema and naming rules; index updated.
- Documentation updated (README / inline comments) for non-obvious changes.

## 12. AI Assistant Usage Expectations
When generating code:
- Do not invent endpoints or environment variables not present in the repo without labeling them as assumptions.
- Prefer minimal, focused diffs; avoid broad refactors unless explicitly requested.
- Offer small, incremental improvements (error handling, input validation, telemetry hooks) after fulfilling explicit user requests.
- Always preserve existing feature flags and configuration patterns.

When answering questions:
- Base responses on repository structure & documented behaviors; if uncertain, state assumption explicitly.
- Provide concrete file references (wrap in backticks) and actionable steps.

When reviewing changes:
- Highlight security, performance, maintainability, and consistency impacts.
- Suggest test scenarios and telemetry instrumentation opportunities.

## 13. Non-Goals / Out of Scope
- Full rewrite to a SPA framework (React/Vue) – unless strategic decision recorded.
- Introducing heavy build tooling without clear performance or maintainability gain.
- Adding persistent server-side storage (DB) – current model is stateless with template files.

## 14. Future Improvement Ideas (Track Separately)
- Automated schema validation on PR for templates.
- Introduce Jest + basic test coverage for template loader & rich text toggle.
- Add CSP headers & security hardening middleware.
- Add server-side rate limiting for ADO API proxy routes.

## 15. Style Quick Reference
Imports (Node): built-ins first, then externals, then local modules.
Function naming: verbs for actions (`createWorkItems`, `loadTemplates`), nouns for data containers.
Prefer early returns over nested conditionals.
Keep functions < ~40 lines where reasonable – refactor otherwise.

---
These guidelines are living; update this file alongside any architectural or policy changes so AI-generated contributions remain aligned.