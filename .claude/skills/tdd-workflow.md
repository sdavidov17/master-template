# TDD Workflow Skill

This skill guides test-driven development using the RED → GREEN → REFACTOR cycle.

## The TDD Cycle

```
    ┌─────────────────────────────────┐
    │                                 │
    ▼                                 │
  ┌─────┐    ┌───────┐    ┌──────────┐
  │ RED │───►│ GREEN │───►│ REFACTOR │
  └─────┘    └───────┘    └──────────┘
    │                           │
    │◄──────────────────────────┘
    │
    └── Repeat until feature complete
```

## Phase Details

### RED: Write a Failing Test
**Goal:** Define expected behavior before implementation

1. Write the smallest test that captures one requirement
2. Run the test - it MUST fail
3. Verify it fails for the right reason (not syntax error)

**Example:**
```typescript
// Testing a price calculator
test('calculates total with 10% tax', () => {
  const result = calculateTotal(100, 0.10);
  expect(result).toBe(110);
});
```
```
$ npm test
FAIL: calculateTotal is not defined
```

### GREEN: Make It Pass
**Goal:** Write minimum code to pass the test

1. Write the simplest implementation
2. Don't over-engineer or optimize
3. It's okay to hardcode or use naive solutions
4. Run tests - they MUST pass

**Example:**
```typescript
function calculateTotal(price: number, taxRate: number): number {
  return price + (price * taxRate);
}
```
```
$ npm test
PASS: 1 test passed
```

### REFACTOR: Improve the Code
**Goal:** Clean up while keeping tests green

1. Remove duplication
2. Improve naming
3. Extract utilities
4. Run tests after each change

**Example:**
```typescript
// Refactored with better structure
interface PriceCalculation {
  subtotal: number;
  tax: number;
  total: number;
}

function calculateTotal(price: number, taxRate: number): PriceCalculation {
  const tax = price * taxRate;
  return {
    subtotal: price,
    tax,
    total: price + tax,
  };
}
```

## Test Naming Conventions

Use descriptive names that document behavior:

```typescript
// Pattern: [unit] [expected behavior] [when condition]

// Good
test('calculateTotal returns 110 when price is 100 and tax is 10%', () => {});
test('validateEmail returns false when email lacks @ symbol', () => {});
test('UserService throws AuthError when password is incorrect', () => {});

// Bad
test('test1', () => {});
test('it works', () => {});
test('calculateTotal', () => {});
```

## Test Structure (AAA Pattern)

```typescript
test('description', () => {
  // Arrange - set up test data and dependencies
  const price = 100;
  const taxRate = 0.10;

  // Act - perform the action being tested
  const result = calculateTotal(price, taxRate);

  // Assert - verify the expected outcome
  expect(result.total).toBe(110);
});
```

## Coverage Targets

| Mode | Coverage | Rationale |
|------|----------|-----------|
| MVP | 60% | Core paths covered, fast iteration |
| Growth | 80% | Solid coverage, safe refactoring |
| Scale | 90% | Comprehensive, high confidence |

## What to Test

### ✅ Do Test
- Business logic and calculations
- Edge cases and boundaries
- Error handling paths
- State transitions
- Public API contracts

### ❌ Don't Test
- Framework code (React, Express, etc.)
- Third-party libraries
- Simple getters/setters
- Implementation details
- Private methods directly

## Test Types by Layer

```
┌─────────────────────────────────────┐
│          E2E Tests (few)            │  ← User journeys
├─────────────────────────────────────┤
│      Integration Tests (some)       │  ← Component interactions
├─────────────────────────────────────┤
│        Unit Tests (many)            │  ← Individual functions
└─────────────────────────────────────┘
```

## TDD Session Checklist

Before starting:
- [ ] Clear understanding of requirement
- [ ] Test file created/ready
- [ ] Test runner configured and working

During RED phase:
- [ ] Test describes expected behavior
- [ ] Test fails when run
- [ ] Failure is for the right reason

During GREEN phase:
- [ ] Implementation is minimal
- [ ] Test passes
- [ ] No other tests broken

During REFACTOR phase:
- [ ] Code is cleaner/clearer
- [ ] Tests still pass
- [ ] No functionality changed

## Common TDD Mistakes

1. **Writing tests after code** - Defeats the purpose; tests just verify existing bugs
2. **Making tests pass with hacks** - Green phase should be simple, not clever
3. **Skipping refactor** - Tech debt accumulates; refactor while context is fresh
4. **Testing too much at once** - Each cycle should test ONE behavior
5. **Testing implementation** - Test outcomes, not how code achieves them
