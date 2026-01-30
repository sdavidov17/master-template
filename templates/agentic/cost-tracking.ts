/**
 * LLM Cost Tracking and Budget Management
 *
 * Provides comprehensive cost tracking, budgeting, and alerting for LLM usage.
 *
 * Features:
 * - Real-time cost tracking
 * - Budget limits and alerts
 * - Cost breakdown by model/user/project
 * - Usage forecasting
 * - Rate limiting
 *
 * Installation:
 *   npm install @opentelemetry/api
 *
 * Usage:
 *   import { CostTracker, BudgetManager } from './cost-tracking';
 *
 *   const tracker = new CostTracker();
 *   const budget = new BudgetManager(tracker, {
 *     daily: 100,
 *     monthly: 2000,
 *   });
 *
 *   // Before each LLM call
 *   await budget.checkBudget();
 *
 *   // After each LLM call
 *   tracker.record({
 *     model: 'gpt-4',
 *     inputTokens: 500,
 *     outputTokens: 200,
 *   });
 */

import { metrics } from '@opentelemetry/api';

// Types
interface UsageRecord {
  timestamp: Date;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  userId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

interface CostBreakdown {
  total: number;
  byModel: Record<string, number>;
  byProvider: Record<string, number>;
  byUser: Record<string, number>;
  byProject: Record<string, number>;
}

interface BudgetConfig {
  daily?: number;
  weekly?: number;
  monthly?: number;
  perUser?: number;
  perProject?: number;
}

interface BudgetStatus {
  period: string;
  limit: number;
  used: number;
  remaining: number;
  percentUsed: number;
  isExceeded: boolean;
}

interface AlertConfig {
  thresholds: number[]; // e.g., [0.5, 0.8, 0.9, 1.0]
  onAlert: (alert: BudgetAlert) => void | Promise<void>;
}

interface BudgetAlert {
  period: string;
  threshold: number;
  currentUsage: number;
  limit: number;
  timestamp: Date;
}

// Model pricing (USD per 1K tokens)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-32k': { input: 0.06, output: 0.12 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-3.5-turbo-16k': { input: 0.001, output: 0.002 },

  // Anthropic
  'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
  'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
  'claude-3-5-sonnet-20240620': { input: 0.003, output: 0.015 },

  // Google
  'gemini-pro': { input: 0.00025, output: 0.0005 },
  'gemini-pro-vision': { input: 0.00025, output: 0.0005 },

  // Mistral
  'mistral-tiny': { input: 0.00014, output: 0.00042 },
  'mistral-small': { input: 0.0006, output: 0.0018 },
  'mistral-medium': { input: 0.0027, output: 0.0081 },
  'mistral-large': { input: 0.008, output: 0.024 },
};

/**
 * Cost Tracker - Records and analyzes LLM costs
 */
export class CostTracker {
  private records: UsageRecord[] = [];
  private meter;
  private costCounter;
  private tokenCounter;

  constructor(serviceName: string = 'llm-service') {
    this.meter = metrics.getMeter(serviceName);

    // Create metrics
    this.costCounter = this.meter.createCounter('llm.cost.usd', {
      description: 'Total LLM cost in USD',
    });

    this.tokenCounter = this.meter.createCounter('llm.tokens.total', {
      description: 'Total tokens used',
    });
  }

  /**
   * Calculate cost for a request
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
      console.warn(`Unknown model pricing: ${model}, using gpt-3.5-turbo rates`);
      const fallback = MODEL_PRICING['gpt-3.5-turbo'];
      return (inputTokens * fallback.input + outputTokens * fallback.output) / 1000;
    }
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000;
  }

  /**
   * Record a usage event
   */
  record(params: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    userId?: string;
    projectId?: string;
    metadata?: Record<string, unknown>;
  }): UsageRecord {
    const cost = this.calculateCost(params.model, params.inputTokens, params.outputTokens);
    const provider = this.detectProvider(params.model);

    const record: UsageRecord = {
      timestamp: new Date(),
      model: params.model,
      provider,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      cost,
      userId: params.userId,
      projectId: params.projectId,
      metadata: params.metadata,
    };

    this.records.push(record);

    // Update metrics
    const labels = {
      model: params.model,
      provider,
      userId: params.userId || 'unknown',
      projectId: params.projectId || 'unknown',
    };

    this.costCounter.add(cost, labels);
    this.tokenCounter.add(params.inputTokens + params.outputTokens, labels);

    return record;
  }

  /**
   * Detect provider from model name
   */
  private detectProvider(model: string): string {
    if (model.startsWith('gpt')) return 'openai';
    if (model.startsWith('claude')) return 'anthropic';
    if (model.startsWith('gemini')) return 'google';
    if (model.startsWith('mistral')) return 'mistral';
    return 'unknown';
  }

  /**
   * Get cost breakdown for a time period
   */
  getBreakdown(
    startDate?: Date,
    endDate?: Date,
    filters?: { userId?: string; projectId?: string }
  ): CostBreakdown {
    let filtered = this.records;

    if (startDate) {
      filtered = filtered.filter((r) => r.timestamp >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((r) => r.timestamp <= endDate);
    }
    if (filters?.userId) {
      filtered = filtered.filter((r) => r.userId === filters.userId);
    }
    if (filters?.projectId) {
      filtered = filtered.filter((r) => r.projectId === filters.projectId);
    }

    const breakdown: CostBreakdown = {
      total: 0,
      byModel: {},
      byProvider: {},
      byUser: {},
      byProject: {},
    };

    for (const record of filtered) {
      breakdown.total += record.cost;
      breakdown.byModel[record.model] = (breakdown.byModel[record.model] || 0) + record.cost;
      breakdown.byProvider[record.provider] = (breakdown.byProvider[record.provider] || 0) + record.cost;

      if (record.userId) {
        breakdown.byUser[record.userId] = (breakdown.byUser[record.userId] || 0) + record.cost;
      }
      if (record.projectId) {
        breakdown.byProject[record.projectId] = (breakdown.byProject[record.projectId] || 0) + record.cost;
      }
    }

    return breakdown;
  }

  /**
   * Get daily costs for a period
   */
  getDailyCosts(days: number = 30): Array<{ date: string; cost: number }> {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const dailyCosts = new Map<string, number>();

    for (const record of this.records) {
      if (record.timestamp < startDate) continue;

      const dateKey = record.timestamp.toISOString().split('T')[0];
      dailyCosts.set(dateKey, (dailyCosts.get(dateKey) || 0) + record.cost);
    }

    return Array.from(dailyCosts.entries())
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get cost for current period
   */
  getCurrentPeriodCost(period: 'day' | 'week' | 'month'): number {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return this.records
      .filter((r) => r.timestamp >= startDate)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * Forecast cost based on current usage
   */
  forecastMonthlySpend(): number {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysElapsed = (now.getTime() - startOfMonth.getTime()) / (24 * 60 * 60 * 1000);

    if (daysElapsed < 1) return 0;

    const currentSpend = this.getCurrentPeriodCost('month');
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    return (currentSpend / daysElapsed) * daysInMonth;
  }

  /**
   * Get all records
   */
  getRecords(
    limit?: number,
    offset?: number
  ): { records: UsageRecord[]; total: number } {
    const sorted = [...this.records].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    return {
      records: sorted.slice(offset || 0, limit ? (offset || 0) + limit : undefined),
      total: this.records.length,
    };
  }

  /**
   * Clear old records
   */
  cleanup(olderThan: Date): number {
    const initialCount = this.records.length;
    this.records = this.records.filter((r) => r.timestamp >= olderThan);
    return initialCount - this.records.length;
  }
}

/**
 * Budget Manager - Enforces spending limits
 */
export class BudgetManager {
  private tracker: CostTracker;
  private budgets: BudgetConfig;
  private alerts: AlertConfig | null = null;
  private alertsSent: Set<string> = new Set();

  constructor(tracker: CostTracker, budgets: BudgetConfig) {
    this.tracker = tracker;
    this.budgets = budgets;
  }

  /**
   * Configure alerts
   */
  configureAlerts(config: AlertConfig): void {
    this.alerts = config;
  }

  /**
   * Check if within budget
   */
  async checkBudget(userId?: string, projectId?: string): Promise<{
    allowed: boolean;
    status: BudgetStatus[];
    exceededBudgets: string[];
  }> {
    const status: BudgetStatus[] = [];
    const exceededBudgets: string[] = [];

    // Check daily budget
    if (this.budgets.daily) {
      const dailyStatus = this.checkPeriodBudget('daily', this.budgets.daily, 'day');
      status.push(dailyStatus);
      if (dailyStatus.isExceeded) exceededBudgets.push('daily');
      await this.checkAndSendAlert('daily', dailyStatus);
    }

    // Check weekly budget
    if (this.budgets.weekly) {
      const weeklyStatus = this.checkPeriodBudget('weekly', this.budgets.weekly, 'week');
      status.push(weeklyStatus);
      if (weeklyStatus.isExceeded) exceededBudgets.push('weekly');
      await this.checkAndSendAlert('weekly', weeklyStatus);
    }

    // Check monthly budget
    if (this.budgets.monthly) {
      const monthlyStatus = this.checkPeriodBudget('monthly', this.budgets.monthly, 'month');
      status.push(monthlyStatus);
      if (monthlyStatus.isExceeded) exceededBudgets.push('monthly');
      await this.checkAndSendAlert('monthly', monthlyStatus);
    }

    // Check per-user budget
    if (this.budgets.perUser && userId) {
      const userCost = this.tracker.getBreakdown(
        this.getStartOfMonth(),
        undefined,
        { userId }
      ).total;

      const userStatus: BudgetStatus = {
        period: `user:${userId}`,
        limit: this.budgets.perUser,
        used: userCost,
        remaining: Math.max(0, this.budgets.perUser - userCost),
        percentUsed: (userCost / this.budgets.perUser) * 100,
        isExceeded: userCost >= this.budgets.perUser,
      };
      status.push(userStatus);
      if (userStatus.isExceeded) exceededBudgets.push(`user:${userId}`);
    }

    // Check per-project budget
    if (this.budgets.perProject && projectId) {
      const projectCost = this.tracker.getBreakdown(
        this.getStartOfMonth(),
        undefined,
        { projectId }
      ).total;

      const projectStatus: BudgetStatus = {
        period: `project:${projectId}`,
        limit: this.budgets.perProject,
        used: projectCost,
        remaining: Math.max(0, this.budgets.perProject - projectCost),
        percentUsed: (projectCost / this.budgets.perProject) * 100,
        isExceeded: projectCost >= this.budgets.perProject,
      };
      status.push(projectStatus);
      if (projectStatus.isExceeded) exceededBudgets.push(`project:${projectId}`);
    }

    return {
      allowed: exceededBudgets.length === 0,
      status,
      exceededBudgets,
    };
  }

  private checkPeriodBudget(
    period: string,
    limit: number,
    periodType: 'day' | 'week' | 'month'
  ): BudgetStatus {
    const used = this.tracker.getCurrentPeriodCost(periodType);
    return {
      period,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      percentUsed: (used / limit) * 100,
      isExceeded: used >= limit,
    };
  }

  private async checkAndSendAlert(period: string, status: BudgetStatus): Promise<void> {
    if (!this.alerts) return;

    for (const threshold of this.alerts.thresholds) {
      const alertKey = `${period}:${threshold}`;
      const thresholdPercent = threshold * 100;

      if (status.percentUsed >= thresholdPercent && !this.alertsSent.has(alertKey)) {
        await this.alerts.onAlert({
          period,
          threshold,
          currentUsage: status.used,
          limit: status.limit,
          timestamp: new Date(),
        });
        this.alertsSent.add(alertKey);
      }
    }
  }

  private getStartOfMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  /**
   * Get budget status summary
   */
  async getStatus(): Promise<BudgetStatus[]> {
    const result = await this.checkBudget();
    return result.status;
  }

  /**
   * Reset alert tracking (call at start of new period)
   */
  resetAlerts(period?: string): void {
    if (period) {
      for (const key of this.alertsSent) {
        if (key.startsWith(period)) {
          this.alertsSent.delete(key);
        }
      }
    } else {
      this.alertsSent.clear();
    }
  }

  /**
   * Update budgets
   */
  updateBudgets(budgets: Partial<BudgetConfig>): void {
    this.budgets = { ...this.budgets, ...budgets };
  }
}

/**
 * Rate Limiter - Prevents excessive API calls
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limits: { requests: number; windowMs: number };

  constructor(limits: { requests: number; windowMs: number }) {
    this.limits = limits;
  }

  /**
   * Check if a request is allowed
   */
  checkLimit(key: string = 'default'): {
    allowed: boolean;
    remaining: number;
    resetInMs: number;
  } {
    const now = Date.now();
    const windowStart = now - this.limits.windowMs;

    // Get and clean up old requests
    let timestamps = this.requests.get(key) || [];
    timestamps = timestamps.filter((t) => t > windowStart);

    const remaining = Math.max(0, this.limits.requests - timestamps.length);
    const oldestRequest = timestamps[0] || now;
    const resetInMs = Math.max(0, oldestRequest + this.limits.windowMs - now);

    return {
      allowed: timestamps.length < this.limits.requests,
      remaining,
      resetInMs,
    };
  }

  /**
   * Record a request
   */
  recordRequest(key: string = 'default'): void {
    const timestamps = this.requests.get(key) || [];
    timestamps.push(Date.now());
    this.requests.set(key, timestamps);
  }

  /**
   * Wait until a request is allowed
   */
  async waitForSlot(key: string = 'default'): Promise<void> {
    const { allowed, resetInMs } = this.checkLimit(key);
    if (!allowed && resetInMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, resetInMs + 100));
    }
  }
}

// Export types and constants
export { MODEL_PRICING };
export type {
  UsageRecord,
  CostBreakdown,
  BudgetConfig,
  BudgetStatus,
  AlertConfig,
  BudgetAlert,
};
