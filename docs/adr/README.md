# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for the project.

## What is an ADR?

An ADR is a document that captures an important architectural decision made along with its context and consequences.

## Why Use ADRs?

- **Memory** - Document decisions before context is forgotten
- **Onboarding** - Help new team members understand why things are the way they are
- **Alignment** - Create shared understanding across the team
- **Accountability** - Record who made decisions and when

## ADR Format

Each ADR follows a simple structure:

```markdown
# [Number]. [Title]

Date: YYYY-MM-DD
Status: [Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Context
What is the issue that we're seeing that is motivating this decision?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult because of this change?
```

## Creating a New ADR

1. Copy `0000-template.md` to a new file with the next number
2. Fill in the sections
3. Submit as part of a PR for the related change
4. Update status after team review

```bash
# Example
cp docs/adr/0000-template.md docs/adr/0002-use-postgresql.md
```

## Naming Convention

- `0000-template.md` - Template for new ADRs
- `0001-use-adr-for-decisions.md` - First actual ADR
- `0002-[short-description].md` - Subsequent ADRs

## Status Lifecycle

```
Proposed → Accepted → [Deprecated | Superseded]
                ↓
            Rejected (delete or mark)
```

## ADR Index

| Number | Title | Status | Date |
|--------|-------|--------|------|
| [0001](0001-use-adr-for-decisions.md) | Use ADRs for architectural decisions | Accepted | [DATE] |

## Further Reading

- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) - Michael Nygard
- [ADR GitHub Organization](https://adr.github.io/)
