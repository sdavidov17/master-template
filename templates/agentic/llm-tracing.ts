/**
 * LLM Observability and Tracing
 *
 * Provides comprehensive tracing and monitoring for LLM-based applications.
 * Integrates with OpenTelemetry for distributed tracing.
 *
 * Features:
 * - Request/response logging
 * - Token usage tracking
 * - Latency measurement
 * - Error tracking
 * - Cost estimation
 * - Prompt versioning support
 *
 * Installation:
 *   npm install openai @opentelemetry/api
 *
 * Usage:
 *   import { tracedLLM, LLMTracer } from './llm-tracing';
 *
 *   const tracer = new LLMTracer({ serviceName: 'my-agent' });
 *   const response = await tracer.trace('generate', () =>
 *     openai.chat.completions.create({ ... })
 *   );
 */

import { trace, Span, SpanStatusCode, context } from '@opentelemetry/api';
import crypto from 'crypto';

// Types
interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  content: string | null;
  name?: string;
  function_call?: unknown;
  tool_calls?: unknown[];
}

interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  tools?: unknown[];
  functions?: unknown[];
  [key: string]: unknown;
}

interface LLMResponse {
  id: string;
  model: string;
  choices: Array<{
    message: LLMMessage;
    finish_reason: string;
    index: number;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface LLMTraceConfig {
  serviceName: string;
  logPrompts?: boolean; // Default: false in production
  logResponses?: boolean; // Default: false in production
  sampleRate?: number; // 0-1, default: 1 (100%)
  costPerToken?: {
    input: number;
    output: number;
  };
  onTrace?: (trace: LLMTraceData) => void | Promise<void>;
}

interface LLMTraceData {
  traceId: string;
  spanId: string;
  operation: string;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCost: number;
  status: 'success' | 'error';
  error?: string;
  metadata?: Record<string, unknown>;
  promptHash?: string;
  responseHash?: string;
}

// Model pricing (USD per 1K tokens, as of 2024)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-32k': { input: 0.06, output: 0.12 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'claude-3.5-sonnet': { input: 0.003, output: 0.015 },
};

/**
 * LLM Tracer for comprehensive observability
 */
export class LLMTracer {
  private tracer;
  private config: LLMTraceConfig;
  private isProduction: boolean;

  constructor(config: LLMTraceConfig) {
    this.config = {
      logPrompts: false,
      logResponses: false,
      sampleRate: 1,
      ...config,
    };
    this.tracer = trace.getTracer(config.serviceName);
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Trace an LLM operation
   */
  async trace<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    // Check sampling
    if (Math.random() > (this.config.sampleRate ?? 1)) {
      return fn();
    }

    return this.tracer.startActiveSpan(`llm.${operation}`, async (span: Span) => {
      const startTime = Date.now();

      try {
        const result = await fn();
        const latencyMs = Date.now() - startTime;

        // Extract trace data if result is an LLM response
        if (this.isLLMResponse(result)) {
          await this.recordLLMTrace(span, operation, result, latencyMs, metadata);
        }

        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        const latencyMs = Date.now() - startTime;

        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error as Error);

        // Record error trace
        await this.recordErrorTrace(span, operation, error, latencyMs, metadata);

        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Trace a chat completion request
   */
  async traceChat(
    request: LLMRequest,
    fn: () => Promise<LLMResponse>,
    metadata?: Record<string, unknown>
  ): Promise<LLMResponse> {
    return this.tracer.startActiveSpan('llm.chat', async (span: Span) => {
      const startTime = Date.now();

      // Set request attributes
      span.setAttribute('llm.model', request.model);
      span.setAttribute('llm.temperature', request.temperature ?? 1);
      span.setAttribute('llm.max_tokens', request.max_tokens ?? -1);
      span.setAttribute('llm.message_count', request.messages.length);

      // Hash prompt for versioning (don't log actual content in production)
      const promptHash = this.hashContent(JSON.stringify(request.messages));
      span.setAttribute('llm.prompt_hash', promptHash);

      // Log prompts in development only
      if (this.config.logPrompts && !this.isProduction) {
        span.setAttribute('llm.prompt', JSON.stringify(request.messages));
      }

      try {
        const response = await fn();
        const latencyMs = Date.now() - startTime;

        await this.recordLLMTrace(span, 'chat', response, latencyMs, {
          ...metadata,
          promptHash,
          request: this.config.logPrompts ? request : undefined,
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return response;
      } catch (error) {
        const latencyMs = Date.now() - startTime;

        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error as Error);

        await this.recordErrorTrace(span, 'chat', error, latencyMs, {
          ...metadata,
          promptHash,
        });

        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Record LLM trace data
   */
  private async recordLLMTrace(
    span: Span,
    operation: string,
    response: LLMResponse,
    latencyMs: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const usage = response.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    // Calculate cost
    const pricing = this.config.costPerToken ?? MODEL_PRICING[response.model] ?? { input: 0, output: 0 };
    const estimatedCost =
      (usage.prompt_tokens * pricing.input + usage.completion_tokens * pricing.output) / 1000;

    // Set span attributes
    span.setAttribute('llm.model', response.model);
    span.setAttribute('llm.prompt_tokens', usage.prompt_tokens);
    span.setAttribute('llm.completion_tokens', usage.completion_tokens);
    span.setAttribute('llm.total_tokens', usage.total_tokens);
    span.setAttribute('llm.latency_ms', latencyMs);
    span.setAttribute('llm.estimated_cost_usd', estimatedCost);
    span.setAttribute('llm.finish_reason', response.choices[0]?.finish_reason ?? 'unknown');

    // Log response in development only
    if (this.config.logResponses && !this.isProduction) {
      span.setAttribute('llm.response', JSON.stringify(response.choices[0]?.message));
    }

    // Create trace data
    const spanContext = span.spanContext();
    const traceData: LLMTraceData = {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      operation,
      model: response.model,
      provider: this.detectProvider(response.model),
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      latencyMs,
      estimatedCost,
      status: 'success',
      metadata,
      responseHash: this.hashContent(JSON.stringify(response.choices[0]?.message)),
    };

    // Call custom trace handler
    if (this.config.onTrace) {
      await this.config.onTrace(traceData);
    }
  }

  /**
   * Record error trace
   */
  private async recordErrorTrace(
    span: Span,
    operation: string,
    error: unknown,
    latencyMs: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    span.setAttribute('llm.latency_ms', latencyMs);
    span.setAttribute('llm.error', errorMessage);

    const spanContext = span.spanContext();
    const traceData: LLMTraceData = {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      operation,
      model: 'unknown',
      provider: 'unknown',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      latencyMs,
      estimatedCost: 0,
      status: 'error',
      error: errorMessage,
      metadata,
    };

    if (this.config.onTrace) {
      await this.config.onTrace(traceData);
    }
  }

  /**
   * Check if result is an LLM response
   */
  private isLLMResponse(result: unknown): result is LLMResponse {
    return (
      typeof result === 'object' &&
      result !== null &&
      'choices' in result &&
      Array.isArray((result as any).choices)
    );
  }

  /**
   * Detect provider from model name
   */
  private detectProvider(model: string): string {
    if (model.startsWith('gpt')) return 'openai';
    if (model.startsWith('claude')) return 'anthropic';
    if (model.startsWith('gemini')) return 'google';
    if (model.startsWith('llama')) return 'meta';
    if (model.startsWith('mistral')) return 'mistral';
    return 'unknown';
  }

  /**
   * Hash content for versioning without storing actual content
   */
  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }
}

/**
 * Create a traced wrapper for OpenAI client
 */
export function createTracedOpenAI(openai: any, config: LLMTraceConfig) {
  const tracer = new LLMTracer(config);

  return new Proxy(openai, {
    get(target, prop) {
      if (prop === 'chat') {
        return new Proxy(target.chat, {
          get(chatTarget, chatProp) {
            if (chatProp === 'completions') {
              return new Proxy(chatTarget.completions, {
                get(compTarget, compProp) {
                  if (compProp === 'create') {
                    return async (request: LLMRequest) => {
                      return tracer.traceChat(request, () => compTarget.create(request));
                    };
                  }
                  return compTarget[compProp as keyof typeof compTarget];
                },
              });
            }
            return chatTarget[chatProp as keyof typeof chatTarget];
          },
        });
      }
      return target[prop as keyof typeof target];
    },
  });
}

/**
 * Metrics aggregator for LLM usage
 */
export class LLMMetricsAggregator {
  private metrics: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    errorCount: number;
    latencySum: number;
    byModel: Map<string, { requests: number; tokens: number; cost: number }>;
  };

  constructor() {
    this.metrics = {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      errorCount: 0,
      latencySum: 0,
      byModel: new Map(),
    };
  }

  record(trace: LLMTraceData): void {
    this.metrics.totalRequests++;
    this.metrics.totalTokens += trace.totalTokens;
    this.metrics.totalCost += trace.estimatedCost;
    this.metrics.latencySum += trace.latencyMs;

    if (trace.status === 'error') {
      this.metrics.errorCount++;
    }

    // Track by model
    const modelMetrics = this.metrics.byModel.get(trace.model) ?? {
      requests: 0,
      tokens: 0,
      cost: 0,
    };
    modelMetrics.requests++;
    modelMetrics.tokens += trace.totalTokens;
    modelMetrics.cost += trace.estimatedCost;
    this.metrics.byModel.set(trace.model, modelMetrics);
  }

  getSummary() {
    return {
      totalRequests: this.metrics.totalRequests,
      totalTokens: this.metrics.totalTokens,
      totalCostUSD: this.metrics.totalCost.toFixed(4),
      errorRate: (this.metrics.errorCount / this.metrics.totalRequests || 0).toFixed(4),
      avgLatencyMs: (this.metrics.latencySum / this.metrics.totalRequests || 0).toFixed(2),
      byModel: Object.fromEntries(this.metrics.byModel),
    };
  }

  reset(): void {
    this.metrics = {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      errorCount: 0,
      latencySum: 0,
      byModel: new Map(),
    };
  }
}

export { MODEL_PRICING };
export type { LLMTraceConfig, LLMTraceData, LLMRequest, LLMResponse, LLMMessage };
