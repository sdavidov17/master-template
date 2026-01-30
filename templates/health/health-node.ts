/**
 * Health Check Endpoints for Node.js
 *
 * Provides Kubernetes-compatible health check endpoints:
 * - /health/live - Liveness probe (is the app alive?)
 * - /health/ready - Readiness probe (is the app ready to serve traffic?)
 * - /health/startup - Startup probe (has the app finished starting?)
 *
 * Features:
 * - Dependency health checks (database, cache, external services)
 * - Graceful degradation
 * - Configurable timeouts
 * - Detailed health information (optional)
 *
 * Usage with Express:
 *   import { healthRouter, registerCheck } from './health';
 *
 *   app.use('/health', healthRouter);
 *
 *   // Register custom checks
 *   registerCheck('database', async () => {
 *     await db.query('SELECT 1');
 *     return { status: 'healthy' };
 *   });
 *
 * Usage with Fastify:
 *   import { healthPlugin } from './health';
 *   app.register(healthPlugin);
 */

import { Router, Request, Response } from 'express';

// Health check result types
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version?: string;
  uptime: number;
  checks?: Record<string, HealthCheckResult>;
}

type HealthCheckFn = () => Promise<HealthCheckResult>;

// Configuration
const config = {
  version: process.env.npm_package_version || process.env.SERVICE_VERSION || '0.0.0',
  checkTimeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
  includeDetails: process.env.HEALTH_INCLUDE_DETAILS !== 'false',
};

// Track startup state
let isStarted = false;
const startTime = Date.now();

// Registered health checks
const checks = new Map<string, HealthCheckFn>();

/**
 * Register a health check
 *
 * @example
 * registerCheck('database', async () => {
 *   const start = Date.now();
 *   await db.query('SELECT 1');
 *   return {
 *     status: 'healthy',
 *     latencyMs: Date.now() - start,
 *   };
 * });
 */
export function registerCheck(name: string, check: HealthCheckFn): void {
  checks.set(name, check);
}

/**
 * Unregister a health check
 */
export function unregisterCheck(name: string): void {
  checks.delete(name);
}

/**
 * Mark the application as started (call after initialization)
 */
export function markStarted(): void {
  isStarted = true;
}

/**
 * Mark the application as not started (for graceful shutdown)
 */
export function markNotStarted(): void {
  isStarted = false;
}

/**
 * Run a health check with timeout
 */
async function runCheck(name: string, check: HealthCheckFn): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    const result = await Promise.race([
      check(),
      new Promise<HealthCheckResult>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), config.checkTimeout)
      ),
    ]);

    return {
      ...result,
      latencyMs: result.latencyMs ?? Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Run all registered health checks
 */
async function runAllChecks(): Promise<Record<string, HealthCheckResult>> {
  const results: Record<string, HealthCheckResult> = {};

  await Promise.all(
    Array.from(checks.entries()).map(async ([name, check]) => {
      results[name] = await runCheck(name, check);
    })
  );

  return results;
}

/**
 * Determine overall status from check results
 */
function getOverallStatus(results: Record<string, HealthCheckResult>): 'healthy' | 'unhealthy' | 'degraded' {
  const statuses = Object.values(results).map((r) => r.status);

  if (statuses.some((s) => s === 'unhealthy')) {
    return 'unhealthy';
  }
  if (statuses.some((s) => s === 'degraded')) {
    return 'degraded';
  }
  return 'healthy';
}

/**
 * Create health response
 */
function createResponse(
  status: 'healthy' | 'unhealthy' | 'degraded',
  checks?: Record<string, HealthCheckResult>
): HealthResponse {
  const response: HealthResponse = {
    status,
    timestamp: new Date().toISOString(),
    version: config.version,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };

  if (config.includeDetails && checks) {
    response.checks = checks;
  }

  return response;
}

// Express Router
export const healthRouter = Router();

/**
 * Liveness probe - Is the application alive?
 * Returns 200 if the process is running.
 * Failing this probe causes the container to be restarted.
 */
healthRouter.get('/live', (_req: Request, res: Response) => {
  const response = createResponse('healthy');
  res.status(200).json(response);
});

/**
 * Readiness probe - Is the application ready to serve traffic?
 * Returns 200 if all dependencies are healthy.
 * Failing this probe removes the pod from the service load balancer.
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const results = await runAllChecks();
  const status = getOverallStatus(results);
  const response = createResponse(status, results);

  const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
  res.status(httpStatus).json(response);
});

/**
 * Startup probe - Has the application finished starting?
 * Returns 200 once initialization is complete.
 * Failing this probe prevents liveness/readiness checks from running.
 */
healthRouter.get('/startup', (_req: Request, res: Response) => {
  if (isStarted) {
    const response = createResponse('healthy');
    res.status(200).json(response);
  } else {
    const response = createResponse('unhealthy');
    response.checks = {
      startup: {
        status: 'unhealthy',
        message: 'Application is still starting',
      },
    };
    res.status(503).json(response);
  }
});

/**
 * Combined health endpoint (for simpler setups)
 */
healthRouter.get('/', async (_req: Request, res: Response) => {
  if (!isStarted) {
    const response = createResponse('unhealthy');
    response.checks = { startup: { status: 'unhealthy', message: 'Starting' } };
    return res.status(503).json(response);
  }

  const results = await runAllChecks();
  const status = getOverallStatus(results);
  const response = createResponse(status, results);

  const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
  res.status(httpStatus).json(response);
});

// Fastify plugin
export async function healthPlugin(fastify: any) {
  fastify.get('/health/live', async () => createResponse('healthy'));

  fastify.get('/health/ready', async (request: any, reply: any) => {
    const results = await runAllChecks();
    const status = getOverallStatus(results);
    const response = createResponse(status, results);

    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
    reply.status(httpStatus).send(response);
  });

  fastify.get('/health/startup', async (request: any, reply: any) => {
    if (isStarted) {
      return createResponse('healthy');
    }
    reply.status(503).send(createResponse('unhealthy'));
  });

  fastify.get('/health', async (request: any, reply: any) => {
    if (!isStarted) {
      reply.status(503).send(createResponse('unhealthy'));
      return;
    }

    const results = await runAllChecks();
    const status = getOverallStatus(results);
    const response = createResponse(status, results);

    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
    reply.status(httpStatus).send(response);
  });
}

// Common health check implementations

/**
 * Database health check
 */
export function createDatabaseCheck(queryFn: () => Promise<void>): HealthCheckFn {
  return async () => {
    const start = Date.now();
    await queryFn();
    return {
      status: 'healthy',
      latencyMs: Date.now() - start,
    };
  };
}

/**
 * Redis/cache health check
 */
export function createCacheCheck(pingFn: () => Promise<string>): HealthCheckFn {
  return async () => {
    const start = Date.now();
    const result = await pingFn();
    return {
      status: result === 'PONG' ? 'healthy' : 'degraded',
      latencyMs: Date.now() - start,
    };
  };
}

/**
 * External service health check
 */
export function createExternalServiceCheck(url: string): HealthCheckFn {
  return async () => {
    const start = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(config.checkTimeout),
    });
    return {
      status: response.ok ? 'healthy' : 'degraded',
      latencyMs: Date.now() - start,
      details: { statusCode: response.status },
    };
  };
}

/**
 * Memory usage check
 */
export function createMemoryCheck(thresholdPercent = 90): HealthCheckFn {
  return async () => {
    const used = process.memoryUsage();
    const heapPercent = (used.heapUsed / used.heapTotal) * 100;

    return {
      status: heapPercent < thresholdPercent ? 'healthy' : 'degraded',
      details: {
        heapUsedMB: Math.round(used.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(used.heapTotal / 1024 / 1024),
        heapPercent: Math.round(heapPercent),
      },
    };
  };
}
