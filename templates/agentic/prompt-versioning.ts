/**
 * Prompt Versioning and A/B Testing
 *
 * Provides infrastructure for managing prompt versions and running experiments.
 *
 * Features:
 * - Prompt version control
 * - A/B testing with traffic splitting
 * - Metrics collection per variant
 * - Rollout management
 *
 * Installation:
 *   npm install crypto
 *
 * Usage:
 *   import { PromptRegistry, PromptExperiment } from './prompt-versioning';
 *
 *   const registry = new PromptRegistry();
 *   registry.register('greeting', 'v1', 'Hello, how can I help?');
 *   registry.register('greeting', 'v2', 'Hi there! What can I do for you today?');
 *
 *   const experiment = registry.createExperiment('greeting', {
 *     control: 'v1',
 *     variants: [{ version: 'v2', weight: 0.5 }],
 *   });
 *
 *   const prompt = experiment.getPrompt(userId);
 */

import crypto from 'crypto';

// Types
interface PromptVersion {
  version: string;
  content: string;
  variables?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface ExperimentConfig {
  control: string;
  variants: Array<{
    version: string;
    weight: number; // 0-1, percentage of traffic
  }>;
  metadata?: Record<string, unknown>;
}

interface ExperimentMetrics {
  impressions: number;
  conversions: number;
  conversionRate: number;
  avgLatencyMs: number;
  avgTokens: number;
  totalCost: number;
}

interface VariantMetrics {
  version: string;
  metrics: ExperimentMetrics;
}

/**
 * Prompt Registry - Manages prompt versions
 */
export class PromptRegistry {
  private prompts: Map<string, Map<string, PromptVersion>> = new Map();
  private experiments: Map<string, PromptExperiment> = new Map();

  /**
   * Register a prompt version
   */
  register(
    name: string,
    version: string,
    content: string,
    metadata?: Record<string, unknown>
  ): PromptVersion {
    if (!this.prompts.has(name)) {
      this.prompts.set(name, new Map());
    }

    // Extract variables ({{variable}})
    const variables = Array.from(content.matchAll(/\{\{(\w+)\}\}/g)).map((m) => m[1]);

    const promptVersion: PromptVersion = {
      version,
      content,
      variables,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.prompts.get(name)!.set(version, promptVersion);
    return promptVersion;
  }

  /**
   * Get a specific prompt version
   */
  get(name: string, version: string): PromptVersion | undefined {
    return this.prompts.get(name)?.get(version);
  }

  /**
   * Get the latest version of a prompt
   */
  getLatest(name: string): PromptVersion | undefined {
    const versions = this.prompts.get(name);
    if (!versions || versions.size === 0) return undefined;

    // Return most recently updated
    let latest: PromptVersion | undefined;
    for (const version of versions.values()) {
      if (!latest || version.updatedAt > latest.updatedAt) {
        latest = version;
      }
    }
    return latest;
  }

  /**
   * List all versions of a prompt
   */
  listVersions(name: string): PromptVersion[] {
    const versions = this.prompts.get(name);
    return versions ? Array.from(versions.values()) : [];
  }

  /**
   * List all prompt names
   */
  listPrompts(): string[] {
    return Array.from(this.prompts.keys());
  }

  /**
   * Render a prompt with variables
   */
  render(name: string, version: string, variables: Record<string, string>): string {
    const prompt = this.get(name, version);
    if (!prompt) {
      throw new Error(`Prompt not found: ${name}@${version}`);
    }

    let rendered = prompt.content;
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    // Check for unrendered variables
    const unrendered = rendered.match(/\{\{(\w+)\}\}/g);
    if (unrendered) {
      throw new Error(`Missing variables: ${unrendered.join(', ')}`);
    }

    return rendered;
  }

  /**
   * Create an experiment
   */
  createExperiment(name: string, config: ExperimentConfig): PromptExperiment {
    // Validate versions exist
    if (!this.get(name, config.control)) {
      throw new Error(`Control version not found: ${name}@${config.control}`);
    }
    for (const variant of config.variants) {
      if (!this.get(name, variant.version)) {
        throw new Error(`Variant version not found: ${name}@${variant.version}`);
      }
    }

    const experiment = new PromptExperiment(name, config, this);
    this.experiments.set(name, experiment);
    return experiment;
  }

  /**
   * Get an active experiment
   */
  getExperiment(name: string): PromptExperiment | undefined {
    return this.experiments.get(name);
  }

  /**
   * Export all prompts for backup
   */
  export(): Record<string, Array<{ version: string; content: string; metadata?: unknown }>> {
    const exported: Record<string, Array<{ version: string; content: string; metadata?: unknown }>> = {};

    for (const [name, versions] of this.prompts) {
      exported[name] = [];
      for (const version of versions.values()) {
        exported[name].push({
          version: version.version,
          content: version.content,
          metadata: version.metadata,
        });
      }
    }

    return exported;
  }

  /**
   * Import prompts from backup
   */
  import(data: Record<string, Array<{ version: string; content: string; metadata?: unknown }>>): void {
    for (const [name, versions] of Object.entries(data)) {
      for (const { version, content, metadata } of versions) {
        this.register(name, version, content, metadata as Record<string, unknown>);
      }
    }
  }
}

/**
 * Prompt Experiment - Manages A/B testing
 */
export class PromptExperiment {
  private name: string;
  private config: ExperimentConfig;
  private registry: PromptRegistry;
  private metrics: Map<string, ExperimentMetrics> = new Map();
  private assignments: Map<string, string> = new Map(); // userId -> version
  private isActive: boolean = true;

  constructor(name: string, config: ExperimentConfig, registry: PromptRegistry) {
    this.name = name;
    this.config = config;
    this.registry = registry;

    // Initialize metrics for each variant
    this.initializeMetrics(config.control);
    for (const variant of config.variants) {
      this.initializeMetrics(variant.version);
    }
  }

  private initializeMetrics(version: string): void {
    this.metrics.set(version, {
      impressions: 0,
      conversions: 0,
      conversionRate: 0,
      avgLatencyMs: 0,
      avgTokens: 0,
      totalCost: 0,
    });
  }

  /**
   * Get the prompt for a user (deterministic assignment)
   */
  getPrompt(userId: string, variables?: Record<string, string>): {
    version: string;
    content: string;
  } {
    if (!this.isActive) {
      // Return control when experiment is stopped
      const content = variables
        ? this.registry.render(this.name, this.config.control, variables)
        : this.registry.get(this.name, this.config.control)!.content;

      return { version: this.config.control, content };
    }

    const version = this.assignVariant(userId);
    const content = variables
      ? this.registry.render(this.name, version, variables)
      : this.registry.get(this.name, version)!.content;

    // Record impression
    this.recordImpression(version);

    return { version, content };
  }

  /**
   * Deterministically assign a user to a variant
   */
  private assignVariant(userId: string): string {
    // Check existing assignment
    if (this.assignments.has(userId)) {
      return this.assignments.get(userId)!;
    }

    // Hash user ID for deterministic assignment
    const hash = crypto.createHash('md5').update(userId + this.name).digest('hex');
    const hashNum = parseInt(hash.substring(0, 8), 16) / 0xffffffff; // 0-1

    // Assign based on weights
    let cumulative = 0;
    for (const variant of this.config.variants) {
      cumulative += variant.weight;
      if (hashNum < cumulative) {
        this.assignments.set(userId, variant.version);
        return variant.version;
      }
    }

    // Default to control
    this.assignments.set(userId, this.config.control);
    return this.config.control;
  }

  /**
   * Record an impression
   */
  private recordImpression(version: string): void {
    const metrics = this.metrics.get(version);
    if (metrics) {
      metrics.impressions++;
    }
  }

  /**
   * Record a conversion
   */
  recordConversion(userId: string): void {
    const version = this.assignments.get(userId);
    if (version) {
      const metrics = this.metrics.get(version);
      if (metrics) {
        metrics.conversions++;
        metrics.conversionRate = metrics.conversions / metrics.impressions;
      }
    }
  }

  /**
   * Record metrics for a request
   */
  recordMetrics(
    userId: string,
    data: { latencyMs: number; tokens: number; cost: number }
  ): void {
    const version = this.assignments.get(userId);
    if (version) {
      const metrics = this.metrics.get(version);
      if (metrics) {
        // Update running averages
        const n = metrics.impressions;
        metrics.avgLatencyMs = (metrics.avgLatencyMs * (n - 1) + data.latencyMs) / n;
        metrics.avgTokens = (metrics.avgTokens * (n - 1) + data.tokens) / n;
        metrics.totalCost += data.cost;
      }
    }
  }

  /**
   * Get metrics for all variants
   */
  getMetrics(): VariantMetrics[] {
    const results: VariantMetrics[] = [];

    for (const [version, metrics] of this.metrics) {
      results.push({ version, metrics: { ...metrics } });
    }

    return results;
  }

  /**
   * Get the winning variant based on conversion rate
   */
  getWinner(): { version: string; metrics: ExperimentMetrics } | null {
    let winner: { version: string; metrics: ExperimentMetrics } | null = null;

    for (const [version, metrics] of this.metrics) {
      // Require minimum sample size
      if (metrics.impressions < 100) continue;

      if (!winner || metrics.conversionRate > winner.metrics.conversionRate) {
        winner = { version, metrics: { ...metrics } };
      }
    }

    return winner;
  }

  /**
   * Calculate statistical significance (simplified)
   */
  isSignificant(minImpressions: number = 1000): boolean {
    const control = this.metrics.get(this.config.control);
    if (!control || control.impressions < minImpressions) return false;

    for (const variant of this.config.variants) {
      const variantMetrics = this.metrics.get(variant.version);
      if (!variantMetrics || variantMetrics.impressions < minImpressions) {
        return false;
      }

      // Simple z-test for proportions
      const p1 = control.conversionRate;
      const p2 = variantMetrics.conversionRate;
      const n1 = control.impressions;
      const n2 = variantMetrics.impressions;

      const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
      const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

      if (se === 0) continue;

      const z = Math.abs(p1 - p2) / se;

      // 95% confidence (z > 1.96)
      if (z > 1.96) return true;
    }

    return false;
  }

  /**
   * Stop the experiment
   */
  stop(): void {
    this.isActive = false;
  }

  /**
   * Restart the experiment
   */
  restart(): void {
    this.isActive = true;
  }

  /**
   * Graduate a variant to 100% traffic
   */
  graduate(version: string): void {
    this.config.control = version;
    this.config.variants = [];
    this.isActive = false;
  }
}

/**
 * Prompt Template with validation
 */
export class PromptTemplate {
  private template: string;
  private requiredVariables: string[];
  private optionalVariables: Map<string, string> = new Map(); // variable -> default

  constructor(template: string) {
    this.template = template;
    this.requiredVariables = Array.from(template.matchAll(/\{\{(\w+)\}\}/g)).map((m) => m[1]);
  }

  /**
   * Set a default value for a variable
   */
  setDefault(variable: string, defaultValue: string): this {
    this.optionalVariables.set(variable, defaultValue);
    this.requiredVariables = this.requiredVariables.filter((v) => v !== variable);
    return this;
  }

  /**
   * Render the template
   */
  render(variables: Record<string, string>): string {
    // Check required variables
    const missing = this.requiredVariables.filter((v) => !(v in variables));
    if (missing.length > 0) {
      throw new Error(`Missing required variables: ${missing.join(', ')}`);
    }

    // Merge with defaults
    const allVariables = {
      ...Object.fromEntries(this.optionalVariables),
      ...variables,
    };

    // Render
    let result = this.template;
    for (const [key, value] of Object.entries(allVariables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return result;
  }

  /**
   * Validate a set of variables
   */
  validate(variables: Record<string, string>): { valid: boolean; missing: string[] } {
    const missing = this.requiredVariables.filter((v) => !(v in variables));
    return { valid: missing.length === 0, missing };
  }

  /**
   * Get all variables
   */
  getVariables(): { required: string[]; optional: string[] } {
    return {
      required: [...this.requiredVariables],
      optional: Array.from(this.optionalVariables.keys()),
    };
  }
}

// Export types
export type { PromptVersion, ExperimentConfig, ExperimentMetrics, VariantMetrics };
