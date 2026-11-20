# Toolbox evidence

**Baseline SHA:** `9691cbe026a7a42a9cde0ba08334c2e844cba908`

**PR head (this closure):** `02940b8eebf65a1e5761d57e96b7c06f8b4414b4`

## Test counts (exact-head local runs)

Run on **PR head commit** (`git checkout <PR_HEAD_SHA>`), not GitHub merge ref alone.

```sh
npm test
# 54 unit/integration tests (as of QA closure commits)

npm run build && node scripts/static-routes.test.mjs
# static-routes: ok

PR_HEAD_SHA=$(git rev-parse HEAD) ARTIFACT_DIR=/opt/cursor/artifacts npm run test:browser
# 18 Playwright cases → 16 executed per full run (2 project-gated screenshot skips), 0 failures
# Strengthened assertions in privacy/static/cron-utc suites (independent QA: 64+ checks)
```

## CI identity (Toolbox)

- **`ci-toolbox.yml`** checks out **`github.event.pull_request.head.sha`** (PR branch tip).
- **`pages.yml`** on PR still uses default merge ref (`GITHUB_SHA`); deploy job skipped on PR.
- Step summary records: `CHECKOUT_SHA`, `PR_HEAD_SHA`, `GITHUB_SHA` (merge ref).

## Screenshots

| Artifact | Viewport | When |
|----------|----------|------|
| `*-f526c2f.png` | 1440 / 390 | UI baseline from earlier head; still valid for unchanged chrome |
| `cron-366-no-results-desktop-1440-<sha7>.png` | 1440×900 | Cron 366 disclosure + window error |
| `utc-timestamp-cron-desktop-1440-<sha7>.png` | 1440×900 | UTC selected + outputs |
| `utc-cron-mobile-390-<sha7>.png` | 390×844 | Cron UTC selected (mobile) |

Local only under `/opt/cursor/artifacts/` unless CI copies to `/tmp/artifacts`.

## Cron / timezone notes

- Preview searches **366 calendar days** from now (minute steps); UI `#cronWindowNote` + `CRON_SEMANTICS`.
- Insufficient results: error states window limit, not “never runs”.
- `listTimeZones()` always includes **UTC** (even if `Intl.supportedValuesOf` omits it).

## Known limitations

- Cron: no `MON`, `L`, `W`, `#`; fold shows two UTC rows with same local label.
- Privacy tests: address-bar share only; GET asset allowlist.