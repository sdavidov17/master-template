#!/bin/bash
# Guard: Warn on production-related commands
# Exit codes: 0 = allow, 1 = warn, 2 = block

COMMAND="$1"

# Production-related keywords
PRODUCTION_KEYWORDS="production|prod\s|--prod|NODE_ENV=production|RAILS_ENV=production|deploy\s+prod|migrate.*prod"

if echo "$COMMAND" | grep -qiE "$PRODUCTION_KEYWORDS"; then
    echo "WARNING: Command references production environment"
    echo "Command: $COMMAND"
    echo "Please verify this is intentional before proceeding."
    exit 1
fi

# Database operations in production
if echo "$COMMAND" | grep -qiE "(DROP|TRUNCATE|DELETE\s+FROM).*prod"; then
    echo "WARNING: Destructive database operation targeting production"
    exit 1
fi

exit 0
