# /plan Command

Create an implementation plan before coding a complex feature.

## Usage
```
/plan [feature description]
```

## Workflow

1. **Gather Context**
   - Read related files in the codebase
   - Understand existing patterns
   - Identify dependencies

2. **Break Down the Work**
   - Split into tasks completable in 2-5 minutes
   - Order by dependencies
   - Include clear verification for each task

3. **Create Plan Document**
   - Output structured plan (see format below)
   - Get user confirmation before proceeding

4. **Execute Plan**
   - Work through tasks sequentially
   - Mark each task complete after verification
   - Pause if blockers arise

## Plan Format

```markdown
## Implementation Plan: [Feature Name]

### Goal
[1-2 sentence description of the end state]

### Prerequisites
- [ ] Prerequisite 1
- [ ] Prerequisite 2

### Tasks
1. [ ] **[Task Title]**
   - Files: `path/to/file.ts`
   - Changes: Brief description
   - Verify: How to confirm completion

2. [ ] **[Next Task]**
   ...

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Risk description | How to handle |

### Definition of Done
- [ ] All tasks completed
- [ ] Tests passing
- [ ] No lint errors
- [ ] Code reviewed
```

## Example

```
/plan Add user authentication with email/password
```

Output:
```markdown
## Implementation Plan: User Authentication

### Goal
Users can sign up, log in, and log out using email/password credentials.

### Tasks
1. [ ] **Create User model**
   - Files: `src/models/user.ts`
   - Changes: Define User type with id, email, passwordHash
   - Verify: TypeScript compiles

2. [ ] **Add password hashing utility**
   - Files: `src/lib/auth.ts`
   - Changes: hashPassword and verifyPassword functions
   - Verify: Unit tests pass

...
```
