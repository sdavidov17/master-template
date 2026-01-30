/**
 * Structured JSON Logging for Node.js
 *
 * Provides structured logging with OpenTelemetry trace correlation,
 * consistent JSON format, and configurable log levels.
 *
 * Features:
 * - JSON structured output for production
 * - Pretty-printed output for development
 * - Automatic trace/span ID correlation
 * - Request ID tracking
 * - Safe error serialization
 * - Child loggers with context
 *
 * Usage:
 *   import { logger } from './logger';
 *
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('Database error', { error: err, query: 'SELECT...' });
 *
 * Environment Variables:
 *   LOG_LEVEL - Logging level (default: info)
 *   NODE_ENV - Environment (development enables pretty printing)
 *   SERVICE_NAME - Service name for logs (default: app)
 *
 * Installation:
 *   npm install pino pino-pretty
 */

import pino, { Logger, LoggerOptions } from 'pino';
import { trace } from '@opentelemetry/api';

// Configuration from environment
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const SERVICE_NAME = process.env.SERVICE_NAME || process.env.OTEL_SERVICE_NAME || 'app';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Log levels for reference
export const LogLevel = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
} as const;

/**
 * Safe error serialization
 */
function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error as Error & { code?: string; statusCode?: number }),
    };
  }
  return { message: String(error) };
}

/**
 * Get OpenTelemetry trace context
 */
function getTraceContext(): { traceId?: string; spanId?: string } {
  const span = trace.getActiveSpan();
  if (!span) return {};

  const context = span.spanContext();
  return {
    traceId: context.traceId,
    spanId: context.spanId,
  };
}

// Pino configuration
const pinoConfig: LoggerOptions = {
  level: LOG_LEVEL,
  base: {
    service: SERVICE_NAME,
    env: process.env.NODE_ENV || 'development',
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      service: bindings.service,
      env: bindings.env,
      pid: bindings.pid,
      hostname: bindings.hostname,
    }),
  },
  // Add trace context to every log
  mixin() {
    return getTraceContext();
  },
  // Custom serializers
  serializers: {
    err: serializeError,
    error: serializeError,
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      headers: {
        'user-agent': req.headers?.['user-agent'],
        'content-type': req.headers?.['content-type'],
        'x-request-id': req.headers?.['x-request-id'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: {
        'content-type': res.headers?.['content-type'],
        'content-length': res.headers?.['content-length'],
      },
    }),
  },
};

// Use pretty printing in development
const transport = IS_DEVELOPMENT
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

// Create base logger
const baseLogger = pino({
  ...pinoConfig,
  transport,
});

/**
 * Extended logger interface with helper methods
 */
export interface AppLogger extends Logger {
  /**
   * Create a child logger with additional context
   */
  child(bindings: Record<string, unknown>): AppLogger;

  /**
   * Create a request-scoped logger
   */
  forRequest(requestId: string, userId?: string): AppLogger;

  /**
   * Log with timing information
   */
  timed<T>(label: string, fn: () => T | Promise<T>, meta?: Record<string, unknown>): Promise<T>;
}

/**
 * Create an extended logger
 */
function createLogger(base: Logger): AppLogger {
  const extended = base as AppLogger;

  // Override child to return extended logger
  const originalChild = extended.child.bind(extended);
  extended.child = (bindings: Record<string, unknown>) => {
    return createLogger(originalChild(bindings));
  };

  // Add forRequest helper
  extended.forRequest = (requestId: string, userId?: string) => {
    return extended.child({
      requestId,
      ...(userId && { userId }),
    });
  };

  // Add timed helper
  extended.timed = async <T>(
    label: string,
    fn: () => T | Promise<T>,
    meta?: Record<string, unknown>
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = Math.round(performance.now() - start);
      extended.info({ ...meta, duration, label }, `${label} completed`);
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      extended.error({ ...meta, duration, label, error }, `${label} failed`);
      throw error;
    }
  };

  return extended;
}

// Export configured logger
export const logger = createLogger(baseLogger);

/**
 * Express/Connect middleware for request logging
 *
 * Usage:
 *   app.use(requestLogger());
 */
export function requestLogger() {
  return (req: any, res: any, next: () => void) => {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    const start = performance.now();

    // Attach logger to request
    req.log = logger.forRequest(requestId, req.user?.id);
    req.requestId = requestId;

    // Set request ID header on response
    res.setHeader('x-request-id', requestId);

    // Log request
    req.log.info({ req }, 'Request started');

    // Log response on finish
    res.on('finish', () => {
      const duration = Math.round(performance.now() - start);
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      req.log[level](
        {
          res,
          duration,
          statusCode: res.statusCode,
        },
        'Request completed'
      );
    });

    next();
  };
}

/**
 * Error logging helper
 *
 * Usage:
 *   try {
 *     await riskyOperation();
 *   } catch (error) {
 *     logError(logger, error, 'Operation failed', { context: 'data' });
 *     throw error;
 *   }
 */
export function logError(
  log: Logger,
  error: unknown,
  message: string,
  context?: Record<string, unknown>
): void {
  log.error(
    {
      error: serializeError(error),
      ...context,
    },
    message
  );
}

// Default export for convenience
export default logger;
