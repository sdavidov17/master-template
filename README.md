# Master Template

A bootstrap template for Claude Code projects with trunk-based development and DevOps best practices.

## Quick Start

```bash
# Clone this template
git clone <this-repo> my-project
cd my-project

# Run setup (interactive)
node scripts/setup.js

# Or specify language directly
node scripts/setup.js --language=node --name=my-app
```

## What's Included

### Claude Code Configuration (`.claude/`)

| Component | Description |
|-----------|-------------|
| **Agents** | Planner, code-reviewer, TDD guide, code-simplifier, verify-app |
| **Commands** | `/plan`, `/tdd`, `/review`, `/ship`, `/commit-push-pr` |
| **Skills** | Trunk-based dev, TDD workflow |
| **Rules** | Security, coding style, git workflow |
| **Hooks** | Session persistence, PostToolUse code formatting |
| **MCPs** | GitHub, Supabase, Memory (disabled by default) |
| **Permissions** | Pre-approved safe commands (build, test, lint, git) |

### GitHub Workflows (`.github/workflows/`)

- **ci.yml** - Multi-language CI (Node, Python, Go)
- **update-check.yml** - Daily check for upstream template updates

## Architecture Modes

Projects progress through three modes based on maturity:

| Mode | Coverage | Use When |
|------|----------|----------|
| **MVP** | 60% | Early stage, validating ideas |
| **Growth** | 80% | Scaling, adding features |
| **Scale** | 90% | Production, high reliability needed |

Update the mode in `CLAUDE.md` as your project matures.

## Commands

| Command | Description |
|---------|-------------|
| `/plan` | Create implementation plan before coding |
| `/tdd` | Start test-driven development workflow |
| `/review` | Request code review for changes |
| `/ship` | Validate and prepare for merge |
| `/commit-push-pr` | Commit, push, and create PR in one flow |

## Agents

| Agent | Description |
|-------|-------------|
| `planner` | Break down complex tasks into steps |
| `code-reviewer` | Quality and security review |
| `tdd-guide` | Test-driven development guidance |
| `code-simplifier` | Post-completion code refinement |
| `verify-app` | Comprehensive E2E verification |

## Enabling MCPs

MCPs are pre-configured but disabled by default. To enable:

1. Edit `.claude/settings.json`
2. Remove the MCP name from `disabledMcpServers` array
3. Set required environment variables

```json
{
  "disabledMcpServers": [
    // Remove "github" to enable GitHub MCP
    "supabase",
    "memory"
  ]
}
```

## Daily Update Checks

The `update-check.yml` workflow runs daily to check for updates from:

- [everything-claude-code](https://github.com/affaan-m/everything-claude-code) - Anthropic hackathon winner
- [superpowers](https://github.com/obra/superpowers) - Workflow enforcement framework
- [claude-code-templates](https://github.com/davila7/claude-code-templates) - Component library

When updates are detected, a GitHub issue is created automatically.

## Customization

1. **CLAUDE.md** - Update project context and architecture mode
2. **Agents** - Add domain-specific agents in `.claude/agents/`
3. **Rules** - Add project-specific rules in `.claude/rules/`
4. **MCPs** - Enable/add integrations in `.claude/settings.json`

## Boris Cherny's Recommendations

This template incorporates best practices from [Boris Cherny](https://x.com/bcherny/status/2007179832300581177), the creator of Claude Code:

- **Plan Mode First** - Start sessions in Plan mode, iterate until plan is solid
- **Verification** - Give Claude ways to verify work (2-3x quality improvement)
- **PostToolUse Hooks** - Auto-format code after edits to prevent CI failures
- **Permission Patterns** - Pre-approve safe commands to reduce prompts
- **Mistake Documentation** - Track learnings in CLAUDE.md for continuous improvement
- **`/commit-push-pr`** - His most-used command (dozens of times daily)

## License

MIT
