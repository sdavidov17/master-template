# Hooks Quick Reference

Fast lookup for what's protected and why.

## Protection Matrix

| Operation | Guard | Action | Reason |
|-----------|-------|--------|--------|
| `rm -rf /` | block_dangerous_rm | Block | System destruction |
| `rm -rf ~` | block_dangerous_rm | Block | User data loss |
| `git push --force main` | block_force_push | Block | History loss |
| `git push --force` (any) | block_force_push | Warn | Suggests --force-with-lease |
| Deploy to production | warn_production | Warn | Needs verification |
| Edit `.env` | protect_sensitive_files | Block | Contains secrets |
| Edit `*.pem` / `*.key` | protect_sensitive_files | Block | Private keys |
| Edit `package.json` | protect_sensitive_files | Warn | Dependency changes |
| Edit `*.test.ts` | warn_test_changes | Warn | Test modifications |
| Edit `schema.prisma` | protect_critical_files | Warn | Schema changes |
| Edit `Dockerfile` | protect_critical_files | Warn | Container config |
| Edit `.github/workflows/` | protect_critical_files | Warn | CI/CD changes |
| Write AWS key | detect_hardcoded_secrets | Block | Secret in code |
| Write GitHub token | detect_hardcoded_secrets | Block | Secret in code |
| Write JWT | detect_hardcoded_secrets | Warn | Might be test token |

## Hook Trigger Points

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code Session                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Request                                                │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────┐                                            │
│  │ PreToolUse  │◄── Guards check BEFORE tool runs           │
│  │   Hooks     │    (can BLOCK or WARN)                     │
│  └──────┬──────┘                                            │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────┐                                            │
│  │    Tool     │    Bash, Write, Edit, etc.                 │
│  │  Execution  │                                            │
│  └──────┬──────┘                                            │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────┐                                            │
│  │ PostToolUse │◄── Guards check AFTER tool runs            │
│  │   Hooks     │    (format code, detect secrets)           │
│  └──────┬──────┘                                            │
│         │                                                    │
│         ▼                                                    │
│  Continue or respond                                         │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Session End                                                 │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────┐                                            │
│  │    Stop     │◄── Reminders and cleanup                   │
│  │   Hooks     │    (tests, /reflect reminder)              │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

## Exit Codes

| Code | Meaning | Visual |
|------|---------|--------|
| `0` | Allow | No output |
| `1` | Warn | Yellow warning message |
| `2` | Block | Red block message |

## Files

| File | Purpose |
|------|---------|
| `.claude/settings.json` | Hook configuration |
| `.claude/scripts/guards/*.sh` | Guard scripts |
| `.claude/HOOKS.md` | Full documentation |

## Quick Customization

### Disable a guard temporarily

Comment it out in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          // { "type": "command", "command": "..." }
        ]
      }
    ]
  }
}
```

### Add a project-specific block

Edit the appropriate guard script or create a new one:

```bash
# In .claude/scripts/guards/custom_guard.sh
if echo "$COMMAND" | grep -qE 'your-pattern'; then
    echo "BLOCKED: Reason"
    exit 2
fi
```

## Common Patterns

### Allow an exception
```bash
# In the guard script, add before the block check:
if echo "$COMMAND" | grep -qE 'allowed-exception'; then
    exit 0
fi
```

### Add a file to protected list
Edit `protect_sensitive_files.sh` and add to `BLOCKED_FILES` array.

### Add a production keyword
Edit `warn_production.sh` and update `PRODUCTION_KEYWORDS`.
