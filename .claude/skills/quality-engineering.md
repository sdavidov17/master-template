# Quality Engineering Skill

Comprehensive guidance for testing strategies, quality assurance practices, and quality gates.

## Testing Pyramid

### Distribution Guidelines

```
        ┌───────┐
        │  E2E  │  10% - Full system tests
        │ Tests │  Slow, expensive, flaky-prone
        └───┬───┘
        ┌───┴───┐
        │ Integ │  20% - Component interactions
        │ Tests │  Database, API, services
        └───┬───┘
    ┌───────┴───────┐
    │  Unit Tests   │  70% - Isolated functions
    │               │  Fast, reliable, focused
    └───────────────┘
```

### Test Type Characteristics

| Type | Speed | Isolation | Confidence | Cost |
|------|-------|-----------|------------|------|
| Unit | Fast (<100ms) | Complete | Low-Medium | Low |
| Integration | Medium (1-10s) | Partial | Medium-High | Medium |
| E2E | Slow (10-60s) | None | High | High |

### When to Use Each Type

**Unit Tests:**
- Pure functions
- Business logic
- Data transformations
- Utility functions
- State management

**Integration Tests:**
- API endpoints
- Database operations
- Service interactions
- Middleware chains
- Authentication flows

**E2E Tests:**
- Critical user journeys
- Payment flows
- Sign up/login
- Core workflows
- Cross-browser compatibility

## Test Quality Metrics

### Coverage Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Line Coverage | % of lines executed | 80%+ |
| Branch Coverage | % of branches taken | 70%+ |
| Function Coverage | % of functions called | 80%+ |
| Statement Coverage | % of statements executed | 80%+ |

### Beyond Coverage

Coverage alone doesn't guarantee quality. Also track:

1. **Mutation Score** - % of mutations caught by tests
2. **Test-to-Code Ratio** - Lines of test per line of code
3. **Flakiness Rate** - % of tests that fail intermittently
4. **Test Execution Time** - Total time to run suite

## Writing Effective Tests

### Unit Test Pattern (AAA)

```typescript
describe('calculateTotal', () => {
  it('applies discount to order total', () => {
    // Arrange - Set up test data
    const items = [
      { price: 100, quantity: 2 },
      { price: 50, quantity: 1 },
    ];
    const discount = 0.1; // 10%

    // Act - Execute the function
    const result = calculateTotal(items, discount);

    // Assert - Verify the outcome
    expect(result).toBe(225); // (200 + 50) * 0.9
  });
});
```

### Integration Test Pattern

```typescript
describe('POST /api/orders', () => {
  let db: Database;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterEach(async () => {
    await db.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  it('creates an order and updates inventory', async () => {
    // Arrange
    await db.seed({
      products: [{ id: 'prod-1', stock: 10 }],
    });

    // Act
    const response = await request(app)
      .post('/api/orders')
      .send({ productId: 'prod-1', quantity: 2 });

    // Assert - Response
    expect(response.status).toBe(201);
    expect(response.body.orderId).toBeDefined();

    // Assert - Side effects
    const product = await db.products.findById('prod-1');
    expect(product.stock).toBe(8);
  });
});
```

### E2E Test Pattern

```typescript
test('user can complete checkout', async ({ page }) => {
  // Navigate to product
  await page.goto('/products/widget');

  // Add to cart
  await page.click('[data-testid="add-to-cart"]');
  await expect(page.locator('.cart-count')).toHaveText('1');

  // Go to checkout
  await page.click('[data-testid="checkout"]');

  // Fill payment details
  await page.fill('[name="cardNumber"]', '4242424242424242');
  await page.fill('[name="expiry"]', '12/25');
  await page.fill('[name="cvc"]', '123');

  // Complete order
  await page.click('[data-testid="pay-now"]');

  // Verify success
  await expect(page).toHaveURL(/\/order-confirmation/);
  await expect(page.locator('.order-number')).toBeVisible();
});
```

## Test Data Management

### Strategies

| Strategy | Use When | Pros | Cons |
|----------|----------|------|------|
| Fixtures | Static data | Fast, predictable | Can get stale |
| Factories | Dynamic data | Flexible | More setup |
| Builders | Complex objects | Readable | Verbose |
| Fakers | Random data | Edge cases | Non-deterministic |

### Factory Pattern Example

```typescript
// factories/user.ts
import { faker } from '@faker-js/faker';

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: 'user',
    createdAt: new Date(),
    ...overrides,
  };
}

// Usage in tests
const user = createUser({ role: 'admin' });
```

### Builder Pattern Example

```typescript
// builders/order.ts
class OrderBuilder {
  private order: Partial<Order> = {};

  withCustomer(customer: Customer): this {
    this.order.customer = customer;
    return this;
  }

  withItems(items: OrderItem[]): this {
    this.order.items = items;
    return this;
  }

  withDiscount(percent: number): this {
    this.order.discount = percent;
    return this;
  }

  build(): Order {
    return {
      id: faker.string.uuid(),
      customer: this.order.customer ?? createCustomer(),
      items: this.order.items ?? [],
      discount: this.order.discount ?? 0,
      status: 'pending',
    };
  }
}

// Usage
const order = new OrderBuilder()
  .withCustomer(vipCustomer)
  .withItems([expensiveItem])
  .withDiscount(20)
  .build();
```

## Mutation Testing

### What It Tests

Mutation testing verifies test quality by making small changes (mutations) to code and checking if tests catch them.

### Common Mutations

| Mutation | Original | Mutated |
|----------|----------|---------|
| Arithmetic | `a + b` | `a - b` |
| Comparison | `a > b` | `a >= b` |
| Boolean | `a && b` | `a || b` |
| Negation | `!condition` | `condition` |
| Return | `return x` | `return null` |
| Remove | `if (x) {...}` | `{...}` |

### Interpreting Results

```
Mutation Score = (Killed Mutations / Total Mutations) * 100

Score > 80%: Good test quality
Score 60-80%: Acceptable, room for improvement
Score < 60%: Tests may be superficial
```

### Running Mutation Tests

**JavaScript (Stryker):**
```bash
npx stryker run
```

**Python (mutmut):**
```bash
mutmut run
mutmut results
```

**Go (go-mutesting):**
```bash
go-mutesting ./...
```

## Contract Testing

### Consumer-Driven Contracts

```
Consumer (Frontend) ──defines──▶ Contract ◀──verifies── Provider (API)
```

### Benefits

1. **Decoupled testing** - Teams test independently
2. **Fast feedback** - No need for integrated environments
3. **Documentation** - Contracts document API behavior
4. **Breaking change detection** - Catch incompatibilities early

### Implementation Steps

1. Consumer writes contract tests (what it expects)
2. Contract is published to broker
3. Provider verifies against contracts
4. CI/CD gates deployment on verification

## Accessibility Testing

### WCAG Compliance Levels

| Level | Criteria | Required For |
|-------|----------|--------------|
| A | 30 criteria | Minimum compliance |
| AA | 20 additional | Legal requirements |
| AAA | 28 additional | Enhanced accessibility |

### Automated Testing Coverage

```
Automated tools catch ~30-50% of accessibility issues

Must also manually test:
- Keyboard navigation
- Screen reader experience
- Cognitive accessibility
- Motion/animation preferences
```

### Key Areas to Test

1. **Perceivable**
   - Text alternatives for images
   - Captions for video
   - Color contrast

2. **Operable**
   - Keyboard accessible
   - No seizure triggers
   - Navigable

3. **Understandable**
   - Readable content
   - Predictable behavior
   - Input assistance

4. **Robust**
   - Valid markup
   - Compatible with assistive tech

## Quality Gates

### Pre-Commit

```yaml
checks:
  - lint
  - format
  - type-check
  - unit-tests
  - secret-scan
```

### Pre-Push

```yaml
checks:
  - all-tests
  - coverage-threshold
  - security-scan
```

### CI Pipeline

```yaml
stages:
  - build
  - unit-tests (coverage gate)
  - integration-tests
  - security-scan
  - accessibility-scan
  - e2e-tests
  - mutation-tests (optional)
  - deploy (if all pass)
```

### Coverage Gate Configuration

**MVP Mode:**
```yaml
coverage:
  lines: 60
  branches: 50
  functions: 60
```

**Growth Mode:**
```yaml
coverage:
  lines: 80
  branches: 70
  functions: 80
```

**Scale Mode:**
```yaml
coverage:
  lines: 90
  branches: 85
  functions: 90
```

## Flaky Test Management

### Identifying Flaky Tests

```bash
# Run tests multiple times
for i in {1..10}; do npm test; done

# Track failure rates
npm test -- --reporter=flaky-reporter
```

### Common Causes

1. **Race conditions** - Async operations not properly awaited
2. **Shared state** - Tests affecting each other
3. **Time dependencies** - Tests fail at certain times
4. **External services** - Network dependencies
5. **Order dependencies** - Tests must run in sequence

### Fixing Strategies

```typescript
// ❌ Flaky - timing dependent
await page.click('button');
await page.waitForTimeout(1000);
expect(await page.textContent('.result')).toBe('Done');

// ✅ Stable - event driven
await page.click('button');
await expect(page.locator('.result')).toHaveText('Done');
```

```typescript
// ❌ Flaky - shared state
let counter = 0;

test('increments counter', () => {
  counter++;
  expect(counter).toBe(1);  // Fails if other test ran first
});

// ✅ Stable - isolated state
test('increments counter', () => {
  const counter = createCounter();
  counter.increment();
  expect(counter.value).toBe(1);
});
```

## Test Documentation

### What to Document

```typescript
/**
 * Tests for the payment processing module.
 *
 * Setup:
 * - Requires Stripe test API keys in .env.test
 * - Uses test database (automatically cleaned between tests)
 *
 * Coverage:
 * - Successful payments
 * - Failed payments (various failure modes)
 * - Refunds
 * - Webhooks
 *
 * Not covered (manual testing required):
 * - 3D Secure flows
 * - Currency conversion
 */
describe('PaymentService', () => {
  // ...
});
```

## Use This Skill When

- Setting up testing infrastructure for a new project
- Improving test quality and coverage
- Implementing mutation testing
- Adding accessibility testing
- Debugging flaky tests
- Defining quality gates for CI/CD
