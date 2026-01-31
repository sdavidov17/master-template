# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

<!-- Update this section when initializing a new project -->
- **Project Name:** [PROJECT_NAME]
- **Description:** [BRIEF_DESCRIPTION]
- **Language:** [node|python|go|other]
- **Architecture Mode:** MVP

## Architecture Modes

### MVP Mode (default)
- Prioritize shipping over perfection
- Monolithic structure acceptable
- 60% test coverage minimum
- Simple error handling
- Use free-tier deployments (Vercel, Railway, Supabase)

### Growth Mode
- Extract shared components into modules
- 80% test coverage required
- Structured error handling with proper types
- Add performance monitoring
- Consider paid tiers for reliability

### Scale Mode
- Full modular/microservices architecture
- 90% test coverage required
- Comprehensive observability (logs, metrics, traces)
- Security audit required before major releases
- Production-grade infrastructure (AWS/GCP)

## Build & Test Commands

### Node.js
```bash
npm run dev          # Start development server
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
npm run lint         # Run linter
npm run build        # Production build
```

### Python
```bash
python -m pytest              # Run tests
python -m pytest --cov        # Run tests with coverage
python -m black . --check     # Check formatting
python -m ruff check .        # Lint
```

### Go
```bash
go test ./...        # Run tests
go test -cover ./... # Run tests with coverage
go build             # Build
go run .             # Run
```

## Critical Rules

1. **Small files:** Target 200-400 lines, max 800. Split larger files.
2. **TDD approach:** Write failing test first, then implement, then refactor.
3. **No secrets in code:** Use environment variables for all credentials.
4. **Immutability preferred:** Avoid mutation; return new values.
5. **Explicit over implicit:** Clear naming, no magic values.

## Available Commands

### Workflow Commands
- `/plan` - Create implementation plan before coding complex features
- `/tdd` - Start TDD workflow (RED → GREEN → REFACTOR)
- `/review` - Request code review for current changes
- `/ship` - Validate changes and prepare for merge
- `/commit-push-pr` - Commit, push, and create PR in one flow (Boris's most-used command)

### Quality Commands
- `/security-scan` - Run comprehensive security scanning (SAST, SCA, secrets)
- `/test-coverage` - Run tests with coverage analysis and enforcement
- `/accessibility` - Run accessibility testing against WCAG 2.1 AA

### Domain Review Commands
- `/api-design` - Review API design following REST/tRPC/GraphQL best practices
- `/code-review` - Thorough code review with project conventions
- `/security` - Security review following OWASP Top 10 2025
- `/sre` - Production readiness review (observability, reliability, SLOs)
- `/devops` - CI/CD pipeline and infrastructure review

### Self-Improvement
- `/reflect` - Process session learnings and update CLAUDE.md

## Agent Delegation

For complex tasks, delegate to specialized agents:

| Agent | Use For |
|-------|---------|
| `planner` | Multi-step tasks, breaking down features |
| `code-reviewer` | Quality and security review |
| `tdd-guide` | Test-driven development guidance |
| `code-simplifier` | Post-completion code refinement |
| `verify-app` | Comprehensive E2E verification (2-3x quality improvement) |
| `llm-reviewer` | Validate LLM outputs for safety and accuracy |

## Available Skills

Skills provide domain-specific guidance:

| Skill | Description |
|-------|-------------|
| `trunk-based-dev` | Trunk-based development workflow |
| `tdd-workflow` | Test-driven development practices |
| `sre-practices` | SLOs, incident response, runbooks |
| `quality-engineering` | Testing pyramid, mutation testing, a11y |
| `agentic-testing` | Testing LLM-based applications |

## Git Workflow (Trunk-Based)

- Work directly on `main` for small changes (< 2 hours work)
- Short-lived feature branches for larger work (< 1 day)
- Commit prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Squash merge PRs to keep history clean
- Delete branches after merge

## File Organization

```
src/                 # Source code
  components/        # UI components (if applicable)
  lib/               # Shared utilities
  types/             # Type definitions
tests/               # Test files mirror src/ structure
docs/
  adr/               # Architecture Decision Records
  diagrams/          # Mermaid diagrams (architecture, ERD, flows)
scripts/             # Build and automation scripts
templates/           # Production-ready code templates
  database/          # Prisma, Drizzle, Alembic schemas
  observability/     # OpenTelemetry setup (Node, Python, Go)
  logging/           # Structured logging
  health/            # Health check endpoints
  testing/           # Contract testing, mutation testing, a11y
  agentic/           # LLM tracing, agent testing, cost tracking
```

## Everything as Code

| Category | Location |
|----------|----------|
| **Database Schema** | `templates/database/` (Prisma, Drizzle, Alembic) |
| **Diagrams** | `docs/diagrams/` (Mermaid) |
| **Decisions** | `docs/adr/` (ADRs) |
| **CI/CD** | `.github/workflows/` |
| **Security Guards** | `.claude/scripts/guards/` |

## Environment Variables

Required variables should be documented in `.env.example`:
```
DATABASE_URL=        # Database connection string
API_KEY=             # External API key
```

## Security & Quality Gates

### Pre-commit Hooks
Install pre-commit hooks to catch issues early:
```bash
pip install pre-commit
pre-commit install
```

Hooks include: Gitleaks (secrets), detect-secrets, Bandit (Python), Checkov (IaC)

### CI/CD Quality Gates
- **Coverage threshold:** 80% (Growth mode), configurable in ci.yml
- **Security scanning:** SAST (Semgrep), SCA (Trivy), secrets (Gitleaks)
- **Automated dependency updates:** Dependabot configured

## MCP Integrations

Pre-configured MCPs (enable as needed in `.claude/settings.json`):
- **GitHub:** PR and issue management
- **Supabase:** Database operations
- **Memory:** Session persistence across conversations

## Safety Guardrails

The template includes hooks that protect against common mistakes. See `.claude/HOOKS.md` for details.

### Protected Operations
| Operation | Protection |
|-----------|------------|
| `rm -rf /` or `~` | Blocked |
| Force push to main | Blocked |
| Edit `.env` files | Blocked |
| Hardcoded secrets | Blocked |
| Production commands | Warning |
| Test file changes | Warning |
| Schema/config changes | Warning |

## Self-Learning System

This template implements Boris Cherny's recommendation for continuous improvement.

### How It Works
1. During sessions, corrections are captured to `.claude/learnings.json`
2. Run `/reflect` to review and apply learnings
3. Approved learnings are added to this file
4. Future sessions benefit from accumulated knowledge

### Capturing Learnings
Corrections are detected from phrases like:
- "No, use X instead of Y"
- "Actually, we prefer..."
- "The correct approach is..."

### Processing Learnings
```bash
/reflect              # Review and apply pending learnings
/reflect --dry-run    # Preview without updating
```

## Team Learnings & Mistakes

<!--
Boris Cherny: "Each team maintains a CLAUDE.md in git to document mistakes,
so Claude can improve over time."

Add mistakes Claude has made and how to avoid them. Update this section
when you notice recurring issues. Use @.claude tag on PRs to capture learnings.
-->

### Patterns to Avoid
<!-- Add patterns that have caused issues -->

### Lessons Learned
<!-- Add learnings from past mistakes -->

### Style Conventions
<!-- Add project-specific style rules discovered over time -->
