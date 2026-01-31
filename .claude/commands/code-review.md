---
name: code-review
description: Thorough code review checking quality, security, performance, and tests.
argument-hint: [file or feature]
---

# Code Review

Perform a thorough code review following project conventions and best practices.

## Instructions

When the user runs `/code-review`, perform a comprehensive review of the specified files or recent changes:

### 1. Code Quality
- Readability and clarity
- Function/method length (target: <20 lines)
- File length (target: 200-400 lines, max 800)
- Naming conventions
- Code duplication (DRY principle)

### 2. Logic & Correctness
- Edge case handling
- Null/undefined checks
- Off-by-one errors
- Race conditions
- Error handling completeness

### 3. Performance
- Algorithm complexity (O notation)
- Unnecessary iterations
- Memory leaks potential
- Database query efficiency (N+1 problems)
- Caching opportunities

### 4. Security (OWASP Top 10)
- Input validation
- Output encoding
- SQL injection risks
- XSS vulnerabilities
- Authentication/Authorization gaps
- Hardcoded secrets

### 5. Testing
- Test coverage gaps
- Missing edge case tests
- Test isolation
- Mock appropriateness

### 6. Architecture
- Single Responsibility Principle
- Dependency injection
- Coupling and cohesion
- API contract stability

## Output Format

```markdown
## Code Review: [File/Feature Name]

### Summary
[1-2 sentence overview]

### Critical Issues
[Must fix before merge]

### Suggestions
[Improvements to consider]

### Positive Highlights
[What was done well]

### Checklist
- [ ] No security vulnerabilities
- [ ] Error handling is complete
- [ ] Tests cover new functionality
- [ ] No obvious performance issues
- [ ] Code follows project conventions
```

## Review Depth Levels

- `quick` - Focus on critical issues only (security, bugs)
- `standard` - Normal review (default)
- `thorough` - Deep review including architecture and performance

## Usage

```
/code-review                      # Review staged changes
/code-review src/auth/login.ts    # Review specific file
/code-review --depth=thorough     # Deep review of recent changes
```
