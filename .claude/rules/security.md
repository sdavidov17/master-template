# Security Rules

Always-follow guidelines for secure code.

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

```typescript
// Validate required env vars
const required = ['DATABASE_URL', 'API_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}
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
