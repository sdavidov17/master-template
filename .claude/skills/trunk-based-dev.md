# Trunk-Based Development Skill

This skill enforces trunk-based development practices for continuous integration and rapid delivery.

## Core Principles

1. **Main is Always Deployable**
   - All code in `main` branch should be production-ready
   - Never commit broken code to main
   - Use feature flags for incomplete features

2. **Short-Lived Branches**
   - Feature branches live < 1 day
   - Merge frequently to avoid drift
   - Delete branches after merge

3. **Small, Frequent Commits**
   - Each commit should be atomic and focused
   - Commit messages explain "why", not "what"
   - Prefer many small PRs over few large ones

## Branch Strategy

```
main (always deployable)
  │
  ├── feature/add-login (< 1 day)
  │     └── merge → main → delete branch
  │
  ├── fix/auth-bug (< 4 hours)
  │     └── merge → main → delete branch
  │
  └── (no long-lived branches)
```

## Workflow

### Small Changes (< 2 hours)
1. Work directly on `main`
2. Run tests before commit
3. Push when green

### Larger Changes (< 1 day)
1. Create feature branch: `git checkout -b feature/name`
2. Make changes with frequent commits
3. Push and create PR
4. Get quick review (or self-review for solo)
5. Squash merge to main
6. Delete feature branch

### Incomplete Features
Use feature flags instead of long-lived branches:
```typescript
if (featureFlags.newDashboard) {
  return <NewDashboard />;
}
return <OldDashboard />;
```

## Commit Message Format

```
<type>: <short description>

[optional body explaining why]

[optional footer with refs]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code change that neither fixes nor adds
- `docs:` - Documentation only
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Examples:**
```
feat: add password reset flow

Users can now request password reset via email.
Implements secure token generation with 1-hour expiry.

Closes #42
```

```
fix: prevent duplicate form submissions

Disable submit button while request is pending.
```

## Anti-Patterns to Avoid

### ❌ Long-Lived Feature Branches
```
main ─────────────────────────────►
  │
  └── feature/big-rewrite (3 weeks old, 50 commits behind)
        └── Massive merge conflicts, integration hell
```

### ❌ Integration Branches
```
main
  └── develop
        └── feature-1
        └── feature-2
        └── (merges to develop, then to main... eventually)
```

### ❌ Release Branches (for most teams)
```
main
  └── release/v1.2
        └── (cherry-picking fixes back and forth)
```

## Merge Strategy

**Squash Merge** (recommended for most PRs):
- Combines all commits into one
- Clean, linear history
- Easy to revert entire features

```bash
# Via GitHub UI: "Squash and merge"
# Or via CLI:
git checkout main
git merge --squash feature/name
git commit -m "feat: feature description"
git branch -d feature/name
```

## Verification Checklist

Before merging to main:
- [ ] Tests pass locally
- [ ] CI pipeline green
- [ ] No merge conflicts
- [ ] Code reviewed (or self-reviewed for solo)
- [ ] Feature flag in place if incomplete
