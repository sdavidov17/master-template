# Claude Code Hooks System

This document describes the hooks system that provides safety guardrails and automation for Claude Code sessions.

## Overview

Hooks are shell scripts that execute automatically at specific points during Claude Code operations:

| Hook Type | When It Runs | Purpose |
|-----------|--------------|---------|
| **PreToolUse** | Before a tool executes | Block or warn about dangerous operations |
| **PostToolUse** | After a tool executes | Format code, detect secrets |
| **Stop** | When session ends | Reminders and cleanup |

## Guard Scripts

All guard scripts are located in `.claude/scripts/guards/` and follow a consistent exit code convention:

| Exit Code | Meaning | Behavior |
|-----------|---------|----------|
| `0` | Allow | Operation proceeds normally |
| `1` | Warn | Shows warning but allows operation |
| `2` | Block | Prevents the operation |

### PreToolUse Guards (Bash)

These guards check bash commands before execution:

#### `block_dangerous_rm.sh`
**Purpose:** Prevents catastrophic file deletion

**Blocks:**
- `rm -rf /` (system root)
- `rm -rf ~` or `$HOME` (user home)
- `rm -rf /home` or `/Users` (all user directories)
- Wildcards at root-level paths

**Example blocked commands:**
```bash
rm -rf /                    # BLOCKED
rm -rf ~/                   # BLOCKED
rm -rf /Users/*             # BLOCKED
```

#### `block_force_push.sh`
**Purpose:** Prevents accidental force push to main/master

**Blocks:**
- `git push --force origin main`
- `git push -f origin master`

**Warns:**
- Any `--force` push (recommends `--force-with-lease`)

#### `warn_production.sh`
**Purpose:** Alerts on production-targeting commands

**Warns on keywords:**
- `production`, `prod`, `--prod`
- `NODE_ENV=production`
- `deploy prod`
- Destructive DB operations targeting prod

### PreToolUse Guards (Write/Edit)

These guards check file operations before they occur:

#### `protect_sensitive_files.sh`
**Purpose:** Prevents editing secret files

**Blocks:**
- `.env`, `.env.local`, `.env.production`
- `credentials.json`, `secrets.json`
- `id_rsa`, `id_ed25519`, `*.pem`, `*.key`

**Warns:**
- `package.json`, `package-lock.json`
- `requirements.txt`, `Pipfile.lock`
- `go.sum`, `yarn.lock`

#### `warn_test_changes.sh`
**Purpose:** Alerts when modifying tests

**Warns on patterns:**
- `*.test.ts`, `*.spec.js`
- `*_test.go`, `test_*.py`
- Files in `tests/` or `__tests__/`

#### `protect_critical_files.sh`
**Purpose:** Alerts on high-impact file changes

**Warns:**
- `schema.prisma`, migrations
- `Dockerfile`, `docker-compose.yml`
- Kubernetes/Terraform files
- `tsconfig.json`, `go.mod`
- GitHub workflows
- `CLAUDE.md`

### PostToolUse Guards

#### `detect_hardcoded_secrets.sh`
**Purpose:** Scans written code for secrets

**Detects:**
- AWS Access Keys (`AKIA...`)
- GitHub tokens (`gh[ps]_...`, `github_pat_...`)
- Slack tokens (`xox[baprs]-...`)
- API keys (`sk-...`)
- Stripe keys (`sk_live_...`)
- Private keys (`-----BEGIN PRIVATE KEY-----`)
- JWTs (warns only)

### Stop Hooks

#### `check_tests_run.sh`
**Purpose:** Reminds to run tests before finalizing

Displays a checklist reminder when session ends.

#### `post_commit_reminder.sh`
**Purpose:** Reminds to run `/reflect` if there are pending learnings

Checks `.claude/learnings.json` for unprocessed learnings.

## Configuration

Hooks are configured in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/scripts/guards/block_dangerous_rm.sh \"$CLAUDE_BASH_COMMAND\""
          }
        ]
      }
    ]
  }
}
```

### Environment Variables

| Variable | Description | Available In |
|----------|-------------|--------------|
| `$CLAUDE_BASH_COMMAND` | The bash command being executed | Bash hooks |
| `$CLAUDE_FILE_PATH` | Path of file being edited | Write/Edit hooks |
| `$CLAUDE_FILE_CONTENT` | Content being written | PostToolUse |

## Customization

### Adding a New Guard

1. Create a script in `.claude/scripts/guards/`:

```bash
#!/bin/bash
# Guard: Description of what it does
# Exit codes: 0 = allow, 1 = warn, 2 = block

COMMAND="$1"

if echo "$COMMAND" | grep -qE 'pattern-to-match'; then
    echo "BLOCKED: Reason"
    exit 2
fi

exit 0
```

2. Make it executable:
```bash
chmod +x .claude/scripts/guards/your_guard.sh
```

3. Add to `.claude/settings.json`:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/scripts/guards/your_guard.sh \"$CLAUDE_BASH_COMMAND\""
          }
        ]
      }
    ]
  }
}
```

### Disabling a Guard

Remove or comment out the hook in `.claude/settings.json`.

### Project-Specific Guards

Create additional guards for your project's needs:
- Block specific database operations
- Protect production config files
- Warn on deprecated API usage
- Enforce branch naming conventions

## Troubleshooting

### Hook Not Running
- Verify the script exists and is executable (`chmod +x`)
- Check the matcher pattern matches the tool name
- Ensure the command path is correct

### Hook Blocking Unexpectedly
- Check script output for the matched pattern
- Adjust regex patterns if too broad
- Use exit code `1` for warnings instead of `2` for blocks

### Hook Errors
- Scripts should handle errors gracefully
- Use `|| true` suffix for non-critical hooks
- Check script syntax with `bash -n script.sh`

## Best Practices

1. **Keep guards focused** - One guard per concern
2. **Provide clear messages** - Explain why something was blocked
3. **Suggest alternatives** - Help users do the right thing
4. **Use warnings wisely** - Don't alert-fatigue users
5. **Test guards** - Verify they catch what they should
6. **Document custom guards** - Add to HOOKS-QUICKREF.md
