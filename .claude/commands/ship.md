---
name: ship
description: Validate changes and prepare for merge. Runs pre-merge checklist including tests, lint, and review.
argument-hint: [optional commit message]
---

# /ship Command

Validate changes and prepare for merge to main branch.

## Usage
```
/ship [optional: commit message]
```

## Workflow

### 1. Pre-flight Checks
Run automated validations:
- [ ] Tests pass (`npm test` / `pytest` / `go test`)
- [ ] Lint passes (`npm run lint` / `ruff` / `golint`)
- [ ] Build succeeds (`npm run build` / `go build`)
- [ ] No uncommitted changes

### 2. Code Review
Quick self-review:
- [ ] No debug code (console.log, print statements)
- [ ] No TODO comments for this PR
- [ ] No hardcoded values that should be config

### 3. Git Status
Verify branch state:
- [ ] On feature branch (not main)
- [ ] Up to date with main
- [ ] Clean working directory

### 4. Create/Update PR
If checks pass:
- Push branch to remote
- Create PR with summary
- Request review if needed

## Output Format

```markdown
## Ship Checklist: [Branch Name]

### Automated Checks
| Check | Status |
|-------|--------|
| Tests | ✅ Pass (42 tests) |
| Lint | ✅ Pass |
| Build | ✅ Pass |
| TypeCheck | ✅ Pass |

### Manual Checks
- [x] No debug code found
- [x] No blocking TODOs
- [ ] Documentation updated (if needed)

### Git Status
- Branch: `feature/add-auth`
- Commits ahead of main: 3
- Conflicts: None

### Ready to Ship: YES / NO

### Next Steps
1. `git push origin feature/add-auth`
2. Create PR at: [repo URL]
3. Request review from: @teammate
```

## Example

```
/ship
```

Output:
```markdown
## Ship Checklist: feature/user-auth

### Automated Checks
| Check | Status |
|-------|--------|
| Tests | ✅ Pass (15 tests, 87% coverage) |
| Lint | ✅ Pass |
| Build | ✅ Pass |

### Manual Checks
- [x] No console.log statements
- [x] No blocking TODOs
- [x] API documented

### Git Status
- Branch: `feature/user-auth`
- Commits: 4 ahead of main
- Conflicts: None

### Ready to Ship: YES

### Commit Summary
feat: add user authentication

- Add login/logout endpoints
- Add session management with JWT
- Add password hashing utilities
- Add auth middleware

### Commands to Run
```bash
git push origin feature/user-auth
gh pr create --title "feat: add user authentication" --body "..."
```
```

## Failure Example

```markdown
## Ship Checklist: feature/broken

### Automated Checks
| Check | Status |
|-------|--------|
| Tests | ❌ FAIL (2 failing) |
| Lint | ⚠️ 3 warnings |
| Build | ✅ Pass |

### Ready to Ship: NO

### Blockers
1. Fix failing tests in `auth.test.ts`
2. Address lint warnings

### Run `/review` to see details
```
