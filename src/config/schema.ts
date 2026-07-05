import type { WebFoundationConfig } from '../types.js';

export function validateSchema(config: WebFoundationConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.app) {
    errors.push('config.app is required');
  } else {
    if (!config.app.name) errors.push('config.app.name is required');
    if (!config.app.slug) errors.push('config.app.slug is required');
    if (!config.app.baseUrl) errors.push('config.app.baseUrl is required');
    if (!config.app.brandName) errors.push('config.app.brandName is required');
    if (!config.app.defaultTitle) errors.push('config.app.defaultTitle is required');
    if (!config.app.defaultDescription) errors.push('config.app.defaultDescription is required');

    if (config.app.slug && !/^[a-z0-9-]+$/.test(config.app.slug)) {
      errors.push('config.app.slug must contain only lowercase alphanumeric characters and hyphens');
    }
  }

  const validEnvs = ['development', 'test', 'preview', 'staging', 'production'];
  if (config.environment && !validEnvs.includes(config.environment)) {
    errors.push(`config.environment must be one of: ${validEnvs.join(', ')}`);
  }

  if (config.quality?.scoreThreshold !== undefined) {
    if (config.quality.scoreThreshold < 0 || config.quality.scoreThreshold > 100) {
      errors.push('config.quality.scoreThreshold must be between 0 and 100');
    }
  }

  return { valid: errors.length === 0, errors };
}
