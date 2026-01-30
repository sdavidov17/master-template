# Coding Style Rules

Always-follow guidelines for consistent, maintainable code.

## File Organization

### Size Limits
- **Target:** 200-400 lines per file
- **Maximum:** 800 lines per file
- **Split when:** File has multiple responsibilities

### Structure
```
src/
├── components/     # UI components
├── lib/            # Shared utilities
├── services/       # External integrations
├── types/          # Type definitions
└── utils/          # Helper functions
```

## Naming Conventions

### Files
```
# Components (PascalCase)
UserProfile.tsx
LoginForm.tsx

# Utilities (camelCase)
formatDate.ts
validateEmail.ts

# Constants (SCREAMING_SNAKE or kebab-case)
config/api-endpoints.ts
constants/ERROR_CODES.ts
```

### Variables and Functions
```typescript
// Variables: camelCase, descriptive
const userEmail = 'test@example.com';
const isAuthenticated = true;
const maxRetryCount = 3;

// Functions: camelCase, verb prefix
function getUserById(id: string) {}
function validateEmail(email: string) {}
function calculateTotalPrice(items: Item[]) {}

// Booleans: is/has/can/should prefix
const isLoading = true;
const hasPermission = false;
const canEdit = user.role === 'admin';
```

### Types and Interfaces
```typescript
// PascalCase for types
interface User {
  id: string;
  email: string;
}

type UserRole = 'admin' | 'user' | 'guest';

// Prefix interfaces with I only if needed to distinguish
// Generally prefer no prefix
interface UserService {} // Not IUserService
```

## Code Style

### Immutability Preferred
```typescript
// ❌ Mutation
function addItem(cart: Item[], item: Item) {
  cart.push(item); // Mutates original
  return cart;
}

// ✅ Immutable
function addItem(cart: Item[], item: Item): Item[] {
  return [...cart, item]; // Returns new array
}
```

### Early Returns
```typescript
// ❌ Nested conditions
function processUser(user: User | null) {
  if (user) {
    if (user.isActive) {
      if (user.hasPermission) {
        return doSomething(user);
      }
    }
  }
  return null;
}

// ✅ Early returns
function processUser(user: User | null) {
  if (!user) return null;
  if (!user.isActive) return null;
  if (!user.hasPermission) return null;

  return doSomething(user);
}
```

### Explicit Over Implicit
```typescript
// ❌ Magic values
if (status === 1) {}
setTimeout(fn, 86400000);

// ✅ Named constants
const STATUS_ACTIVE = 1;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

if (status === STATUS_ACTIVE) {}
setTimeout(fn, ONE_DAY_MS);
```

### Function Size
```typescript
// ❌ Large function doing many things
function processOrder(order) {
  // 100 lines of validation
  // 50 lines of calculation
  // 30 lines of database operations
  // 20 lines of email sending
}

// ✅ Small focused functions
function processOrder(order) {
  const validated = validateOrder(order);
  const calculated = calculateTotals(validated);
  const saved = await saveOrder(calculated);
  await sendConfirmation(saved);
  return saved;
}
```

## Error Handling

### Use Typed Errors
```typescript
// Define specific error types
class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}
```

### Handle Errors Explicitly
```typescript
// ❌ Swallowing errors
try {
  await riskyOperation();
} catch (e) {
  // Silent failure
}

// ✅ Handle or rethrow
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof ValidationError) {
    return { success: false, error: error.message };
  }
  // Rethrow unexpected errors
  throw error;
}
```

## Comments

### When to Comment
```typescript
// ✅ Explain WHY, not WHAT
// Using retry because external API has intermittent failures
const MAX_RETRIES = 3;

// ✅ Document non-obvious behavior
// Returns -1 when item not found (matches Array.indexOf behavior)
function findIndex(items: Item[], predicate: Predicate): number {}

// ❌ Don't explain obvious code
// Loop through users (obvious from code)
for (const user of users) {}

// ❌ Don't leave commented-out code
// const oldImplementation = () => {};
```

## Type Safety

### Avoid `any`
```typescript
// ❌ Using any
function process(data: any) {
  return data.foo.bar; // No type checking
}

// ✅ Use proper types
function process(data: ProcessInput): ProcessOutput {
  return data.foo.bar; // Type checked
}

// If type unknown, use unknown and narrow
function process(data: unknown) {
  if (isValidInput(data)) {
    return data.foo.bar;
  }
  throw new Error('Invalid input');
}
```

### Prefer Strict Mode
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```
