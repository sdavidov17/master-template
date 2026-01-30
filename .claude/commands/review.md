# /review Command

Request a code review for current changes.

## Usage
```
/review [optional: specific file or feature]
```

## Workflow

1. **Identify Changes**
   - Check git diff for modified files
   - List new files created
   - Identify deleted files

2. **Review Each Change**
   - Read through modifications
   - Check against review criteria
   - Note issues by severity

3. **Generate Report**
   - Summarize findings
   - Categorize by severity
   - Provide actionable fixes

4. **Iterate**
   - Address critical issues
   - Re-review if significant changes made

## Review Criteria

### Critical (Must Fix)
- Security vulnerabilities
- Data loss risks
- Breaking changes without migration
- Hardcoded secrets

### Warning (Should Fix)
- Missing error handling
- No tests for new code
- Performance issues
- Code duplication

### Suggestion (Consider)
- Naming improvements
- Code organization
- Documentation gaps

## Output Format

```markdown
## Code Review

### Files Changed
- `path/to/file.ts` (modified)
- `path/to/new.ts` (added)

### Summary
[1-2 sentence overview of changes]

### Findings

#### Critical
1. **[Issue Title]** in `file.ts:42`
   - Problem: Description
   - Fix: Suggested solution
   ```[language]
   // Example fix
   ```

#### Warnings
1. **[Issue Title]** in `file.ts:78`
   - Problem: Description
   - Fix: Suggested solution

#### Suggestions
1. Consider renaming `foo` to `calculateTotal` for clarity

### Tests
- [ ] New tests added for changes
- [ ] Existing tests still pass
- [ ] Coverage meets threshold

### Verdict: APPROVED / NEEDS CHANGES
```

## Example

```
/review src/auth/
```

Output:
```markdown
## Code Review

### Files Changed
- `src/auth/login.ts` (modified)
- `src/auth/session.ts` (added)

### Summary
Added session management with JWT tokens for user authentication.

### Findings

#### Critical
1. **JWT secret hardcoded** in `session.ts:12`
   - Problem: Secret exposed in source code
   - Fix: Move to environment variable
   ```typescript
   // Before
   const SECRET = 'hardcoded-secret';
   // After
   const SECRET = process.env.JWT_SECRET;
   ```

#### Warnings
1. **No token expiration** in `session.ts:25`
   - Problem: Tokens never expire
   - Fix: Add `expiresIn` option

### Verdict: NEEDS CHANGES
```
