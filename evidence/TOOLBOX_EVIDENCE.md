# Toolbox evidence

**Baseline SHA:** `9691cbe026a7a42a9cde0ba08334c2e844cba908`

**Tested code Head:** `f526c2f57a4ba8e45c34e8188806e361bd56d0f0` (run commands after checking out this commit).

## Commands and results (local agent run)

```sh
npm test
# 51 tests, 51 pass, 0 fail (~30s; leap-year cron scan dominates)

npm run build
# vite build OK

node scripts/static-routes.test.mjs
# static-routes: ok (Pages base /json-workbench/, no SPA fallback)

ARTIFACT_DIR=/opt/cursor/artifacts TESTED_HEAD_SHA=$(git rev-parse HEAD) npm run test:browser
# 14 tests, 12 passed, 2 skipped (project-gated screenshot specs), 0 failed (~15s)
```

### Playwright server

- **No Vite preview fallback.** `playwright.config.js` boots `PORT=5299 node scripts/pages-static-server.mjs` after `npm run build`.
- Browser **base URL:** `http://127.0.0.1:5299/json-workbench/` (explicit hash tradeoff).

### Viewports / screenshots (local only)

| File | Viewport | Notes |
|------|----------|--------|
| `home-nav-desktop-1440-<sha7>.png` | 1440×900 | `#home` |
| `jwt-warning-desktop-1440-<sha7>.png` | 1440×900 | decoded synthetic JWT + banner |
| `cron-results-desktop-1440-<sha7>.png` | 1440×900 | `0 9 * * 1-5` + Asia/Shanghai output |
| `jwt-warning-mobile-390-<sha7>.png` | 390×844 | mobile JWT warning |

Paths under `/opt/cursor/artifacts/` on the agent VM (not deployed).

### Skips rationale

- `screenshots.spec.js` desktop block skipped on **mobile** project (and vice versa) — intentional per-project filenames, avoids race/overwrite.

## Cron semantics / limitations

- DOM/DOW **OR** when both fields are constrained (not `*`/`?`).
- `?` wildcard on DOM or DOW supported.
- Feb 30/31 with month `2` rejected at parse (`不可满足`).
- DST **spring gap** for timestamps: `America/New_York` 02:30 on spring-forward day rejected in `timestamp.js`.
- Cron preview uses **minute resolution** in zone; ambiguous **folded** local hour during fall-back is not expanded to multiple occurrences (documented limitation).

## Privacy / regex instrumentation

- `html[data-active-tool]` per route.
- `html[data-regex-worker-generation]` / `data-regex-worker-phase` (`running` / `terminated` / `idle`).
- Regex Worker posts `lifecycle: started` before work (main thread ignores for output).

## Known limitations

- Cron subset: no `MON`, `L`, `W`, `#`.
- Impossible schedules beyond Feb 30/31 may scan up to 366 days before error.
- SHA vectors use Web Crypto (Node `crypto` cross-check for `abc`).