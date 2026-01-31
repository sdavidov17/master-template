# System Architecture

High-level overview of the system components and their interactions.

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        WEB[Web App]
        MOBILE[Mobile App]
        CLI[CLI Tool]
    end

    subgraph Gateway["API Gateway"]
        LB[Load Balancer]
        AUTH[Auth Middleware]
        RATE[Rate Limiter]
    end

    subgraph Services["Application Services"]
        API[API Server]
        WORKER[Background Worker]
        SCHEDULER[Task Scheduler]
    end

    subgraph Data["Data Layer"]
        DB[(PostgreSQL)]
        CACHE[(Redis)]
        SEARCH[(Elasticsearch)]
        QUEUE[(Message Queue)]
    end

    subgraph External["External Services"]
        EMAIL[Email Provider]
        STORAGE[Object Storage]
        PAYMENT[Payment Gateway]
    end

    subgraph Observability["Observability"]
        LOGS[Logging]
        METRICS[Metrics]
        TRACES[Tracing]
    end

    %% Client connections
    WEB --> LB
    MOBILE --> LB
    CLI --> LB

    %% Gateway flow
    LB --> AUTH
    AUTH --> RATE
    RATE --> API

    %% Service connections
    API --> DB
    API --> CACHE
    API --> QUEUE
    WORKER --> QUEUE
    WORKER --> DB
    SCHEDULER --> QUEUE

    %% External integrations
    WORKER --> EMAIL
    API --> STORAGE
    API --> PAYMENT

    %% Search
    API --> SEARCH
    WORKER --> SEARCH

    %% Observability (dotted lines)
    API -.-> LOGS
    API -.-> METRICS
    API -.-> TRACES
    WORKER -.-> LOGS
```

## Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Web App | React/Next.js | User-facing web interface |
| API Server | Node.js/Go | REST/GraphQL API |
| Worker | Node.js/Python | Background job processing |
| PostgreSQL | PostgreSQL 15+ | Primary data store |
| Redis | Redis 7+ | Caching, sessions, rate limiting |
| Queue | Redis/RabbitMQ | Async job processing |
