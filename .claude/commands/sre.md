---
name: sre
description: Production readiness review covering observability, reliability, and SLOs.
argument-hint: [service or component]
---

# SRE Review

Review code and infrastructure for production readiness using SRE principles.

## Instructions

When the user runs `/sre`, evaluate the system for reliability, observability, and operational excellence:

### 1. Observability (The Three Pillars)

#### Metrics
- Key metrics defined (latency, throughput, error rate)
- Custom business metrics
- Prometheus/StatsD integration
- Dashboard coverage

#### Logging
- Structured logging (JSON)
- Log levels appropriately used
- Correlation IDs for tracing
- No sensitive data in logs

#### Tracing
- Distributed tracing implemented
- Span context propagation
- Critical path instrumentation
- Trace sampling strategy

### 2. Reliability

#### SLOs/SLIs
- Service Level Objectives defined
- Service Level Indicators measurable
- Error budgets established
- SLO monitoring in place

#### Resilience Patterns
- Circuit breakers
- Retry with exponential backoff
- Timeouts on all external calls
- Graceful degradation
- Bulkhead isolation

#### Health Checks
- `/health/live` - Kubernetes liveness
- `/health/ready` - Kubernetes readiness
- `/health/startup` - Startup probe
- Dependency health checks

### 3. Deployment

#### Zero-Downtime
- Rolling deployments
- Blue/green capability
- Canary deployment option
- Feature flags for risky changes

#### Rollback
- Quick rollback mechanism
- Database migration rollback
- Configuration rollback

### 4. Incident Response

- Alerting rules defined
- Runbooks documented
- On-call rotation
- Post-mortem process

## Output Format

```markdown
## SRE Review: [Service/Component Name]

### Production Readiness Score: [X/10]

### Observability Status
| Pillar | Status | Notes |
|--------|--------|-------|
| Metrics | [ ] | |
| Logging | [ ] | |
| Tracing | [ ] | |

### Reliability Gaps
[List of missing reliability patterns]

### Recommendations

#### Before Production
1. [Must-have items]

#### Post-Launch
1. [Important improvements]

### Runbook Draft
[Key operational procedures to document]
```

## Usage

```
/sre                              # Full SRE review
/sre --focus=observability        # Focus on metrics/logs/traces
/sre --focus=reliability          # Focus on resilience patterns
/sre src/services/payment/        # Review specific service
```
