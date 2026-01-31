#!/bin/bash
# Guard: Protect sensitive files from accidental modification
# Exit codes: 0 = allow, 1 = warn, 2 = block
# Used with Edit/Write tool hooks

FILE_PATH="$1"

# List of protected file patterns
BLOCKED_FILES=(
    ".env"
    ".env.local"
    ".env.production"
    "credentials.json"
    "secrets.json"
    "service-account.json"
    ".npmrc"
    ".pypirc"
    "id_rsa"
    "id_ed25519"
    "*.pem"
    "*.key"
)

# Check against blocked patterns
for pattern in "${BLOCKED_FILES[@]}"; do
    if [[ "$FILE_PATH" == *"$pattern"* ]]; then
        echo "BLOCKED: Cannot edit sensitive file: $FILE_PATH"
        echo "This file may contain secrets or credentials."
        echo "Edit manually if changes are truly needed."
        exit 2
    fi
done

# Warn on config files that could affect security
WARN_FILES=(
    "package.json"
    "package-lock.json"
    "yarn.lock"
    "requirements.txt"
    "Pipfile.lock"
    "go.sum"
)

for pattern in "${WARN_FILES[@]}"; do
    if [[ "$FILE_PATH" == *"$pattern"* ]]; then
        echo "WARNING: Modifying dependency file: $FILE_PATH"
        echo "Dependency changes should be reviewed carefully."
        exit 1
    fi
done

exit 0
