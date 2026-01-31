#!/bin/bash
# Guard: Warn on critical file modifications
# Exit codes: 0 = allow, 1 = warn, 2 = block

FILE_PATH="$1"

# Critical configuration files (warn)
CRITICAL_FILES=(
    "schema.prisma"
    "schema.sql"
    "migrations/"
    "docker-compose.yml"
    "docker-compose.yaml"
    "Dockerfile"
    "kubernetes/"
    "k8s/"
    "helm/"
    "terraform/"
    ".tf"
    "Makefile"
    "tsconfig.json"
    "pyproject.toml"
    "go.mod"
    "Cargo.toml"
    ".github/workflows/"
    "CLAUDE.md"
)

for pattern in "${CRITICAL_FILES[@]}"; do
    if [[ "$FILE_PATH" == *"$pattern"* ]]; then
        echo "WARNING: Modifying critical file: $FILE_PATH"
        echo "Changes to this file may have wide-reaching effects."
        echo "Please review carefully before proceeding."
        exit 1
    fi
done

exit 0
