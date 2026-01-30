# /tdd Command

Start test-driven development workflow for a feature or bug fix.

## Usage
```
/tdd [feature or bug description]
```

## Workflow

### Phase 1: RED - Write Failing Test
1. Understand the requirement
2. Write a test that describes expected behavior
3. Run test to confirm it fails
4. Verify it fails for the right reason

### Phase 2: GREEN - Make It Pass
1. Write minimum code to pass the test
2. Don't over-engineer
3. Run tests to confirm passing
4. Commit if green

### Phase 3: REFACTOR - Improve
1. Clean up code while tests stay green
2. Extract patterns, improve names
3. Remove duplication
4. Run tests after each change

### Repeat
Continue RED → GREEN → REFACTOR until feature complete.

## Output Format

```markdown
## TDD Session: [Feature Name]

### Cycle 1
**Phase: RED**
```[language]
// Test code
```
**Expected failure:** [Why it should fail]

**Phase: GREEN**
```[language]
// Implementation
```
**Tests passing:** ✅

**Phase: REFACTOR**
- Extracted X to utility
- Renamed Y for clarity
**Tests still passing:** ✅

### Cycle 2
...

### Summary
- Tests written: N
- Coverage: X%
- Confidence: High/Medium/Low
```

## Example

```
/tdd validate email format
```

**Cycle 1 - RED:**
```typescript
test('rejects email without @ symbol', () => {
  expect(validateEmail('invalid')).toBe(false);
});
```
Run: `npm test` → FAIL ✅ (function doesn't exist)

**Cycle 1 - GREEN:**
```typescript
function validateEmail(email: string): boolean {
  return email.includes('@');
}
```
Run: `npm test` → PASS ✅

**Cycle 1 - REFACTOR:**
```typescript
// No refactoring needed yet, code is minimal
```

**Cycle 2 - RED:**
```typescript
test('rejects email without domain', () => {
  expect(validateEmail('user@')).toBe(false);
});
```
...and so on
