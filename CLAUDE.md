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

- `/plan` - Create implementation plan before coding complex features
- `/tdd` - Start TDD workflow (RED → GREEN → REFACTOR)
- `/review` - Request code review for current changes
- `/ship` - Validate changes and prepare for merge

## Agent Delegation

For complex tasks, delegate to specialized agents:

| Agent | Use For |
|-------|---------|
| `planner` | Multi-step tasks, breaking down features |
| `code-reviewer` | Quality and security review |
| `tdd-guide` | Test-driven development guidance |

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
scripts/             # Build and automation scripts
```

## Environment Variables

Required variables should be documented in `.env.example`:
```
DATABASE_URL=        # Database connection string
API_KEY=             # External API key
```

## MCP Integrations

Pre-configured MCPs (enable as needed in `.claude/settings.json`):
- **GitHub:** PR and issue management
- **Supabase:** Database operations
- **Memory:** Session persistence across conversations
