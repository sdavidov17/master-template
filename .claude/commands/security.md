---
name: security
description: Security review following OWASP Top 10 2025 guidelines.
argument-hint: [file or feature]
---

# Security Review

Perform a security-focused review following OWASP guidelines and industry best practices.

## Instructions

When the user runs `/security`, conduct a security audit of the specified code or feature:

### 1. OWASP Top 10 2025 Check

| Risk | What to Check |
|------|---------------|
| A01: Broken Access Control | Authorization on all endpoints, RBAC implementation |
| A02: Cryptographic Failures | Encryption at rest/transit, key management, hashing |
| A03: Injection | SQL, NoSQL, OS, LDAP injection vectors |
| A04: Insecure Design | Threat modeling gaps, missing security controls |
| A05: Security Misconfiguration | Default credentials, unnecessary features, error handling |
| A06: Vulnerable Components | Outdated dependencies, known CVEs |
| A07: Auth Failures | Session management, password policies, MFA |
| A08: Software/Data Integrity | Unsigned code, unverified updates, CI/CD security |
| A09: Logging Failures | Missing audit logs, sensitive data in logs |
| A10: SSRF | URL validation, allowlisting, DNS rebinding |

### 2. Secret Detection
- Hardcoded credentials
- API keys in code
- Private keys
- Connection strings

### 3. Input Validation
- Boundary checking
- Type validation
- Sanitization
- Allowlisting vs denylisting

### 4. Authentication & Authorization
- Password storage (bcrypt/argon2)
- Session security (HttpOnly, Secure, SameSite)
- Token management (JWT best practices)
- Permission checks

### 5. Data Protection
- PII handling
- Encryption requirements
- Data retention
- GDPR/CCPA considerations

## Output Format

```markdown
## Security Review: [Feature/File Name]

### Risk Level: [Critical/High/Medium/Low]

### Vulnerabilities Found

#### Critical
[Immediate action required]

#### High
[Fix before production]

#### Medium
[Should be addressed]

#### Low
[Informational]

### Security Checklist
- [ ] No hardcoded secrets
- [ ] Input validation on all user inputs
- [ ] Output encoding for XSS prevention
- [ ] Parameterized queries (no SQL injection)
- [ ] Authorization checks on resources
- [ ] Secure session configuration
- [ ] Proper error handling (no stack traces)
- [ ] Audit logging in place

### Recommendations
[Specific fixes and improvements]
```

## Usage

```
/security                           # Review recent changes
/security src/auth/                 # Review auth module
/security --focus=injection         # Focus on injection vulnerabilities
/security --compliance=hipaa        # Include HIPAA requirements
```
