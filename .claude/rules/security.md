# Security Rules

Always-follow guidelines for secure code. References OWASP Top 10 2025 and modern supply chain security practices.

## OWASP Top 10 2025 Quick Reference

| Risk | Mitigation |
|------|------------|
| A01: Broken Access Control | Deny by default, validate on server |
| A02: Cryptographic Failures | Use modern algorithms, manage keys properly |
| A03: Injection | Parameterized queries, input validation |
| A04: Insecure Design | Threat modeling, secure patterns |
| A05: Security Misconfiguration | Secure defaults, minimal permissions |
| A06: Vulnerable Components | Dependency scanning, updates |
| A07: Auth Failures | MFA, secure sessions, rate limiting |
| A08: Software/Data Integrity | Verify dependencies, sign artifacts |
| A09: Logging Failures | Audit logs, monitoring, no sensitive data |
| A10: SSRF | Validate URLs, allowlist destinations |

## Secrets Management

### Never Commit Secrets
```typescript
// ❌ NEVER
const API_KEY = "sk-1234567890abcdef";
const DB_PASSWORD = "hunter2";

// ✅ ALWAYS
const API_KEY = process.env.API_KEY;
const DB_PASSWORD = process.env.DB_PASSWORD;
```

### Environment Variables
- Store in `.env` files (gitignored)
- Document required vars in `.env.example`
- Validate presence at startup
- Use secret managers in production (AWS Secrets Manager, Vault)

```typescript
// Validate required env vars
const required = ['DATABASE_URL', 'API_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}
```

### Pre-commit Secret Scanning
Install pre-commit hooks to catch secrets before commit:
```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install

# Manual scan
pre-commit run gitleaks --all-files
```

## Input Validation

### Validate All User Input
```typescript
// ❌ NEVER trust user input
const userId = req.params.id;
db.query(`SELECT * FROM users WHERE id = ${userId}`); // SQL injection!

// ✅ ALWAYS validate and parameterize
const userId = parseInt(req.params.id, 10);
if (isNaN(userId)) {
  return res.status(400).json({ error: 'Invalid user ID' });
}
db.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### Use Schema Validation
```typescript
// Use Zod, Yup, or similar
import { z } from 'zod';

const UserInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  age: z.number().min(0).max(150),
});

function createUser(input: unknown) {
  const validated = UserInput.parse(input); // Throws if invalid
  // ... safe to use validated data
}
```

## Output Encoding

### Prevent XSS
```typescript
// ❌ NEVER insert raw HTML
element.innerHTML = userInput;

// ✅ ALWAYS encode output
element.textContent = userInput;
// Or use framework escaping (React does this automatically)
```

### API Responses
```typescript
// ❌ NEVER expose internal errors
catch (error) {
  res.status(500).json({ error: error.stack }); // Leaks implementation details
}

// ✅ ALWAYS use generic messages
catch (error) {
  console.error('Internal error:', error); // Log for debugging
  res.status(500).json({ error: 'Internal server error' }); // Generic to user
}
```

## Authentication & Authorization

### Password Handling
```typescript
// ❌ NEVER store plain passwords
const user = { email, password }; // Plain text!

// ✅ ALWAYS hash passwords
import bcrypt from 'bcrypt';
const hashedPassword = await bcrypt.hash(password, 12);
const user = { email, password: hashedPassword };

// Verify with timing-safe comparison
const isValid = await bcrypt.compare(inputPassword, user.password);
```

### Session Security
```typescript
// JWT best practices
const token = jwt.sign(
  { userId: user.id },
  process.env.JWT_SECRET,
  {
    expiresIn: '1h',        // Short expiration
    algorithm: 'HS256',     // Explicit algorithm
  }
);

// Cookie settings for sessions
res.cookie('session', token, {
  httpOnly: true,           // No JS access
  secure: true,             // HTTPS only
  sameSite: 'strict',       // CSRF protection
  maxAge: 3600000,          // 1 hour
});
```

### Authorization Checks
```typescript
// ❌ NEVER skip authz checks
app.delete('/users/:id', async (req, res) => {
  await db.deleteUser(req.params.id); // Anyone can delete any user!
});

// ✅ ALWAYS verify authorization
app.delete('/users/:id', requireAuth, async (req, res) => {
  const userId = req.params.id;
  if (req.user.id !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await db.deleteUser(userId);
});
```

## Dependency Security

### Keep Dependencies Updated
```bash
# Check for vulnerabilities
npm audit
pip-audit
go mod verify
```

### Minimize Dependencies
- Fewer deps = smaller attack surface
- Prefer well-maintained packages
- Review package before adding

## Supply Chain Security

### Dependency Management
```bash
# Audit dependencies regularly
npm audit                    # Node.js
pip-audit                    # Python
go list -m all | nancy sleuth  # Go

# Lock dependency versions
npm ci                       # Use lockfile
pip install --require-hashes # Verify hashes
```

### SBOM (Software Bill of Materials)
Generate SBOMs for production releases:
```bash
# Generate SBOM with Trivy
trivy fs . --format cyclonedx --output sbom.json

# Or with syft
syft . -o cyclonedx-json > sbom.json
```

### Signed Commits
Enable GPG signing for commits:
```bash
git config --global commit.gpgsign true
git config --global user.signingkey YOUR_KEY_ID
```

## Container Security

### Dockerfile Best Practices
```dockerfile
# ❌ AVOID
FROM node:latest
USER root
COPY . .

# ✅ PREFER
FROM node:20-alpine AS builder
# ... build steps ...

FROM node:20-alpine
RUN addgroup -g 1001 app && adduser -u 1001 -G app -s /bin/sh -D app
USER app
COPY --from=builder --chown=app:app /app/dist ./dist
```

### Image Scanning
```bash
# Scan container images
trivy image myapp:latest
grype myapp:latest
```

## AI/LLM Security

### Prompt Injection Prevention
```typescript
// ❌ NEVER pass raw user input to system prompts
const prompt = `You are helpful. User: ${userInput}`;

// ✅ ALWAYS sanitize and separate
const sanitized = sanitizeInput(userInput);
const messages = [
  { role: 'system', content: FIXED_SYSTEM_PROMPT },
  { role: 'user', content: sanitized },
];
```

### LLM Output Validation
```typescript
// Always validate LLM outputs before use
const output = await llm.generate(prompt);

// Don't execute generated code without sandboxing
// Don't trust generated URLs without validation
// Don't expose raw outputs to users without filtering
```

### Data Classification for AI
| Classification | Can Send to External AI? |
|----------------|-------------------------|
| Public | ✅ Yes |
| Internal | ⚠️ With approval |
| Confidential | ❌ No |
| Restricted | ❌ Never |

## Security Checklist

Before shipping:
- [ ] No secrets in code or commits
- [ ] All user input validated
- [ ] Output properly encoded
- [ ] Auth checks on protected routes
- [ ] Passwords hashed (bcrypt/argon2)
- [ ] HTTPS enforced in production
- [ ] Dependencies audited
- [ ] Error messages don't leak internals
- [ ] SBOM generated for release
- [ ] Container images scanned
- [ ] Pre-commit hooks installed
- [ ] Security headers configured (CSP, HSTS, etc.)

## Security Scanning in CI

The template includes automated security scanning:
- **SAST:** Semgrep for code analysis
- **SCA:** Trivy for dependency scanning
- **Secrets:** Gitleaks for credential detection
- **Containers:** Trivy for image scanning
- **IaC:** Checkov for infrastructure code

See `.github/workflows/security.yml` for configuration.
