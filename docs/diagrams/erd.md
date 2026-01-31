# Entity Relationship Diagram

Database schema and relationships.

```mermaid
erDiagram
    USER ||--o{ SESSION : has
    USER ||--o{ POST : writes
    USER ||--o{ COMMENT : writes
    USER ||--o{ AUDIT_LOG : generates

    POST ||--o{ COMMENT : has
    POST }o--o{ TAG : tagged_with
    POST }o--o{ CATEGORY : belongs_to

    ORGANIZATION ||--o{ USER : has_members
    ORGANIZATION ||--o{ TEAM : has
    TEAM }o--o{ USER : has_members

    USER {
        uuid id PK
        string email UK
        string name
        string password_hash
        enum role
        timestamp created_at
        timestamp updated_at
    }

    SESSION {
        uuid id PK
        uuid user_id FK
        string token UK
        timestamp expires_at
        timestamp created_at
    }

    POST {
        uuid id PK
        string title
        string slug UK
        text content
        boolean published
        timestamp published_at
        uuid author_id FK
        timestamp created_at
        timestamp updated_at
    }

    TAG {
        uuid id PK
        string name UK
        string slug UK
    }

    CATEGORY {
        uuid id PK
        string name
        string slug UK
        uuid parent_id FK
    }

    COMMENT {
        uuid id PK
        text content
        uuid post_id FK
        uuid author_id FK
        uuid parent_id FK
        timestamp created_at
    }

    ORGANIZATION {
        uuid id PK
        string name
        string slug UK
        timestamp created_at
    }

    TEAM {
        uuid id PK
        string name
        uuid organization_id FK
    }

    AUDIT_LOG {
        uuid id PK
        string action
        string entity
        string entity_id
        uuid user_id FK
        json changes
        timestamp created_at
    }
```

## Relationship Key

| Symbol | Meaning |
|--------|---------|
| `\|\|` | Exactly one |
| `o{` | Zero or more |
| `\|{` | One or more |
| `o\|` | Zero or one |

## Notes

- **PK** = Primary Key
- **FK** = Foreign Key
- **UK** = Unique Key
- All tables have `id` as UUID primary key
- Timestamps use `TIMESTAMP WITH TIME ZONE`
- Soft deletes use `deleted_at` column (not shown for brevity)
