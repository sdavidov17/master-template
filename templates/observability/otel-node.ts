/**
 * OpenTelemetry Node.js Initialization
 *
 * Provides distributed tracing, metrics, and logging for Node.js applications.
 * Must be imported FIRST, before any other imports.
 *
 * Usage:
 *   // At the very top of your entry file (e.g., index.ts)
 *   import './otel';
 *
 * Environment Variables:
 *   OTEL_SERVICE_NAME - Name of your service (required)
 *   OTEL_EXPORTER_OTLP_ENDPOINT - OTLP endpoint (default: http://localhost:4318)
 *   OTEL_EXPORTER_OTLP_HEADERS - Headers for OTLP endpoint (optional)
 *   OTEL_LOG_LEVEL - Logging level (default: info)
 *   NODE_ENV - Environment (development/production)
 *
 * Installation:
 *   npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node \
 *     @opentelemetry/exporter-trace-otlp-http @opentelemetry/exporter-metrics-otlp-http \
 *     @opentelemetry/sdk-metrics @opentelemetry/resources @opentelemetry/semantic-conventions
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from '@opentelemetry/semantic-conventions';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// Configure diagnostic logging
const logLevel = process.env.OTEL_LOG_LEVEL?.toUpperCase() || 'INFO';
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel[logLevel as keyof typeof DiagLogLevel] || DiagLogLevel.INFO);

// Service metadata
const serviceName = process.env.OTEL_SERVICE_NAME || 'unknown-service';
const serviceVersion = process.env.npm_package_version || '0.0.0';
const environment = process.env.NODE_ENV || 'development';

// OTLP endpoint configuration
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const otlpHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS
  ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
  : {};

// Create resource with service information
const resource = new Resource({
  [ATTR_SERVICE_NAME]: serviceName,
  [ATTR_SERVICE_VERSION]: serviceVersion,
  [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: environment,
});

// Configure trace exporter
const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`,
  headers: otlpHeaders,
});

// Configure metrics exporter
const metricExporter = new OTLPMetricExporter({
  url: `${otlpEndpoint}/v1/metrics`,
  headers: otlpHeaders,
});

const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 60000, // Export metrics every 60 seconds
});

// Initialize the SDK
const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Customize auto-instrumentations
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable fs instrumentation (too noisy)
      },
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (request) => {
          // Ignore health check endpoints
          const url = request.url || '';
          return url.includes('/health') || url.includes('/ready') || url.includes('/live');
        },
      },
    }),
  ],
});

// Start the SDK
sdk.start();

// Graceful shutdown
const shutdown = async () => {
  try {
    await sdk.shutdown();
    console.log('OpenTelemetry SDK shut down successfully');
  } catch (error) {
    console.error('Error shutting down OpenTelemetry SDK:', error);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Export for manual instrumentation
export { sdk };

// Helper functions for custom spans and metrics
import { trace, metrics, SpanStatusCode, Span, Counter, Histogram } from '@opentelemetry/api';

const tracer = trace.getTracer(serviceName, serviceVersion);
const meter = metrics.getMeter(serviceName, serviceVersion);

/**
 * Create a custom span for manual instrumentation
 *
 * @example
 * await withSpan('processOrder', async (span) => {
 *   span.setAttribute('order.id', orderId);
 *   await processOrder(orderId);
 * });
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      if (attributes) {
        span.setAttributes(attributes);
      }
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Create a counter metric
 *
 * @example
 * const orderCounter = createCounter('orders.created', 'Number of orders created');
 * orderCounter.add(1, { region: 'us-east' });
 */
export function createCounter(name: string, description: string): Counter {
  return meter.createCounter(name, { description });
}

/**
 * Create a histogram metric
 *
 * @example
 * const latencyHistogram = createHistogram('http.request.duration', 'HTTP request duration in ms');
 * latencyHistogram.record(150, { endpoint: '/api/users' });
 */
export function createHistogram(name: string, description: string): Histogram {
  return meter.createHistogram(name, { description });
}

/**
 * Get current trace context for logging correlation
 *
 * @example
 * const { traceId, spanId } = getTraceContext();
 * logger.info({ traceId, spanId }, 'Processing request');
 */
export function getTraceContext(): { traceId: string; spanId: string } | null {
  const span = trace.getActiveSpan();
  if (!span) return null;

  const context = span.spanContext();
  return {
    traceId: context.traceId,
    spanId: context.spanId,
  };
}
