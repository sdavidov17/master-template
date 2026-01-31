---
name: reflect
description: Process session learnings and update CLAUDE.md for continuous improvement.
---

# Reflect - Self-Learning Loop

Process accumulated learnings and update project documentation.

## Instructions

When the user runs `/reflect`, process the learnings captured during the session and propose updates to CLAUDE.md:

### 1. Review Learnings

Check `.claude/learnings.json` for captured corrections and preferences:
- Coding style preferences
- Architecture decisions
- Tool preferences
- Naming conventions
- Error patterns to avoid

### 2. Categorize Learnings

Organize learnings into CLAUDE.md sections:

#### Patterns to Avoid
- Anti-patterns discovered
- Approaches that didn't work
- Common mistakes made

#### Lessons Learned
- Successful patterns
- Project-specific knowledge
- Integration insights

#### Style Conventions
- Naming preferences
- Code organization
- Documentation style

### 3. Propose Updates

Present learnings for user approval before updating CLAUDE.md.

## Output Format

```markdown
## Session Learnings Summary

### Captured Corrections

| #  | Original Approach | Correction | Category |
|----|-------------------|------------|----------|
| 1  | [what was done]   | [what to do instead] | [style/pattern/tool] |

### Proposed CLAUDE.md Updates

#### Add to "Patterns to Avoid"
```markdown
- [Pattern description and why to avoid]
```

#### Add to "Lessons Learned"
```markdown
- [Learning and context]
```

#### Add to "Style Conventions"
```markdown
- [Convention and rationale]
```

### Actions
- [ ] Approve updates to CLAUDE.md
- [ ] Dismiss specific learnings
- [ ] Clear learnings.json after applying
```

## How Learning Capture Works

The system captures corrections through patterns like:
- "No, use X instead of Y"
- "Actually, we prefer..."
- "Don't do X, do Y"
- "The correct approach is..."

These are stored in `.claude/learnings.json` for later reflection.

## Usage

```
/reflect                    # Process all learnings
/reflect --dry-run          # Preview without updating
/reflect --clear            # Clear learnings after applying
```

## Manual Learning Addition

You can also manually add learnings:

```json
// .claude/learnings.json
{
  "learnings": [
    {
      "date": "2025-01-31",
      "category": "style",
      "original": "Used snake_case for functions",
      "correction": "Use camelCase for all function names",
      "context": "Project uses TypeScript conventions"
    }
  ]
}
```

## Benefits

Following Boris Cherny's recommendation:
> "Each team maintains a CLAUDE.md in git to document mistakes, so Claude can improve over time."

This creates a continuous improvement loop where:
1. Corrections during sessions are captured
2. `/reflect` processes them into documentation
3. Future sessions benefit from accumulated knowledge
