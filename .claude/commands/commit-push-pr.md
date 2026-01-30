# /commit-push-pr Command

Commit changes, push to remote, and create a pull request in one flow.

This is Boris Cherny's most-used command - "dozens of times every day."

## Usage
```
/commit-push-pr [optional: PR title]
```

## Workflow

### 1. Pre-compute Context
Gather information before prompting:
```bash
# Get current state
git status --short
git diff --stat
git log --oneline -3
git branch --show-current
```

### 2. Validate Ready to Ship
- [ ] No uncommitted changes that shouldn't be included
- [ ] Tests pass
- [ ] Lint passes
- [ ] On feature branch (not main)

### 3. Stage and Commit
```bash
# Stage all changes
git add .

# Commit with conventional message
git commit -m "type: description"
```

### 4. Push to Remote
```bash
# Push with upstream tracking
git push -u origin $(git branch --show-current)
```

### 5. Create Pull Request
```bash
# Create PR using GitHub CLI
gh pr create --fill
# Or with specific title/body
gh pr create --title "feat: description" --body "## Summary\n..."
```

## Inline Bash Version

For maximum efficiency, this command pre-computes git status:

```bash
#!/bin/bash
# Pre-compute context for Claude
echo "=== Current Branch ==="
git branch --show-current

echo "=== Status ==="
git status --short

echo "=== Recent Commits ==="
git log --oneline -5

echo "=== Diff Stats ==="
git diff --stat HEAD~1 2>/dev/null || git diff --stat

echo "=== Remote ==="
git remote -v | head -2
```

## Output Format

```markdown
## Commit-Push-PR Complete

### Commit
- Hash: `abc1234`
- Message: `feat: add user authentication`
- Files: 5 changed, 120 insertions, 30 deletions

### Push
- Branch: `feature/user-auth`
- Remote: `origin`
- Status: ✅ Pushed

### Pull Request
- URL: https://github.com/owner/repo/pull/42
- Title: feat: add user authentication
- Status: ✅ Created

### Next Steps
- [ ] Request review from teammate
- [ ] Wait for CI to pass
- [ ] Merge when approved
```

## Example Session

```
> /commit-push-pr

Analyzing changes...
- 3 files modified
- 1 file added
- 45 lines added, 12 removed

Suggested commit message:
  feat: add password reset flow

Proceed? (y/n) y

✅ Committed: abc1234
✅ Pushed to origin/feature/password-reset
✅ PR created: https://github.com/owner/repo/pull/42

PR Summary:
## Summary
- Add password reset request endpoint
- Add email sending service
- Add reset token validation

## Testing
- Unit tests for token generation
- Integration test for full flow
```

## Tips

1. **Use frequently** - This should be your go-to for landing changes
2. **Small PRs** - Aim for PRs under 400 lines
3. **Clear commits** - Let Claude suggest the commit message based on diff
4. **Auto-fill** - Use `gh pr create --fill` to auto-populate from commits
