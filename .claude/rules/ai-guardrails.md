# AI Guardrails

Safety rules for AI-assisted development and agentic applications.

## Command Restrictions

### Never Execute Without Review
```bash
# ❌ NEVER auto-execute these patterns
rm -rf /                     # Destructive system command
DROP DATABASE               # Database deletion
kubectl delete namespace    # Production resource deletion
terraform destroy           # Infrastructure destruction

# ✅ ALWAYS require manual confirmation
echo "About to delete: $resource"
read -p "Continue? (y/N) " confirm
```

### Restricted Operations
| Operation | Policy | Reason |
|-----------|--------|--------|
| Production deployments | Manual approval required | Irreversible in many cases |
| Database migrations | Manual review + backup | Data loss risk |
| Security config changes | Security team review | Compliance requirements |
| API key rotation | Coordinate with team | Service disruption risk |
| Bulk data operations | Staged rollout | Performance/integrity risk |

## AI Code Review Checkpoints

### Automatic Review Required For
1. **Authentication/Authorization changes** - Security-critical
2. **Database schema changes** - Data integrity
3. **API endpoint additions** - Attack surface
4. **Dependency additions** - Supply chain security
5. **Environment variable changes** - Secret management
6. **Infrastructure as Code** - Cloud security

### Review Checklist
```markdown
## AI-Generated Code Review

- [ ] No hardcoded secrets or credentials
- [ ] Input validation on all user inputs
- [ ] Output encoding to prevent XSS
- [ ] Parameterized queries (no SQL injection)
- [ ] Appropriate error handling (no stack traces to users)
- [ ] Rate limiting on public endpoints
- [ ] Authentication required where needed
- [ ] Authorization checks for resource access
- [ ] Logging without sensitive data
- [ ] Tests cover security scenarios
```

## Prompt Injection Prevention

### For Agentic Applications
```typescript
// ❌ NEVER pass raw user input to system prompts
const prompt = `You are a helpful assistant. User says: ${userInput}`;

// ✅ ALWAYS sanitize and separate concerns
const sanitizedInput = sanitizeUserInput(userInput);
const messages = [
  { role: 'system', content: SYSTEM_PROMPT },  // Fixed, no user content
  { role: 'user', content: sanitizedInput },   // User content isolated
];
```

### Input Sanitization
```typescript
function sanitizeUserInput(input: string): string {
  // Remove potential prompt injection patterns
  const suspicious = [
    /ignore\s+(all\s+)?previous\s+instructions/gi,
    /you\s+are\s+now/gi,
    /new\s+instructions?:/gi,
    /system\s*:/gi,
    /\[INST\]/gi,
    /<\|im_start\|>/gi,
  ];

  let sanitized = input;
  for (const pattern of suspicious) {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  }

  return sanitized;
}
```

## LLM Output Validation

### Never Trust LLM Output Directly
```typescript
// ❌ NEVER execute LLM output without validation
const code = await llm.generate('Write a function to delete files');
eval(code);  // Extremely dangerous!

// ✅ ALWAYS validate and sandbox
const code = await llm.generate('Write a function to delete files');

// 1. Parse and validate structure
const ast = parseCode(code);
if (containsDangerousPatterns(ast)) {
  throw new Error('Generated code contains dangerous patterns');
}

// 2. Execute in sandbox with limited permissions
const result = await sandbox.execute(code, {
  permissions: ['read'],  // No write/delete
  timeout: 5000,
  memoryLimit: '128MB',
});
```

### Output Validation Patterns
```typescript
// Validate JSON output from LLM
function validateLLMJson<T>(output: string, schema: ZodSchema<T>): T {
  // 1. Extract JSON from potential markdown
  const jsonMatch = output.match(/```json\n?([\s\S]*?)\n?```/) ||
                    output.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('No valid JSON found in LLM output');
  }

  // 2. Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
  } catch (e) {
    throw new Error('Invalid JSON in LLM output');
  }

  // 3. Validate against schema
  return schema.parse(parsed);
}
```

## License Compliance for AI-Generated Code

### Review Requirements
```markdown
When using AI to generate code:

1. **Check for copied code** - AI may reproduce training data
2. **Verify license compatibility** - Ensure generated patterns are usable
3. **Document AI usage** - Note which files were AI-assisted
4. **Review for attribution** - Some licenses require attribution
```

### License Scanning
```bash
# Scan for potential license issues
npx license-checker --summary
npx license-checker --onlyAllow "MIT;ISC;Apache-2.0;BSD-2-Clause;BSD-3-Clause"
```

## Data Handling with AI

### Sensitive Data Rules
```typescript
// ❌ NEVER send sensitive data to external AI
const response = await openai.chat.completions.create({
  messages: [
    { role: 'user', content: `Analyze this user data: ${JSON.stringify(userData)}` }
  ]
});

// ✅ ALWAYS anonymize before sending
const anonymized = anonymizeData(userData);
const response = await openai.chat.completions.create({
  messages: [
    { role: 'user', content: `Analyze this data pattern: ${JSON.stringify(anonymized)}` }
  ]
});
```

### Data Classification
| Classification | Can Send to AI? | Examples |
|----------------|-----------------|----------|
| Public | ✅ Yes | Documentation, public APIs |
| Internal | ⚠️ With approval | Internal processes, non-PII |
| Confidential | ❌ No | User PII, financial data |
| Restricted | ❌ Never | Credentials, health records |

## Rate Limiting and Cost Control

### LLM API Usage
```typescript
// Implement rate limiting for LLM calls
const rateLimiter = new RateLimiter({
  maxRequestsPerMinute: 60,
  maxTokensPerDay: 1_000_000,
  maxCostPerDay: 50.00,  // USD
});

async function callLLM(prompt: string): Promise<string> {
  await rateLimiter.checkLimit();

  const response = await llm.generate(prompt);

  rateLimiter.recordUsage({
    tokens: response.usage.total_tokens,
    cost: calculateCost(response.usage),
  });

  return response.content;
}
```

## Audit Logging

### Log All AI Operations
```typescript
// Log AI interactions for audit
interface AIAuditLog {
  timestamp: Date;
  operation: 'generate' | 'embed' | 'classify';
  model: string;
  inputHash: string;      // Hash of input (not the input itself)
  outputHash: string;     // Hash of output
  tokensUsed: number;
  latencyMs: number;
  userId?: string;
  sessionId: string;
}

async function auditedLLMCall(params: LLMParams): Promise<LLMResponse> {
  const startTime = Date.now();
  const response = await llm.generate(params);

  await auditLog.record({
    timestamp: new Date(),
    operation: 'generate',
    model: params.model,
    inputHash: hash(params.prompt),
    outputHash: hash(response.content),
    tokensUsed: response.usage.total_tokens,
    latencyMs: Date.now() - startTime,
    sessionId: params.sessionId,
  });

  return response;
}
```

## Emergency Procedures

### Kill Switch
```typescript
// Implement emergency stop for AI systems
const AI_KILL_SWITCH = process.env.AI_KILL_SWITCH === 'true';

async function aiMiddleware(req: Request, next: NextFunction) {
  if (AI_KILL_SWITCH) {
    return res.status(503).json({
      error: 'AI features temporarily disabled',
      code: 'AI_DISABLED',
    });
  }
  return next();
}
```

### Incident Response
1. **Detection** - Monitor for anomalies in AI behavior
2. **Containment** - Enable kill switch if needed
3. **Investigation** - Review audit logs
4. **Recovery** - Gradual re-enablement with monitoring
5. **Post-mortem** - Document and improve guardrails
