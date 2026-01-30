# Git Workflow Rules

Always-follow guidelines for trunk-based development with Git.

## Branch Strategy

### Main Branch
- Always deployable
- Protected from direct pushes (for team repos)
- All changes via PR or direct commit (for solo)

### Feature Branches
- Naming: `feature/short-description`
- Lifetime: < 1 day
- Delete after merge

### Fix Branches
- Naming: `fix/short-description`
- Lifetime: < 4 hours
- Delete after merge

## Commit Messages

### Format
```
<type>: <short description>

[optional body]

[optional footer]
```

### Types
| Type | Use For |
|------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Code restructuring |
| `docs:` | Documentation only |
| `test:` | Adding/updating tests |
| `chore:` | Maintenance, deps |

### Guidelines
- Subject line: 50 chars max, imperative mood
- Body: Explain WHY, not WHAT
- Footer: Reference issues/PRs

### Examples
```
feat: add user password reset flow

Users can now reset their password via email.
- Generates secure token with 1-hour expiry
- Sends reset link to verified email
- Rate-limited to prevent abuse

Closes #42
```

```
fix: prevent race condition in order processing

Orders were occasionally processed twice when users
double-clicked the submit button. Added mutex lock
and disabled button during submission.

Fixes #57
```

```
refactor: extract auth middleware to separate module

No functional changes. Improves testability and
reduces coupling between routes and auth logic.
```

## Pull Request Guidelines

### Title Format
Same as commit message: `type: short description`

### PR Body Template
```markdown
## Summary
Brief description of changes

## Changes
- Change 1
- Change 2

## Testing
How this was tested

## Checklist
- [ ] Tests pass
- [ ] Code reviewed
- [ ] Documentation updated (if needed)
```

### PR Size
- Aim for < 400 lines changed
- Split large changes into stacked PRs
- Each PR should be independently reviewable

## Merge Strategy

### Squash Merge (Recommended)
- Combines all commits into one
- Creates linear history
- Used for most feature PRs

```bash
# Via GitHub: "Squash and merge"
# Via CLI:
git checkout main
git merge --squash feature/name
git commit -m "feat: feature description"
```

### Rebase Merge
- Replays commits onto main
- Preserves individual commits
- Used when commit history is valuable

### Regular Merge
- Creates merge commit
- Preserves branch structure
- Rarely needed for trunk-based dev

## Common Operations

### Start New Feature
```bash
git checkout main
git pull
git checkout -b feature/name
```

### Update Branch with Main
```bash
git checkout feature/name
git fetch origin
git rebase origin/main
# Or: git merge origin/main
```

### Prepare for PR
```bash
# Ensure up to date
git fetch origin
git rebase origin/main

# Push (force if rebased)
git push origin feature/name --force-with-lease
```

### After PR Merged
```bash
git checkout main
git pull
git branch -d feature/name
```

## Conflict Resolution

### Prevention
- Merge main frequently (daily)
- Coordinate on shared files
- Keep branches short-lived

### Resolution
```bash
# During rebase
git rebase origin/main
# ... resolve conflicts in editor ...
git add .
git rebase --continue

# During merge
git merge origin/main
# ... resolve conflicts in editor ...
git add .
git commit
```

## Git Hooks (Optional)

### Pre-commit
```bash
#!/bin/sh
npm run lint
npm test
```

### Commit-msg
```bash
#!/bin/sh
# Validate commit message format
```

## Anti-Patterns

### ❌ Long-Lived Branches
```
main ─────────────────────►
  │
  └── feature (3 weeks old) ← Merge hell
```

### ❌ Large PRs
- Hard to review
- Higher risk of bugs
- Longer time to merge

### ❌ Force Push to Main
```bash
git push --force origin main  # NEVER do this
```

### ❌ Merge Commits from Main
```bash
# Avoid this pattern
git checkout feature
git merge main
git merge main  # Multiple merge commits
git merge main
```

## Safety Rules

1. **Never force push to main**
2. **Never rebase shared branches**
3. **Always pull before push**
4. **Use `--force-with-lease` instead of `--force`**
5. **Delete branches after merge**
