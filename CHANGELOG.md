# Changelog

All notable changes to `@noirstack/web-foundation` are documented here.

## 0.3.1 — 2026-09-10

### Security and request handling

- Forwarded client-IP headers are no longer trusted by the public `extractClientIp()` helper unless proxy-header trust is explicitly enabled.
- Added regression coverage for trusted and untrusted `X-Forwarded-For` handling.
- Expanded security guidance for trusted proxy chains, raw IP retention, hashing salts, and multi-instance rate limiting.

### Package compatibility

- Added `default` export conditions to the root and supported subpath exports for broader ESM resolver compatibility.

### Migration

- Added `MIGRATION.md` for applications moving from the 0.1.x line to the current 0.3.x baseline.
- Migration guidance requires application-level verification of proxy trust, authentication ordering, rate limiting, telemetry, health, robots, sitemap, and canonical routing before fleet rollout.

### Publishing and CI

- Publishing now uses npm Trusted Publishing (OIDC) from GitHub Actions; the `NPM_TOKEN` secret is no longer used.
- GitLab is the primary CI/build authority and mirrors source to GitHub; the GitHub mirror only runs the npm publish workflow.

## 0.3.0

Current 0.3.x baseline for the shared Noir Stack web foundation, including framework-neutral web infrastructure, Express middleware, SEO and structured-data utilities, performance/RUM support, audit tooling, media optimization, and content-quality capabilities.

## Release policy

The npm package is published as `@noirstack/web-foundation`. GitHub Releases should use matching semantic-version tags (for example, `v0.3.1`) and summarize security-relevant behavior changes and migration requirements. Consumers should pin or lock package versions and promote upgrades deliberately rather than treating a shared-foundation release as an automatic fleet migration.
