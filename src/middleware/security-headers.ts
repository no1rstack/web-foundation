import type { SecurityConfig } from '../types.js';

const PRODUCTION_DEFAULTS: SecurityConfig = {
  contentSecurityPolicy:
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'self';",
  frameOptions: 'SAMEORIGIN',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  contentTypeOptions: 'nosniff',
};

const STAGING_DEFAULTS: SecurityConfig = {
  ...PRODUCTION_DEFAULTS,
  hsts: false,
};

const DEVELOPMENT_DEFAULTS: SecurityConfig = {
  frameOptions: 'SAMEORIGIN',
  contentTypeOptions: 'nosniff',
  hsts: false,
};

const ENV_DEFAULTS: Record<string, SecurityConfig> = {
  production: PRODUCTION_DEFAULTS,
  staging: STAGING_DEFAULTS,
  preview: STAGING_DEFAULTS,
  test: DEVELOPMENT_DEFAULTS,
  development: DEVELOPMENT_DEFAULTS,
};

export function resolveSecurityConfig(
  config?: SecurityConfig,
  environment: string = 'production'
): SecurityConfig {
  const base = { ...(ENV_DEFAULTS[environment] || PRODUCTION_DEFAULTS) };
  if (!config) return base;

  const merged = { ...base, ...config };

  if (config.environmentRelaxations?.[environment]) {
    Object.assign(merged, config.environmentRelaxations[environment]);
  }

  return merged;
}

export function applySecurityHeaders(
  res: { setHeader: (name: string, value: string) => void },
  config: SecurityConfig
): void {
  if (config.contentSecurityPolicy) {
    res.setHeader('Content-Security-Policy', config.contentSecurityPolicy);
  }
  if (config.frameOptions) {
    res.setHeader('X-Frame-Options', config.frameOptions);
  }
  if (config.referrerPolicy) {
    res.setHeader('Referrer-Policy', config.referrerPolicy);
  }
  if (config.permissionsPolicy) {
    res.setHeader('Permissions-Policy', config.permissionsPolicy);
  }
  if (config.hsts) {
    const parts = [`max-age=${config.hsts.maxAge}`];
    if (config.hsts.includeSubDomains) parts.push('includeSubDomains');
    if (config.hsts.preload) parts.push('preload');
    res.setHeader('Strict-Transport-Security', parts.join('; '));
  }
  if (config.contentTypeOptions) {
    res.setHeader('X-Content-Type-Options', config.contentTypeOptions);
  }
  if (config.xssProtection !== false) {
    res.setHeader('X-XSS-Protection', '0');
  }
}
