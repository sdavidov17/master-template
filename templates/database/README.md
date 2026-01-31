# Database as Code

Patterns and templates for managing database schemas and migrations as code.

## Philosophy

Database changes should be:
- **Version controlled** - All schema changes tracked in git
- **Repeatable** - Same migrations produce same results
- **Reversible** - Can rollback when needed
- **Reviewed** - PRs for schema changes like any other code

## Migration Patterns by Tool

| Tool | Language | Files |
|------|----------|-------|
| [Prisma](#prisma) | TypeScript/Node | `prisma/` |
| [Drizzle](#drizzle) | TypeScript/Node | `drizzle/` |
| [SQLAlchemy/Alembic](#alembic) | Python | `alembic/` |
| [GORM](#gorm) | Go | `migrations/` |
| [Raw SQL](#raw-sql) | Any | `migrations/` |

## Quick Start

### Prisma

```bash
# Initialize
npx prisma init

# Create migration
npx prisma migrate dev --name add_users_table

# Apply to production
npx prisma migrate deploy

# Generate client
npx prisma generate
```

### Drizzle

```bash
# Generate migration
npx drizzle-kit generate:pg

# Apply migration
npx drizzle-kit push:pg

# View studio
npx drizzle-kit studio
```

### Alembic (Python)

```bash
# Initialize
alembic init alembic

# Create migration
alembic revision --autogenerate -m "add users table"

# Apply
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Best Practices

### 1. One Change Per Migration

```sql
-- ✅ Good: Single focused change
-- Migration: 001_add_users_table.sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL
);

-- ❌ Bad: Multiple unrelated changes
CREATE TABLE users (...);
CREATE TABLE products (...);
ALTER TABLE orders ADD COLUMN status VARCHAR(50);
```

### 2. Always Write Down Migrations

```sql
-- up.sql
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- down.sql (required!)
ALTER TABLE users DROP COLUMN phone;
```

### 3. Never Modify Applied Migrations

```
migrations/
├── 001_create_users.sql     ← Never edit after applied
├── 002_add_email_index.sql  ← Never edit after applied
└── 003_add_phone.sql        ← Can edit if not yet applied
```

### 4. Use Transactions

```sql
BEGIN;

ALTER TABLE users ADD COLUMN status VARCHAR(20);
UPDATE users SET status = 'active' WHERE status IS NULL;
ALTER TABLE users ALTER COLUMN status SET NOT NULL;

COMMIT;
```

### 5. Handle Large Tables Carefully

```sql
-- ❌ Bad: Locks table for duration
ALTER TABLE large_table ADD COLUMN new_col VARCHAR(255);

-- ✅ Good: Add nullable first, backfill, then add constraint
ALTER TABLE large_table ADD COLUMN new_col VARCHAR(255);
-- Backfill in batches (separate script)
ALTER TABLE large_table ALTER COLUMN new_col SET NOT NULL;
```

## Migration Naming Convention

```
[timestamp]_[action]_[entity].[ext]

Examples:
20250131120000_create_users.sql
20250131120100_add_email_index_to_users.sql
20250131120200_add_role_to_users.sql
```

## Pre-Migration Checklist

- [ ] Migration has corresponding down/rollback
- [ ] Tested on copy of production data
- [ ] No breaking changes to running application
- [ ] Large table migrations are batched
- [ ] Indexes added for new foreign keys
- [ ] Backup verified before production deploy

## CI/CD Integration

```yaml
# .github/workflows/ci.yml
jobs:
  migrate-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check migrations
        run: |
          # Verify migrations are valid
          npx prisma migrate diff \
            --from-schema-datamodel prisma/schema.prisma \
            --to-migrations ./prisma/migrations \
            --exit-code
```

## See Also

- `prisma/schema.prisma` - Prisma schema template
- `drizzle/schema.ts` - Drizzle schema template
- `alembic/env.py` - Alembic configuration template
