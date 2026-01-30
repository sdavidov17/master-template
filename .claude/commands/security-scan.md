# /security-scan Command

Run comprehensive security scanning on the codebase.

## Trigger
User runs `/security-scan` or asks to "check security", "scan for vulnerabilities", "audit security"

## Workflow

### Step 1: Environment Detection
Detect the project type and available security tools:

```bash
# Check for Node.js
if [ -f "package.json" ]; then
  echo "Node.js project detected"
fi

# Check for Python
if [ -f "pyproject.toml" ] || [ -f "requirements.txt" ]; then
  echo "Python project detected"
fi

# Check for Go
if [ -f "go.mod" ]; then
  echo "Go project detected"
fi

# Check for Docker
if [ -f "Dockerfile" ]; then
  echo "Dockerfile detected"
fi
```

### Step 2: Secret Scanning
Scan for hardcoded secrets:

```bash
# Using gitleaks (if installed)
gitleaks detect --source . --verbose

# Or using grep for common patterns (fallback)
grep -rn "password\s*=" --include="*.ts" --include="*.js" --include="*.py" .
grep -rn "api_key\s*=" --include="*.ts" --include="*.js" --include="*.py" .
grep -rn "secret\s*=" --include="*.ts" --include="*.js" --include="*.py" .
```

### Step 3: Dependency Scanning
Check for vulnerable dependencies:

**Node.js:**
```bash
npm audit --json
# Or with more detail
npm audit --audit-level=moderate
```

**Python:**
```bash
pip-audit
# Or
safety check
```

**Go:**
```bash
go list -m all | nancy sleuth
# Or
govulncheck ./...
```

### Step 4: SAST Scanning
Run static analysis:

```bash
# Using semgrep (if installed)
semgrep --config auto .

# Language-specific alternatives:
# Node.js: eslint with security plugin
# Python: bandit
# Go: gosec
```

### Step 5: Generate Report
Compile findings into a structured report:

```markdown
## Security Scan Report

**Date:** [timestamp]
**Scanned:** [file count] files

### Summary
| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Secrets  | X        | X    | X      | X   |
| Dependencies | X   | X    | X      | X   |
| Code Issues | X    | X    | X      | X   |

### Findings

#### Critical
- [List critical findings]

#### High
- [List high findings]

#### Recommendations
1. [Prioritized recommendations]
```

## Output Format

Provide a clear, actionable report:

1. **Executive Summary** - Overall security posture
2. **Critical Issues** - Must fix immediately
3. **High Issues** - Fix before deployment
4. **Recommendations** - Improvements to consider
5. **Next Steps** - Specific actions to take

## Example Usage

```
User: /security-scan

Claude: Running security scan on the codebase...

## Security Scan Report

**Scanned:** 47 files in 12 directories

### Summary
| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Secrets  | 0        | 0    | 1      | 0   |
| Dependencies | 0   | 2    | 5      | 3   |
| Code Issues | 0    | 1    | 3      | 2   |

### Critical Findings
None detected ✅

### High Findings
1. **Vulnerable Dependency:** lodash@4.17.20
   - CVE-2021-23337: Prototype pollution
   - Fix: `npm update lodash`

2. **SQL Injection Risk:** src/db/queries.ts:45
   - User input concatenated in query
   - Fix: Use parameterized queries

### Recommendations
1. Update all dependencies with known vulnerabilities
2. Add input validation to API endpoints
3. Enable npm audit in CI pipeline

### Next Steps
Run `npm audit fix` to automatically fix 7 of 10 dependency issues.
```

## Integration with CI

This command mirrors what runs in `.github/workflows/security.yml`:
- Semgrep for SAST
- Trivy for SCA
- Gitleaks for secrets

Use this command locally before pushing to catch issues early.
