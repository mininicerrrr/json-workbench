# Toolbox evidence

**Baseline:** `9691cbe026a7a42a9cde0ba08334c2e844cba908`

**Earlier UI screenshots (pre–366/UTC/worker):** `f526c2f57a4ba8e45c34e8188806e361bd56d0f0` — historical only, not pixel-comparable to later heads.

## Exact-head local verification

Checkout the PR branch tip, then:

```sh
npm test
# 54 unit tests, 0 fail (Cron DST/OR/window assertions)

npm run build && node scripts/static-routes.test.mjs

SOURCE_SHA=$(git rev-parse HEAD) ARTIFACT_DIR=/opt/cursor/artifacts npm run test:browser
# 30 Playwright registrations (15 cases × desktop/mobile projects)
# Latest full run: 21 pass, 9 skipped (project-gated screenshots/precision)
```

## Cron UX (release hold resolved in branch)

- `nextRuns` runs in **`cron-worker.js`**; main thread shows running status + **取消搜索**.
- **366-day** window unchanged; errors unchanged; cancel terminates Worker (no silent truncate).
- Worst-case sparse search may take tens of seconds **in Worker** while UI remains interactive (see `cron-responsiveness.spec.js`).

## CI checkout identity

| Workflow | Checkout ref | Notes |
|----------|----------------|-------|
| `ci-toolbox.yml` | `github.event.pull_request.head.sha` | Step summary: `CHECKOUT_SHA`, `PR_HEAD_SHA`, `GITHUB_SHA` (merge ref) |
| `pages.yml` (PR) | default merge ref | deploy skipped; `GITHUB_SHA` is merge commit, not PR tip |

Do not infer byte-tested HEAD from API association alone — read Toolbox summary `CHECKOUT_SHA`.

## Screenshots (exact-head only)

Capture after final commit:

```sh
chmod +x scripts/capture-qa-screenshots.sh
ARTIFACT_DIR=/opt/cursor/artifacts ./scripts/capture-qa-screenshots.sh
```

Writes:

- `SOURCE_SHA_MANIFEST-<full-git-sha>.txt`
- `timestamp-utc-epoch0-desktop-1440-<full-sha>.png`
- `cron-utc-results-366-desktop-1440-<full-sha>.png`
- `cron-no-results-366-desktop-1440-<full-sha>.png`
- `cron-utc-selected-mobile-390-<full-sha>.png`

Local path: `/opt/cursor/artifacts/`. Do not reuse `21574fe` or `f526c2f` filenames for new heads.

## UTC / Cron test precision

- Timestamp: epoch `0` + `UTC` → `1970-01-01 00:00:00.000` wall + `1970-01-01T00:00:00.000Z`, counts `0`.
- Cron: Playwright clock `2023-12-31T23:00Z`, `0 0 1 1 *` → `2024-01-01 00:00:00 (UTC)`; `#cronZone` / `#tsDisplayZone` each have exactly one `UTC` option.