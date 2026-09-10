# Security policy

## Supported versions

Security fixes are provided for the latest published minor line. Consumers should run the latest patch in that line.

| Version | Supported |
| --- | --- |
| 0.3.x | Yes |
| 0.2.x | No |
| 0.1.x | No — migrate to 0.3.x |

See `MIGRATION.md` before upgrading applications still using 0.1.x.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Email security@noirstack.com with:

- the affected version and import path;
- a minimal reproduction;
- the expected and observed behavior;
- the potential impact.

We will acknowledge reports as quickly as practical and coordinate disclosure after a fix is available.

## Deployment responsibility

This package provides secure defaults, not a complete application security boundary. Consumers must configure trusted proxies, unique IP hashing salts, CSP directives for their own asset hosts, persistent rate-limit stores for multi-instance deployments, and redaction appropriate to their data.

### Proxy and client-IP trust

`X-Forwarded-For` is untrusted input unless the application is deployed behind a known proxy chain and explicitly enables `ipTracking.trustProxyHeaders`. Configure the framework's proxy trust boundary first; do not enable forwarded-header trust merely because the header is present.

For Cloudflare, Traefik, load balancers, or other multi-hop deployments, verify the complete proxy chain in the target environment before using forwarded client IPs for rate limiting, request correlation, or security decisions.

### IP data

Raw IP retention is disabled by default. If a consumer enables `storeRawIp`, that application is responsible for its retention, access, disclosure, and deletion requirements. Use a unique secret `hashSalt` per intended correlation boundary; do not rely on the compatibility fallback salt for production privacy controls.

### Rate limiting

The built-in memory limiter is process-local. Multi-instance or horizontally scaled deployments require a shared enforcement layer if rate limits are intended to operate across instances.

## Security releases

Security-relevant fixes should be documented in the release notes without publishing exploit details before affected consumers have a reasonable opportunity to update. A GitHub Security Advisory should be used for coordinated disclosure when appropriate.
