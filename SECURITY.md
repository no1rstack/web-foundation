# Security policy

## Supported versions

Only the latest published minor release receives security fixes.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Email security@noirstack.com with:

- the affected version and import path;
- a minimal reproduction;
- the expected and observed behavior;
- the potential impact.

We will acknowledge reports as quickly as practical and coordinate disclosure after a fix is available.

## Deployment responsibility

This package provides secure defaults, not a complete application security boundary. Consumers must configure trusted proxies, unique IP hashing salts, CSP directives for their own asset hosts, persistent rate-limit stores for multi-instance deployments, and redaction appropriate to their data.
