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
| **Agents** | Planner, code-reviewer, TDD guide, code-simplifier, verify-app, llm-reviewer |
| **Commands** | `/plan`, `/tdd`, `/review`, `/ship`, `/commit-push-pr`, `/security-scan`, `/test-coverage`, `/accessibility` |
| **Skills** | Trunk-based dev, TDD workflow, SRE practices, quality engineering, agentic testing |
| **Rules** | Security (OWASP 2025), coding style, git workflow, AI guardrails |
| **Hooks** | Session persistence, PostToolUse code formatting, pre-commit security |
| **MCPs** | GitHub, Supabase, Memory (disabled by default) |
| **Permissions** | Pre-approved safe commands (build, test, lint, git) |

### GitHub Workflows (`.github/workflows/`)

- **ci.yml** - Multi-language CI with coverage gates (Node, Python, Go)
- **security.yml** - Security scanning (SAST, SCA, secrets, containers, IaC)
- **claude-code-review.yml** - Automatic PR reviews by Claude + @claude mentions
- **claude-assistant.yml** - Interactive @claude with write access (fix/implement)
- **update-check.yml** - Daily check for upstream template updates

### Security & Quality

- **Pre-commit hooks** - Gitleaks, detect-secrets, Bandit, Checkov
- **Dependabot** - Automated dependency updates
- **Coverage gates** - Enforced thresholds by architecture mode
- **SBOM generation** - CycloneDX format on releases

### Production Templates (`templates/`)

| Category | Templates |
|----------|-----------|
| **Observability** | OpenTelemetry (Node, Python, Go) |
| **Logging** | Structured JSON logging with trace correlation |
| **Health Checks** | K8s-compatible `/health/live`, `/ready`, `/startup` |
| **Testing** | Contract testing (Pact), mutation testing, accessibility |
| **Agentic** | LLM tracing, agent testing, prompt versioning, cost tracking |

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
| `/security-scan` | Run SAST, SCA, and secret scanning |
| `/test-coverage` | Run tests with coverage enforcement |
| `/accessibility` | Run WCAG 2.1 AA accessibility testing |

## Agents

| Agent | Description |
|-------|-------------|
| `planner` | Break down complex tasks into steps |
| `code-reviewer` | Quality and security review |
| `tdd-guide` | Test-driven development guidance |
| `code-simplifier` | Post-completion code refinement |
| `verify-app` | Comprehensive E2E verification |
| `llm-reviewer` | Validate LLM outputs for safety/accuracy |

## Skills

| Skill | Description |
|-------|-------------|
| `trunk-based-dev` | Trunk-based development workflow |
| `tdd-workflow` | Test-driven development practices |
| `sre-practices` | SLOs, SLIs, incident response, runbooks |
| `quality-engineering` | Testing pyramid, mutation testing, a11y |
| `agentic-testing` | Testing LLM-based applications |

## MCP Integrations

MCPs (Model Context Protocol servers) are pre-configured but disabled by default.

### Available MCPs

| MCP | Purpose | Required Env Vars |
|-----|---------|-------------------|
| **github** | PR/issue management, code search | `GITHUB_TOKEN` |
| **supabase** | Database operations | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| **memory** | Session persistence | None |
| **postgres** | Direct PostgreSQL access | `DATABASE_URL` |
| **sqlite** | Local database for dev/testing | `SQLITE_DB_PATH` |
| **filesystem** | Enhanced file operations | `PROJECT_ROOT` (optional) |
| **brave-search** | Web search integration | `BRAVE_API_KEY` |
| **fetch** | HTTP requests to APIs | None |
| **puppeteer** | Browser automation, E2E testing | None |
| **sentry** | Error tracking | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` |
| **slack** | Team notifications | `SLACK_BOT_TOKEN` |

### Enabling MCPs

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

### Recommended MCPs by Use Case

| Use Case | Enable These MCPs |
|----------|-------------------|
| **Web Development** | github, fetch, puppeteer |
| **Backend/API** | github, postgres or supabase, sentry |
| **Full Stack** | github, postgres, fetch, puppeteer, sentry |
| **Research/Analysis** | brave-search, fetch |
| **Team Projects** | github, slack, memory |

## Linting Tools

Modern linting configurations are included in `templates/linting/`.

### Recommended Tools (2025-2026)

| Language | Tool | Why |
|----------|------|-----|
| **TypeScript** | **Biome** | 10-100x faster than ESLint (Rust-based), replaces linting + formatting |
| **TypeScript** | **ESLint 9+** | Standard with most plugins, use if you need specific plugins |
| **Python** | **Ruff** | 10-100x faster than Flake8 (Rust-based), replaces 10+ tools |
| **Go** | **golangci-lint** | Aggregates 100+ linters, de facto standard |

### Configuration Files

| File | Language | Description |
|------|----------|-------------|
| `templates/linting/biome.json` | TypeScript/JS | Biome linter + formatter config |
| `templates/linting/eslint.config.mjs` | TypeScript/JS | ESLint 9+ flat config |
| `templates/linting/ruff.toml` | Python | Ruff linter + formatter config |
| `templates/linting/.golangci.yml` | Go | golangci-lint config |

### Quick Setup

**TypeScript (Biome - Recommended):**
```bash
npm install -D @biomejs/biome
cp templates/linting/biome.json ./biome.json
npx biome check --write .
```

**TypeScript (ESLint):**
```bash
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-security
cp templates/linting/eslint.config.mjs ./eslint.config.mjs
npx eslint .
```

**Python:**
```bash
pip install ruff
cp templates/linting/ruff.toml ./ruff.toml
ruff check . && ruff format .
```

**Go:**
```bash
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
cp templates/linting/.golangci.yml ./.golangci.yml
golangci-lint run
```

## Claude GitHub Integration

Automatic code review and interactive @claude support via [Claude Code Action](https://github.com/anthropics/claude-code-action).

### Setup

**Option 1: Via Claude Code (Recommended)**
```bash
claude
/install-github-app
```

**Option 2: Manual Setup**
1. Add `ANTHROPIC_API_KEY` to repository secrets (Settings → Secrets → Actions)
2. Workflows are already configured in `.github/workflows/`

### Features

| Workflow | Trigger | What it Does |
|----------|---------|--------------|
| **claude-code-review.yml** | New PR | Automatic code review for quality, bugs, security |
| **claude-code-review.yml** | `@claude` comment | Responds to questions about the code |
| **claude-assistant.yml** | `@claude` comment | Makes code changes when requested (write access) |

### Usage Examples

**Automatic PR Review:**
- Every new PR gets an automatic code review
- Reviews focus on: code quality, bugs, security, tests, docs

**Ask Questions:**
```
@claude what does this function do?
@claude is there a security risk here?
@claude how can I improve the performance?
```

**Request Changes (claude-assistant.yml):**
```
@claude please fix the TypeScript errors
@claude add input validation to this function
@claude implement the suggested changes
@claude add tests for the new endpoint
```

### Security Notes

- `claude-code-review.yml`: Read-only, can only comment
- `claude-assistant.yml`: Write access, but restricted to:
  - Only collaborators/members can trigger
  - Limited allowed commands (build, test, lint, format)
  - All changes are committed with clear attribution

### Alternative: Cloud Providers

Instead of Anthropic API, you can use:
- **AWS Bedrock**: Set `aws-access-key-id`, `aws-secret-access-key`, `aws-region`
- **Google Vertex AI**: Set `gcp-project-id`, `gcp-region`, `gcp-credentials`

See [cloud-providers.md](https://github.com/anthropics/claude-code-action/blob/main/docs/cloud-providers.md) for details.

## Daily Update Checks

The `update-check.yml` workflow runs daily to check for updates from:

- [everything-claude-code](https://github.com/affaan-m/everything-claude-code) - Anthropic hackathon winner
- [superpowers](https://github.com/obra/superpowers) - Workflow enforcement framework
- [claude-code-templates](https://github.com/davila7/claude-code-templates) - Component library

When updates are detected, a GitHub issue is created automatically.

## Security Setup

### Pre-commit Hooks
```bash
# Install pre-commit (one-time)
pip install pre-commit

# Install hooks for this repo
pre-commit install

# Run manually
pre-commit run --all-files
```

### Security Scanning
The security workflow runs automatically on push/PR. It includes:
- **SAST**: Semgrep for code vulnerabilities
- **SCA**: Trivy for dependency vulnerabilities
- **Secrets**: Gitleaks for credential detection
- **Containers**: Trivy for image scanning (if Dockerfile exists)
- **IaC**: Checkov for infrastructure code

### Coverage Thresholds
| Mode | Line Coverage | Branch Coverage |
|------|--------------|-----------------|
| MVP | 60% | 50% |
| Growth | 80% | 70% |
| Scale | 90% | 85% |

## Customization

1. **CLAUDE.md** - Update project context and architecture mode
2. **Agents** - Add domain-specific agents in `.claude/agents/`
3. **Rules** - Add project-specific rules in `.claude/rules/`
4. **Skills** - Add domain skills in `.claude/skills/`
5. **Templates** - Copy and customize from `templates/`
6. **MCPs** - Enable/add integrations in `.claude/settings.json`

## Boris Cherny's Recommendations

This template incorporates best practices from [Boris Cherny](https://x.com/bcherny/status/2007179832300581177), the creator of Claude Code:

- **Plan Mode First** - Start sessions in Plan mode, iterate until plan is solid
- **Verification** - Give Claude ways to verify work (2-3x quality improvement)
- **PostToolUse Hooks** - Auto-format code after edits to prevent CI failures
- **Permission Patterns** - Pre-approve safe commands to reduce prompts
- **Mistake Documentation** - Track learnings in CLAUDE.md for continuous improvement
- **`/commit-push-pr`** - His most-used command (dozens of times daily)

## Template Structure

```
master-template/
├── .claude/
│   ├── agents/           # AI agent definitions
│   ├── commands/         # Slash command definitions
│   ├── hooks/            # Pre/post tool hooks
│   ├── rules/            # Always-on guidelines
│   └── skills/           # Domain-specific knowledge
├── .github/
│   ├── workflows/        # CI/CD pipelines
│   │   ├── ci.yml        # Main CI with coverage gates
│   │   ├── security.yml  # Security scanning
│   │   ├── claude-code-review.yml   # Auto PR review + @claude
│   │   ├── claude-assistant.yml     # @claude with write access
│   │   └── update-check.yml
│   ├── dependabot.yml    # Dependency updates
│   └── pull_request_template.md
├── templates/
│   ├── observability/    # OpenTelemetry setup
│   ├── logging/          # Structured logging
│   ├── health/           # Health check endpoints
│   ├── testing/          # Contract, mutation, a11y tests
│   ├── agentic/          # LLM observability & testing
│   └── linting/          # Biome, ESLint, Ruff, golangci-lint
├── scripts/
│   └── setup.js          # Project initialization
├── .pre-commit-config.yaml
├── CLAUDE.md             # Project context for Claude
└── README.md
```

## License

MIT
