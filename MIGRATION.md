# Migrating from 0.1.x to 0.3.x

Web Foundation 0.3.x should be adopted as a controlled application migration rather than a fleet-wide dependency edit. Applications on 0.1.x may rely on older request-IP, proxy, security, rate-limit, logging, SEO, or package-resolution behavior.

## Recommended sequence

1. Update one application at a time to `@noirstack/web-foundation@^0.3.0` and regenerate its lockfile.
2. Run the application's type checks, unit/integration tests, build, and route smoke tests.
3. Verify security headers, authentication callbacks, canonical redirects, robots/sitemap routes, health checks, request logging, and rate limiting.
4. Verify client-IP behavior through the application's real proxy chain before enabling forwarded-header trust.
5. Deploy through the application's normal release path and verify production telemetry before moving to the next consumer.

## Forwarded headers and client IPs

Web Foundation does not trust `X-Forwarded-For` by default. This prevents an internet client from selecting the IP used for request metadata or IP-keyed rate limiting simply by sending a forged header.

Applications behind a known reverse proxy must configure trust in both places:

```ts
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

const config = createWebFoundation({
  // ...
  ipTracking: {
    enabled: true,
    trustProxyHeaders: true,
    hashSalt: process.env.WEB_FOUNDATION_IP_HASH_SALT,
    storeRawIp: false,
    botScoring: true,
  },
});
```

The example trust policy is not universal. Configure Express for the actual trusted proxy network. Do not enable `trustProxyHeaders` merely because the application receives `X-Forwarded-For`.

## IP data

Use a unique secret hash salt in production. Raw IP storage remains opt-in and should only be enabled where the application has an explicit operational requirement and appropriate retention controls.

## Request telemetry

The Express adapter exposes normalized request-log data through `onRequestLog`. Consumers that forward observations to another service should keep transport-specific code outside the middleware primitives so Web Foundation remains the shared request-observation boundary.

## Compatibility verification

At minimum, verify these behaviors after migration:

- package root and every subpath import used by the application;
- Express middleware order;
- authentication and OIDC callback routes;
- security headers and CSP exceptions required by the application;
- client IP and IP hash behind the production proxy chain;
- IP-keyed and user-keyed rate limits;
- request log fields and trace IDs;
- `/health`, `/robots.txt`, and sitemap endpoints;
- canonical redirects and application-specific exclusions.

Do not assume a successful build proves proxy or request-security behavior. Those checks require requests through the deployed proxy path.
