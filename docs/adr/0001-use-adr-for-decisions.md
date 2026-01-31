# 1. Use ADRs for Architectural Decisions

Date: 2025-01-31

Status: Accepted

## Context

As projects grow, important architectural decisions are made but the reasoning behind them gets lost:
- New team members don't understand why things are built a certain way
- Decisions are revisited repeatedly because no one remembers the original context
- Knowledge lives only in people's heads or scattered Slack messages

We need a lightweight way to document decisions that:
- Lives with the code (version controlled)
- Is easy to write and maintain
- Provides enough context without being burdensome

## Decision

We will use Architecture Decision Records (ADRs) to document significant architectural decisions.

Each ADR will:
- Be stored in `docs/adr/` directory
- Use a sequential numbering scheme (0001, 0002, etc.)
- Follow the template in `0000-template.md`
- Be submitted as part of the PR that implements the decision

## Alternatives Considered

### Option A: Confluence/Wiki Pages
- Pros: Rich formatting, easy collaboration
- Cons: Separated from code, often becomes stale, requires separate access

### Option B: README sections
- Pros: Close to code
- Cons: Gets unwieldy, no history tracking, hard to find specific decisions

### Option C: No documentation
- Pros: No overhead
- Cons: Knowledge loss, repeated discussions, onboarding difficulty

## Consequences

### Positive
- Decisions are version-controlled alongside code
- New team members can understand historical context
- Reduces repeated discussions about settled decisions
- Creates a searchable history of project evolution

### Negative
- Adds a small overhead to significant changes
- Requires discipline to keep ADRs updated
- May become stale if not maintained

### Neutral
- ADRs are living documents - they can be superseded by new decisions
- Not every decision needs an ADR (only architecturally significant ones)

## References

- [Documenting Architecture Decisions - Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR Tools](https://github.com/npryce/adr-tools)
