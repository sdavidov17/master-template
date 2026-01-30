# SRE Practices Skill

Guidance for implementing Site Reliability Engineering practices including SLOs, SLIs, error budgets, incident response, and runbooks.

## Service Level Objectives (SLOs)

### Defining SLOs

SLOs are targets for service reliability. They should be:
- **Measurable** - Based on concrete metrics
- **Achievable** - Realistic given current architecture
- **Meaningful** - Reflect user experience
- **Time-bound** - Measured over a specific period

### Common SLO Categories

| Category | SLI (Indicator) | Example SLO |
|----------|-----------------|-------------|
| Availability | Successful requests / Total requests | 99.9% of requests succeed |
| Latency | Request duration at percentile | 95% of requests < 200ms |
| Throughput | Requests per second | Support 1000 RPS |
| Error Rate | Failed requests / Total requests | < 0.1% error rate |
| Freshness | Data age | Data updated within 5 minutes |

### SLO Template

```yaml
# slo.yaml
service: user-api
owner: platform-team
slos:
  - name: availability
    description: "API availability for user-facing endpoints"
    sli:
      type: availability
      good_events: "http_requests_total{status!~'5..'}"
      total_events: "http_requests_total"
    target: 99.9
    window: 30d
    alerts:
      - burn_rate: 14.4  # 1-hour window
        severity: critical
      - burn_rate: 6     # 6-hour window
        severity: warning

  - name: latency
    description: "API response time for user-facing endpoints"
    sli:
      type: latency
      good_events: "http_request_duration_seconds_bucket{le='0.2'}"
      total_events: "http_requests_total"
    target: 95
    window: 30d
    alerts:
      - burn_rate: 14.4
        severity: critical

  - name: error_rate
    description: "Error rate for critical operations"
    sli:
      type: error_rate
      error_events: "http_requests_total{status=~'5..'}"
      total_events: "http_requests_total"
    target: 0.1  # 0.1% error rate
    window: 30d
```

### Error Budget Calculation

```
Error Budget = 100% - SLO Target

Example: 99.9% availability SLO
- Error Budget = 0.1%
- Monthly (30 days): 43.2 minutes of downtime allowed
- Weekly: ~10 minutes of downtime allowed
```

### Error Budget Policy

```markdown
## Error Budget Policy

### When Error Budget is Healthy (>50% remaining)
- Continue feature development at normal pace
- Perform planned maintenance
- Run chaos experiments

### When Error Budget is Degraded (25-50% remaining)
- Review recent changes for issues
- Prioritize reliability work
- Increase monitoring attention

### When Error Budget is Critical (<25% remaining)
- Freeze non-critical deployments
- Focus entirely on reliability
- Conduct incident reviews

### When Error Budget is Exhausted (0%)
- Emergency reliability freeze
- All hands on reliability
- Executive review required for any deployment
```

## Incident Response

### Incident Severity Levels

| Level | Impact | Response Time | Examples |
|-------|--------|---------------|----------|
| SEV1 | Critical | 15 minutes | Complete outage, data loss |
| SEV2 | Major | 30 minutes | Partial outage, degraded performance |
| SEV3 | Minor | 4 hours | Non-critical feature unavailable |
| SEV4 | Low | 24 hours | Cosmetic issues, minor bugs |

### Incident Response Process

```markdown
## Incident Response Checklist

### 1. Detection (0-5 minutes)
- [ ] Alert received and acknowledged
- [ ] Initial severity assessment
- [ ] Incident commander assigned
- [ ] Communication channel created (#incident-YYYY-MM-DD)

### 2. Triage (5-15 minutes)
- [ ] Impact scope identified
- [ ] Affected users/services documented
- [ ] Initial hypothesis formed
- [ ] Stakeholders notified

### 3. Mitigation (ongoing)
- [ ] Immediate mitigation actions taken
- [ ] Rollback considered if recent change
- [ ] Customer communication sent
- [ ] Status page updated

### 4. Resolution
- [ ] Root cause identified
- [ ] Fix implemented and verified
- [ ] Monitoring confirms recovery
- [ ] All-clear communicated

### 5. Post-Incident (within 48 hours)
- [ ] Timeline documented
- [ ] Blameless post-mortem scheduled
- [ ] Action items created
- [ ] SLO impact calculated
```

### On-Call Best Practices

```markdown
## On-Call Guidelines

### Responsibilities
- Acknowledge alerts within 5 minutes
- Assess severity and escalate if needed
- Document actions in incident channel
- Hand off properly at shift end

### Escalation Path
1. Primary on-call
2. Secondary on-call
3. Team lead
4. Engineering manager
5. VP Engineering (SEV1 only)

### Self-Care
- Take breaks between incidents
- Use quiet hours when possible
- Document toil for reduction
- Request coverage if overwhelmed
```

## Runbook Template

```markdown
# Runbook: [Service/Alert Name]

## Overview
Brief description of the service/alert and what this runbook covers.

## Alert Details
- **Alert Name:** `HighErrorRate`
- **Severity:** Warning/Critical
- **SLO Impact:** Yes/No
- **On-Call Team:** Platform

## Quick Links
- [Dashboard](link-to-dashboard)
- [Logs](link-to-logs)
- [Metrics](link-to-metrics)
- [Architecture Doc](link-to-doc)

## Diagnosis Steps

### Step 1: Check Current State
```bash
# Check service health
curl https://api.example.com/health

# Check recent deployments
kubectl rollout history deployment/service-name

# Check error logs
kubectl logs -l app=service-name --since=5m | grep ERROR
```

### Step 2: Identify Scope
- Is it affecting all users or specific regions?
- Is it affecting all endpoints or specific ones?
- When did it start?

### Step 3: Check Dependencies
- Database connectivity
- Cache availability
- External API status

## Common Causes & Solutions

### Cause 1: Database Connection Pool Exhausted
**Symptoms:** Timeout errors, connection refused
**Solution:**
```bash
# Restart pods to clear connections
kubectl rollout restart deployment/service-name
```

### Cause 2: Memory Pressure
**Symptoms:** OOM kills, slow responses
**Solution:**
```bash
# Check memory usage
kubectl top pods -l app=service-name

# Increase resources if needed
kubectl set resources deployment/service-name --limits=memory=2Gi
```

### Cause 3: Upstream Service Degradation
**Symptoms:** Increased latency, timeout errors
**Solution:**
1. Check upstream service status page
2. Enable circuit breaker if available
3. Consider fallback behavior

## Escalation
If unable to resolve within 30 minutes:
1. Page secondary on-call
2. Create incident channel
3. Notify stakeholders

## Recovery Verification
- [ ] Error rate returned to normal
- [ ] Latency returned to normal
- [ ] No customer complaints
- [ ] Monitoring shows healthy state

## Post-Incident
- Update this runbook if new information discovered
- Create ticket for permanent fix if needed
- Schedule post-mortem if SEV1/SEV2
```

## Observability Guidelines

### Metrics to Collect

```yaml
# Essential metrics for every service
metrics:
  # RED metrics (Request, Error, Duration)
  - name: http_requests_total
    type: counter
    labels: [method, endpoint, status]

  - name: http_request_duration_seconds
    type: histogram
    labels: [method, endpoint]
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]

  # USE metrics (Utilization, Saturation, Errors) for resources
  - name: process_cpu_seconds_total
    type: counter

  - name: process_resident_memory_bytes
    type: gauge

  # Business metrics
  - name: orders_created_total
    type: counter
    labels: [region, payment_method]

  - name: order_value_dollars
    type: histogram
    buckets: [10, 50, 100, 500, 1000, 5000]
```

### Logging Standards

```yaml
# Structured log format
log_format:
  timestamp: ISO8601
  level: [DEBUG, INFO, WARN, ERROR]
  service: string
  trace_id: string
  span_id: string
  message: string
  # Additional context fields as needed

# Log levels by environment
development:
  default_level: DEBUG
production:
  default_level: INFO
  # Only log DEBUG for specific modules if needed
```

### Alerting Best Practices

```yaml
# Alert design principles
alerts:
  # Symptom-based, not cause-based
  good:
    name: HighErrorRate
    condition: "error_rate > 1%"
    description: "Users are experiencing errors"
  bad:
    name: DatabaseCPUHigh
    condition: "db_cpu > 80%"
    # This might not affect users

  # Actionable
  good:
    runbook_url: "link to runbook"
    severity: clearly defined
  bad:
    description: "Something is wrong"
    # No guidance on what to do

  # Appropriate urgency
  good:
    critical: "pages on-call immediately"
    warning: "creates ticket for review"
  bad:
    everything_is_critical: true
    # Alert fatigue
```

## Chaos Engineering

### Principles

1. **Start with a hypothesis** - What do you expect to happen?
2. **Minimize blast radius** - Start small, expand gradually
3. **Run in production** - That's where real failures happen
4. **Automate experiments** - Make them repeatable

### Experiment Template

```yaml
# chaos-experiment.yaml
name: "Database Failover Test"
description: "Verify service handles database failover gracefully"

hypothesis:
  - "Service continues serving cached data during failover"
  - "Error rate stays below 1%"
  - "Failover completes within 30 seconds"

steady_state:
  - metric: error_rate
    value: "< 0.1%"
  - metric: latency_p99
    value: "< 500ms"

method:
  - action: "Trigger database failover"
    target: "primary-db"
    duration: "30s"

rollback:
  - action: "Verify failover completed"
  - action: "If not, manually promote replica"

schedule:
  frequency: "monthly"
  window: "Tuesday 2-4am UTC"
  requires_approval: true
```

### Common Experiments

| Experiment | Purpose | Risk Level |
|------------|---------|------------|
| Kill random pod | Test auto-recovery | Low |
| Network latency injection | Test timeout handling | Medium |
| Database failover | Test HA configuration | Medium |
| Zone failure | Test multi-AZ resilience | High |
| Dependency failure | Test circuit breakers | Medium |

## Capacity Planning

### Load Testing Template

```yaml
# load-test-plan.yaml
service: user-api
baseline_metrics:
  current_rps: 500
  p99_latency: 150ms
  error_rate: 0.01%

growth_projections:
  - period: "3 months"
    expected_rps: 750
  - period: "6 months"
    expected_rps: 1000
  - period: "12 months"
    expected_rps: 2000

test_scenarios:
  - name: "baseline"
    rps: 500
    duration: "10m"

  - name: "expected_growth"
    rps: 1000
    duration: "10m"

  - name: "stress_test"
    rps: 2000
    duration: "5m"

  - name: "spike_test"
    pattern: "0 -> 2000 -> 0 RPS over 5m"

success_criteria:
  - "p99 latency < 500ms"
  - "error rate < 1%"
  - "no pod restarts"
```

## Use This Skill When

- Setting up monitoring and alerting for a new service
- Defining SLOs for a team or project
- Creating runbooks for operational procedures
- Planning incident response processes
- Implementing chaos engineering experiments
- Conducting capacity planning exercises
