import { randomUUID } from 'crypto';

export type LogLevel = 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

function baseLog(level: LogLevel, message: string, context: LogContext = {}) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };
  // Structured log to stdout
  console.log(JSON.stringify(entry));
}

export function getCorrelationId(headers: Headers) {
  return headers.get('x-correlation-id') || randomUUID();
}

export const logger = {
  info: (message: string, context?: LogContext) => baseLog('info', message, context),
  warn: (message: string, context?: LogContext) => baseLog('warn', message, context),
  error: (message: string, context?: LogContext) => baseLog('error', message, context),
};

export function captureError(err: unknown, context: LogContext = {}) {
  logger.error('error', { error: serializeError(err), ...context });
}

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}
