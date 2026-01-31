---
name: test-coverage
description: Run tests with coverage analysis and enforce coverage thresholds based on architecture mode.
---

# /test-coverage Command

Run tests with coverage analysis and enforce coverage thresholds.

## Trigger
User runs `/test-coverage` or asks to "check coverage", "run tests with coverage", "analyze test coverage"

## Workflow

### Step 1: Detect Project Type
Identify the project language and testing framework:

```bash
# Node.js (Vitest, Jest)
if [ -f "package.json" ]; then
  if grep -q "vitest" package.json; then
    TEST_CMD="npx vitest run --coverage"
  elif grep -q "jest" package.json; then
    TEST_CMD="npx jest --coverage"
  fi
fi

# Python (pytest)
if [ -f "pyproject.toml" ] || [ -f "requirements.txt" ]; then
  TEST_CMD="python -m pytest --cov --cov-report=term-missing --cov-report=html"
fi

# Go
if [ -f "go.mod" ]; then
  TEST_CMD="go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out -o coverage.html"
fi
```

### Step 2: Determine Coverage Threshold
Based on architecture mode from CLAUDE.md:

| Mode | Line Coverage | Branch Coverage |
|------|--------------|-----------------|
| MVP | 60% | 50% |
| Growth | 80% | 70% |
| Scale | 90% | 85% |

### Step 3: Run Tests with Coverage
Execute tests and collect coverage data:

**Node.js (Vitest):**
```bash
npx vitest run --coverage --coverage.reporter=text --coverage.reporter=html
```

**Node.js (Jest):**
```bash
npx jest --coverage --coverageReporters=text --coverageReporters=html
```

**Python:**
```bash
python -m pytest --cov=src --cov-report=term-missing --cov-report=html --cov-fail-under=80
```

**Go:**
```bash
go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out
```

### Step 4: Analyze Results
Parse coverage output and provide insights:

1. **Overall Coverage** - Line and branch coverage percentages
2. **Files Below Threshold** - List files that need more tests
3. **Uncovered Lines** - Highlight critical uncovered code paths
4. **Trend** - Compare to previous coverage (if available)

### Step 5: Generate Report
Create a summary report:

```markdown
## Coverage Report

**Overall Coverage:** 78.5% (Target: 80%)
**Branch Coverage:** 72.3% (Target: 70%)
**Status:** ⚠️ Below threshold for Growth mode

### Coverage by Module
| Module | Lines | Branches | Status |
|--------|-------|----------|--------|
| src/auth | 92% | 88% | ✅ |
| src/api | 85% | 80% | ✅ |
| src/utils | 65% | 55% | ❌ |
| src/db | 71% | 62% | ⚠️ |

### Files Needing Attention
1. `src/utils/parser.ts` - 45% coverage
   - Lines 23-45: Error handling not tested
   - Lines 78-92: Edge cases not covered

2. `src/db/migrations.ts` - 52% coverage
   - Lines 15-30: Rollback logic not tested

### Recommendations
1. Add tests for error handling in parser.ts
2. Add edge case tests for special characters
3. Add migration rollback tests

### Commands
- View HTML report: `open coverage/index.html`
- Run specific file tests: `npm test -- src/utils/parser.test.ts`
```

## Example Usage

```
User: /test-coverage

Claude: Running tests with coverage analysis...

## Coverage Report

**Overall Coverage:** 82.3% ✅
**Branch Coverage:** 75.1% ✅
**Status:** Meeting Growth mode requirements

### Summary
- 156 tests passed
- 0 tests failed
- Coverage increased by 2.1% since last run

### Coverage by Module
| Module | Lines | Branches | Status |
|--------|-------|----------|--------|
| src/auth | 95% | 90% | ✅ |
| src/api | 88% | 82% | ✅ |
| src/utils | 72% | 65% | ⚠️ |

### Files Below Threshold
- `src/utils/date.ts` - 68% (needs 80%)
  - Uncovered: timezone edge cases (lines 45-52)

### Next Steps
1. Add tests for timezone handling in date.ts
2. Consider adding integration tests for API module

Report generated: `coverage/index.html`
```

## Integration with CI

This command mirrors coverage checks in CI. Configure thresholds in:

**vitest.config.ts:**
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80,
      },
    },
  },
});
```

**jest.config.js:**
```javascript
module.exports = {
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

**pyproject.toml:**
```toml
[tool.pytest.ini_options]
addopts = "--cov=src --cov-fail-under=80"

[tool.coverage.run]
branch = true

[tool.coverage.report]
fail_under = 80
```

## Testing Pyramid Reference

Aim for this distribution:
- **Unit Tests:** 70% of tests (fast, isolated)
- **Integration Tests:** 20% of tests (component interactions)
- **E2E Tests:** 10% of tests (full system, slow)

Coverage targets apply primarily to unit and integration tests.
