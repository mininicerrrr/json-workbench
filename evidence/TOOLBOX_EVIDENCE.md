# Toolbox expansion evidence (generated in agent run)

Baseline: `9691cbe026a7a42a9cde0ba08334c2e844cba908`

## Commands

```sh
npm test
npm run build
node scripts/static-routes.test.mjs
ARTIFACT_DIR=/opt/cursor/artifacts npm run test:browser
```

## Routing

Hash-only routes (`#compare`, `#jwt`, …): compatible with GitHub Pages project site `base: /json-workbench/` without SPA history fallback. Tradeoff: URLs expose tool id in hash only; no deep SEO per tool on server (title/description updated client-side).

## Screenshots (local)

See `/opt/cursor/artifacts/jwt-warning-desktop.png`, `jwt-warning-mobile.png`, `cron-desktop.png`.