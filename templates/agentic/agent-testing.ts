/**
 * Agent Testing Framework
 *
 * Provides testing utilities for LLM-based agents including:
 * - Synthetic environment testing
 * - Behavior verification
 * - Prompt regression testing
 * - Multi-turn conversation testing
 *
 * Installation:
 *   npm install vitest
 *
 * Usage:
 *   import { AgentTester, createMockLLM } from './agent-testing';
 *
 *   const tester = new AgentTester(myAgent);
 *   await tester.testBehavior('should answer questions', {
 *     input: 'What is 2+2?',
 *     expectedBehavior: (response) => response.includes('4'),
 *   });
 */

import { vi, expect } from 'vitest';

// Types
interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface ToolResult {
  toolCallId: string;
  result: unknown;
  error?: string;
}

interface Agent {
  process(input: string, context?: AgentContext): Promise<AgentResponse>;
  reset?(): void;
}

interface AgentContext {
  conversationHistory?: AgentMessage[];
  tools?: Tool[];
  systemPrompt?: string;
  metadata?: Record<string, unknown>;
}

interface AgentResponse {
  message: string;
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
}

interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

interface BehaviorTest {
  input: string;
  context?: AgentContext;
  expectedBehavior: (response: AgentResponse) => boolean | Promise<boolean>;
  description?: string;
}

interface ConversationTest {
  turns: Array<{
    user: string;
    expectedBehavior?: (response: AgentResponse) => boolean | Promise<boolean>;
    assertState?: (state: AgentState) => boolean;
  }>;
  initialContext?: AgentContext;
}

interface AgentState {
  conversationHistory: AgentMessage[];
  toolCallCount: number;
  lastResponse: AgentResponse | null;
}

/**
 * Mock LLM for deterministic testing
 */
export class MockLLM {
  private responses: Map<string, string | ((input: string) => string)> = new Map();
  private defaultResponse: string | ((input: string) => string) = 'I cannot help with that.';
  private callHistory: Array<{ input: string; response: string }> = [];

  /**
   * Set a response for a specific input pattern
   */
  when(pattern: string | RegExp, response: string | ((input: string) => string)): this {
    const key = pattern instanceof RegExp ? pattern.source : pattern;
    this.responses.set(key, response);
    return this;
  }

  /**
   * Set the default response for unmatched inputs
   */
  setDefault(response: string | ((input: string) => string)): this {
    this.defaultResponse = response;
    return this;
  }

  /**
   * Generate a response based on input
   */
  async generate(input: string): Promise<string> {
    // Check for matching patterns
    for (const [pattern, response] of this.responses) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(input)) {
        const result = typeof response === 'function' ? response(input) : response;
        this.callHistory.push({ input, response: result });
        return result;
      }
    }

    // Return default
    const result =
      typeof this.defaultResponse === 'function' ? this.defaultResponse(input) : this.defaultResponse;
    this.callHistory.push({ input, response: result });
    return result;
  }

  /**
   * Get call history
   */
  getCallHistory(): Array<{ input: string; response: string }> {
    return [...this.callHistory];
  }

  /**
   * Reset call history
   */
  reset(): void {
    this.callHistory = [];
  }

  /**
   * Assert that the LLM was called with specific input
   */
  assertCalledWith(pattern: string | RegExp): void {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
    const found = this.callHistory.some((call) => regex.test(call.input));
    if (!found) {
      throw new Error(`Expected LLM to be called with pattern: ${pattern}`);
    }
  }

  /**
   * Assert call count
   */
  assertCallCount(expected: number): void {
    if (this.callHistory.length !== expected) {
      throw new Error(`Expected ${expected} calls, got ${this.callHistory.length}`);
    }
  }
}

/**
 * Create a mock LLM with common responses
 */
export function createMockLLM(): MockLLM {
  return new MockLLM()
    .when(/hello|hi|hey/i, 'Hello! How can I help you today?')
    .when(/thank/i, "You're welcome!")
    .when(/bye|goodbye/i, 'Goodbye! Have a great day!')
    .setDefault("I'm not sure how to respond to that.");
}

/**
 * Mock tool for testing
 */
export class MockTool implements Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  private mockImplementation: (args: Record<string, unknown>) => unknown;
  private callHistory: Array<{ args: Record<string, unknown>; result: unknown }> = [];

  constructor(
    name: string,
    description: string,
    parameters: Record<string, unknown>,
    implementation?: (args: Record<string, unknown>) => unknown
  ) {
    this.name = name;
    this.description = description;
    this.parameters = parameters;
    this.mockImplementation = implementation ?? (() => ({ success: true }));
  }

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const result = this.mockImplementation(args);
    this.callHistory.push({ args, result });
    return result;
  }

  getCallHistory(): Array<{ args: Record<string, unknown>; result: unknown }> {
    return [...this.callHistory];
  }

  assertCalledWith(expectedArgs: Record<string, unknown>): void {
    const found = this.callHistory.some((call) =>
      Object.entries(expectedArgs).every(([key, value]) => call.args[key] === value)
    );
    if (!found) {
      throw new Error(`Expected tool to be called with: ${JSON.stringify(expectedArgs)}`);
    }
  }

  assertCalledTimes(expected: number): void {
    if (this.callHistory.length !== expected) {
      throw new Error(`Expected tool to be called ${expected} times, got ${this.callHistory.length}`);
    }
  }

  reset(): void {
    this.callHistory = [];
  }
}

/**
 * Agent Tester - Main testing class
 */
export class AgentTester {
  private agent: Agent;
  private state: AgentState;

  constructor(agent: Agent) {
    this.agent = agent;
    this.state = {
      conversationHistory: [],
      toolCallCount: 0,
      lastResponse: null,
    };
  }

  /**
   * Test a single behavior
   */
  async testBehavior(name: string, test: BehaviorTest): Promise<void> {
    const response = await this.agent.process(test.input, test.context);

    const passed = await test.expectedBehavior(response);
    if (!passed) {
      throw new Error(
        `Behavior test failed: ${name}\n` +
          `Input: ${test.input}\n` +
          `Response: ${response.message}\n` +
          `Description: ${test.description ?? 'No description'}`
      );
    }

    this.state.lastResponse = response;
    this.state.conversationHistory.push(
      { role: 'user', content: test.input },
      { role: 'assistant', content: response.message, toolCalls: response.toolCalls }
    );
    this.state.toolCallCount += response.toolCalls?.length ?? 0;
  }

  /**
   * Test a multi-turn conversation
   */
  async testConversation(name: string, test: ConversationTest): Promise<void> {
    // Reset state
    this.reset();

    const context: AgentContext = {
      ...test.initialContext,
      conversationHistory: [],
    };

    for (let i = 0; i < test.turns.length; i++) {
      const turn = test.turns[i];

      // Add user message to history
      context.conversationHistory!.push({ role: 'user', content: turn.user });

      // Get agent response
      const response = await this.agent.process(turn.user, context);

      // Update state
      this.state.lastResponse = response;
      this.state.conversationHistory.push(
        { role: 'user', content: turn.user },
        { role: 'assistant', content: response.message, toolCalls: response.toolCalls }
      );
      this.state.toolCallCount += response.toolCalls?.length ?? 0;

      // Add assistant response to history
      context.conversationHistory!.push({
        role: 'assistant',
        content: response.message,
        toolCalls: response.toolCalls,
      });

      // Check behavior
      if (turn.expectedBehavior) {
        const passed = await turn.expectedBehavior(response);
        if (!passed) {
          throw new Error(
            `Conversation test failed at turn ${i + 1}: ${name}\n` +
              `User: ${turn.user}\n` +
              `Response: ${response.message}`
          );
        }
      }

      // Check state
      if (turn.assertState) {
        const stateValid = turn.assertState(this.state);
        if (!stateValid) {
          throw new Error(
            `State assertion failed at turn ${i + 1}: ${name}\n` + `State: ${JSON.stringify(this.state)}`
          );
        }
      }
    }
  }

  /**
   * Test tool usage
   */
  async testToolUsage(
    input: string,
    expectedTool: string,
    expectedArgs?: Record<string, unknown>
  ): Promise<void> {
    const response = await this.agent.process(input);

    const toolCall = response.toolCalls?.find((tc) => tc.name === expectedTool);
    if (!toolCall) {
      throw new Error(
        `Expected tool "${expectedTool}" to be called\n` +
          `Actual tool calls: ${JSON.stringify(response.toolCalls)}`
      );
    }

    if (expectedArgs) {
      for (const [key, value] of Object.entries(expectedArgs)) {
        if (toolCall.arguments[key] !== value) {
          throw new Error(
            `Expected tool argument ${key}=${value}\n` + `Actual: ${toolCall.arguments[key]}`
          );
        }
      }
    }
  }

  /**
   * Test that certain content is NOT in the response
   */
  async testDoesNotContain(input: string, forbidden: string[]): Promise<void> {
    const response = await this.agent.process(input);

    for (const term of forbidden) {
      if (response.message.toLowerCase().includes(term.toLowerCase())) {
        throw new Error(`Response contains forbidden term: "${term}"\n` + `Response: ${response.message}`);
      }
    }
  }

  /**
   * Test response time
   */
  async testResponseTime(input: string, maxMs: number): Promise<void> {
    const start = Date.now();
    await this.agent.process(input);
    const elapsed = Date.now() - start;

    if (elapsed > maxMs) {
      throw new Error(`Response time ${elapsed}ms exceeded limit of ${maxMs}ms`);
    }
  }

  /**
   * Get current state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Reset tester state
   */
  reset(): void {
    this.state = {
      conversationHistory: [],
      toolCallCount: 0,
      lastResponse: null,
    };
    if (this.agent.reset) {
      this.agent.reset();
    }
  }
}

/**
 * Prompt regression testing
 */
export class PromptRegressionTester {
  private testCases: Array<{
    name: string;
    prompt: string;
    expectedOutput: string | RegExp | ((output: string) => boolean);
  }> = [];

  /**
   * Add a test case
   */
  addCase(
    name: string,
    prompt: string,
    expectedOutput: string | RegExp | ((output: string) => boolean)
  ): this {
    this.testCases.push({ name, prompt, expectedOutput });
    return this;
  }

  /**
   * Run all test cases
   */
  async run(generateFn: (prompt: string) => Promise<string>): Promise<{
    passed: number;
    failed: number;
    results: Array<{ name: string; passed: boolean; error?: string }>;
  }> {
    const results: Array<{ name: string; passed: boolean; error?: string }> = [];

    for (const testCase of this.testCases) {
      try {
        const output = await generateFn(testCase.prompt);
        let passed = false;

        if (typeof testCase.expectedOutput === 'string') {
          passed = output.includes(testCase.expectedOutput);
        } else if (testCase.expectedOutput instanceof RegExp) {
          passed = testCase.expectedOutput.test(output);
        } else {
          passed = testCase.expectedOutput(output);
        }

        results.push({
          name: testCase.name,
          passed,
          error: passed ? undefined : `Output did not match expected: ${output.substring(0, 100)}...`,
        });
      } catch (error) {
        results.push({
          name: testCase.name,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      results,
    };
  }
}

/**
 * Synthetic environment for agent testing
 */
export class SyntheticEnvironment {
  private state: Record<string, unknown> = {};
  private tools: Map<string, MockTool> = new Map();
  private eventLog: Array<{ type: string; data: unknown; timestamp: Date }> = [];

  /**
   * Set initial state
   */
  setState(state: Record<string, unknown>): this {
    this.state = { ...state };
    this.logEvent('state_set', state);
    return this;
  }

  /**
   * Get current state
   */
  getState(): Record<string, unknown> {
    return { ...this.state };
  }

  /**
   * Register a tool
   */
  registerTool(tool: MockTool): this {
    this.tools.set(tool.name, tool);
    return this;
  }

  /**
   * Get a tool
   */
  getTool(name: string): MockTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tools
   */
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Log an event
   */
  logEvent(type: string, data: unknown): void {
    this.eventLog.push({ type, data, timestamp: new Date() });
  }

  /**
   * Get event log
   */
  getEventLog(): Array<{ type: string; data: unknown; timestamp: Date }> {
    return [...this.eventLog];
  }

  /**
   * Reset environment
   */
  reset(): void {
    this.state = {};
    this.eventLog = [];
    for (const tool of this.tools.values()) {
      tool.reset();
    }
  }
}

// Export types
export type {
  Agent,
  AgentContext,
  AgentResponse,
  AgentMessage,
  AgentState,
  Tool,
  ToolCall,
  ToolResult,
  BehaviorTest,
  ConversationTest,
};
