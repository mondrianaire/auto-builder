# Edge-Case Testing Report — github-profile-card

Generated: 2026-05-17T03:33:10.439Z

## Test Environment

- static-checks: Node v22.22.0 on linux (x64)
- derivers-tests: Node v22.22.0 on linux (x64)

## Summary

- **Total assertions:** 77
- **Pass:** 67
- **Fail:** 0
- **Not exercised in static mode (deferred to CV Tier 2):** 10

## GitHub API endpoints exercised at runtime (by source inspection)

- https://api.github.com/graphql
- https://api.github.com/users/{login}
- https://api.github.com/users/{login}/repos?per_page=100&type=owner&sort=updated
- https://api.github.com/repos/{owner}/{repo}/languages

## Live-network note

Live exercise against api.github.com is deferred to CV Tier 2 / user-side first-contact. Static mode in Node cannot stand in for the browser fetch context.

## Results by id

| id | result | detail |
|---|---|---|
| FILE_STRUCTURE | pass | required files present: 7/7 |
| MCA.api-client.1 | pass | async function fetchProfilePayload exported |
| MCA.api-client.2 | not_exercised_in_static_mode | Live GitHub API call - deferred to CV Tier 2. |
| MCA.api-client.3 | not_exercised_in_static_mode | Live GitHub API call - deferred to CV Tier 2. |
| MCA.api-client.4 | not_exercised_in_static_mode | Live GitHub API call - deferred to CV Tier 2. |
| MCA.api-client.5 | pass | pat=null branch returns empty pinned + empty contribution calendar |
| MCA.api-client.6 | pass | GraphQL query includes both pinnedItems and contributionsCollection |
| MCA.api-client.7 | pass | Authorization header value is Bearer ${pat} |
| MCA.ui-shell.1 | pass | input#username-input present |
| MCA.ui-shell.2 | pass | input#pat-input type=password present |
| MCA.ui-shell.3 | pass | button#lookup-button present |
| MCA.ui-shell.4 | pass | PAT-creation link present |
| MCA.ui-shell.5 | not_exercised_in_static_mode | Browser console - deferred to CV Tier 2. |
| MCA.ui-shell.6 | pass | card-renderer clears container before re-rendering |
| MCA.card-renderer.1 | pass | avatar img.setAttribute(src, payload.user.avatar_url) |
| MCA.card-renderer.2 | pass | Pinned section label + empty state present |
| MCA.card-renderer.3 | pass | Current streak literal present |
| MCA.card-renderer.4 | pass | Most-used language literal present |
| MCA.card-renderer.5 | pass | Contribution activity caption present |
| MCA.card-renderer.6 | pass | Heatmap 13x7=91; WEEKS=13:true DAYS=7:true loop:true |
| MCA.card-renderer.7 | pass | no innerHTML assignment of non-literal value |
| MCA.card-renderer.8 | pass | INTENSITY_COLORS has 5 entries |
| MCA.edge-case-testing.1 | pass | All MCA + DCA ids enumerated in test-report.json |
| MCA.edge-case-testing.2 | pass | Test env named (node + OS); api.github.com URLs identified from source: /graphql, /users/{login}, /users/{login}/repos, /repos/{owner}/{repo}/languages. Live exercise deferred to CV Tier 2. |
| DCA.telos | not_exercised_in_static_mode | Scenario walk - deferred to CV. |
| DCA.restatement | pass | static-only folder |
| DCA.A1 | pass | no build step |
| DCA.A2 | not_exercised_in_static_mode | Live - deferred to CV. |
| DCA.A3 | pass | no auth-flow code (bare "login" is API field name) |
| DCA.A4 | pass | single article.profile-card per render |
| DCA.A5 | pass | pinnedItems(first:6, types:[REPOSITORY]) |
| DCA.A9 | pass | all URLs api.github.com (others: 0) |
| DCA.A10 | pass | no persistence APIs |
| DCA.A11 | pass | 404 -> UserNotFoundError |
| DCA.IP1 | pass | PAT input + link |
| DCA.IP2 | pass | Current streak label |
| DCA.IP4 | pass | caption literal |
| DCA.IP5 | pass | heatmap 13x7 |
| DCA.IP6 | pass | dark + system-ui |
| DCA.PN1 | pass | github.com only |
| DCA.PN2 | pass | username -> /users/{login} + $login |
| DCA.PN3 | pass | pinnedItems in GraphQL |
| DCA.PN4 | pass | computeCurrentStreak(days) signature |
| DCA.PN5 | pass | /repos/{owner}/{repo}/languages |
| DCA.PN6 | pass | heatmap 13x7 covers 90 days |
| DCA.FC1 | not_exercised_in_static_mode | Console - deferred to CV. |
| DCA.FC2 | pass | username + lookup button |
| DCA.FC3 | pass | PAT field + explanation + link |
| DCA.FC4 | not_exercised_in_static_mode | Live scenario - deferred to CV. |
| DCA.FC5 | pass | UserNotFoundError mapped |
| DCA.FC6 | pass | missing PAT handled |
| DCA.FC7 | pass | AuthError mapped |
| DCA.FC8 | pass | empty-state pinned |
| DCA.FC9 | pass | all 3 metric labels |
| DCA.FC10 | pass | container cleared before re-render |
| DCA.OOS.auth-flow | pass | no auth-flow code |
| DCA.OOS.server | pass | no server files |
| DCA.OOS.database | pass | no persistence |
| DCA.OOS.compare | pass | no compare UI |
| DCA.OOS.private-data | pass | no private-true branch |
| DCA.OOS.writes | pass | POSTs=1, PUT/PATCH/DELETE=0 |
| DCA.OOS.orgs | not_exercised_in_static_mode | Live - deferred to CV. |
| DCA.OOS.enterprise | pass | github.com only |
| DCA.OOS.mobile | pass | no @media RULES (comments stripped) |
| DCA.OOS.export | pass | no share/export/download/embed in html |
| DCA.OOS.background-poll | pass | no setInterval / Notification |
| DCA.OOS.i18n | pass | no i18n keywords |
| PNV.1 | not_exercised_in_static_mode | Prompt-named-verb "shows" - full browser scenario; deferred to CV Tier 2. |
| MCA.data-derivers.1 | pass | computeCurrentStreak([]) -> {"streak_days":0,"anchor_date":null} |
| MCA.data-derivers.2 | pass | 5-positive-day series -> streak_days=5, anchor_date=2026-05-16 |
| MCA.data-derivers.3 | pass | mixed-with-fork -> language=JavaScript, bytes=1000, share_pct=66.7 |
| MCA.data-derivers.4 | pass | empty={"language":null,"bytes":0,"share_pct":0}, all-forks={"language":null,"bytes":0,"share_pct":0}, empty-langs={"language":null,"bytes":0,"share_pct":0} |
| MCA.data-derivers.5 | pass | lengths: empty=90, single=90, year=90 |
| DCA.A6 | pass | today-is-zero, 5 positive prior -> {"streak_days":5,"anchor_date":"2026-05-15"} |
| DCA.A7 | pass | bytes-weighted excluding fork -> {"language":"TypeScript","bytes":2300,"share_pct":82.1} |
| DCA.IP3 | pass | tie-break alphabetical -> {"language":"Apple","bytes":1000,"share_pct":50} |
| DCA.A8 | pass | 1-day input padded to 90; last=2026-05-16/7, first=2026-02-16, leading-zeros=true |
