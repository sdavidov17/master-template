---
name: api-design
description: Review API design following REST, tRPC, or GraphQL best practices.
argument-hint: [file or endpoint]
---

# API Design Review

Review and improve API design following best practices.

## Instructions

When the user runs `/api-design`, analyze the specified API or endpoint design and provide recommendations based on:

### 1. RESTful Principles (if REST)
- Resource naming (nouns, plural forms)
- HTTP method usage (GET, POST, PUT, PATCH, DELETE)
- Status code appropriateness
- URL structure and hierarchy

### 2. Request/Response Design
- Consistent naming conventions (camelCase/snake_case)
- Pagination strategy (cursor vs offset)
- Filtering and sorting patterns
- Error response structure

### 3. tRPC Patterns (if tRPC)
- Router organization (by domain)
- Input validation with Zod
- Procedure naming conventions
- Middleware usage

### 4. GraphQL Patterns (if GraphQL)
- Schema design principles
- Query complexity limits
- N+1 prevention with dataloaders
- Mutation naming

### 5. General Best Practices
- Versioning strategy
- Rate limiting considerations
- Authentication/Authorization headers
- CORS configuration
- Documentation completeness

## Output Format

```markdown
## API Design Review: [Endpoint/Router Name]

### Current Design
[Brief description of what was analyzed]

### Strengths
- [What's done well]

### Recommendations

#### High Priority
1. [Critical improvements]

#### Medium Priority
1. [Important but not urgent]

#### Low Priority
1. [Nice to have]

### Example Improvements
[Code examples showing recommended changes]
```

## Usage

```
/api-design src/api/users.ts
/api-design "Review the authentication endpoints"
/api-design  # Analyze all API routes in the project
```
