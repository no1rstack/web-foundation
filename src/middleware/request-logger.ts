import type { LoggingConfig, RequestMetadata } from '../types.js';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: Record<string, unknown>;
}

export type LogHandler = (entry: LogEntry) => void;

let logHandler: LogHandler = (entry: LogEntry) => {
  const line = `${entry.timestamp} [${entry.level}] ${entry.message}`;
  if (entry.level === 'error') {
    console.error(line, entry.data || '');
  } else if (entry.level === 'warn') {
    console.warn(line, entry.data || '');
  } else {
    console.log(line, entry.data || '');
  }
};

export function setLogHandler(handler: LogHandler): void {
  logHandler = handler;
}

export function log(level: string, message: string, data?: Record<string, unknown>): void {
  logHandler({
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
  });
}

export function shouldLogPath(path: string, config?: LoggingConfig): boolean {
  if (!config?.requestLogging) return false;

  const skipPaths = config.skipPaths || [
    '/health',
    '/assets/',
    '/@vite/',
    '/@fs/',
    '/favicon.ico',
  ];

  return !skipPaths.some((skip) => path.startsWith(skip));
}

export interface RequestLogData {
  method: string;
  path: string;
  queryString?: string;
  statusCode: number;
  responseTimeMs: number;
  metadata?: RequestMetadata;
  traceId?: string;
}

export function logRequest(data: RequestLogData, config?: LoggingConfig): void {
  if (!config?.requestLogging) return;

  const logData: Record<string, unknown> = {
    method: data.method,
    path: data.path,
    statusCode: data.statusCode,
    responseTimeMs: data.responseTimeMs,
  };

  if (config.traceHeaders && data.traceId) {
    logData.traceId = data.traceId;
  }

  if (data.metadata) {
    if (data.metadata.ipHash) logData.ipHash = data.metadata.ipHash;
    if (data.metadata.botScore !== undefined) logData.botScore = data.metadata.botScore;
    if (data.metadata.geo?.country) logData.country = data.metadata.geo.country;
  }

  if (data.statusCode >= 400) {
    if (data.statusCode >= 500) {
      log('error', `HTTP ${data.statusCode} ${data.method} ${data.path}`, logData);
    } else {
      log('warn', `HTTP ${data.statusCode} ${data.method} ${data.path}`, logData);
    }
  } else if (config.level === 'debug') {
    log('debug', `HTTP ${data.statusCode} ${data.method} ${data.path}`, logData);
  }
}

export function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}
