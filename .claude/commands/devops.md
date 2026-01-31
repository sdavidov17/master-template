---
name: devops
description: Review CI/CD pipelines, Dockerfiles, and infrastructure code.
argument-hint: [file or workflow]
---

# DevOps Review

Review CI/CD pipelines, deployment configurations, and infrastructure code.

## Instructions

When the user runs `/devops`, analyze the DevOps configurations and provide recommendations:

### 1. CI/CD Pipeline

#### Build Stage
- Reproducible builds
- Dependency caching
- Parallel test execution
- Build artifact versioning

#### Test Stage
- Unit test execution
- Integration tests
- Coverage thresholds enforced
- Security scanning (SAST/SCA)

#### Deploy Stage
- Environment promotion (dev -> staging -> prod)
- Approval gates
- Deployment notifications
- Rollback triggers

### 2. GitHub Actions / CI Configuration

- Workflow organization
- Secret management
- Matrix builds for multi-platform
- Caching strategies
- Workflow dependencies

### 3. Container Configuration

#### Dockerfile Best Practices
- Multi-stage builds
- Non-root user
- Minimal base images (alpine, distroless)
- Layer optimization
- Security scanning

#### docker-compose
- Service dependencies
- Volume management
- Network isolation
- Environment variables

### 4. Infrastructure as Code

#### Terraform/Pulumi
- State management
- Module organization
- Variable management
- Security best practices

#### Kubernetes
- Resource limits/requests
- Health probes
- ConfigMaps/Secrets
- Network policies
- Pod security

### 5. Environment Management

- Configuration per environment
- Secret rotation strategy
- Feature flags
- Database migrations

## Output Format

```markdown
## DevOps Review: [Repository/Project Name]

### CI/CD Health: [Healthy/Needs Work/Critical]

### Pipeline Analysis
| Stage | Status | Issues |
|-------|--------|--------|
| Build | [ ] | |
| Test | [ ] | |
| Security | [ ] | |
| Deploy | [ ] | |

### Container Review
[Dockerfile and compose analysis]

### Infrastructure Review
[IaC analysis if applicable]

### Recommendations

#### Quick Wins
1. [Easy improvements]

#### Important Changes
1. [Higher effort improvements]

### Sample Improvements
[Code/config examples]
```

## Usage

```
/devops                                    # Full DevOps review
/devops .github/workflows/                 # Review GitHub Actions
/devops Dockerfile docker-compose.yml      # Review container config
/devops --focus=security                   # Focus on security aspects
```
