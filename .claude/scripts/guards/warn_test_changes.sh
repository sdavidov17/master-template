#!/bin/bash
# Guard: Warn when modifying test files
# Exit codes: 0 = allow, 1 = warn, 2 = block

FILE_PATH="$1"

# Test file patterns
TEST_PATTERNS=(
    "*.test.ts"
    "*.test.tsx"
    "*.test.js"
    "*.test.jsx"
    "*.spec.ts"
    "*.spec.tsx"
    "*.spec.js"
    "*.spec.jsx"
    "*_test.go"
    "*_test.py"
    "test_*.py"
    "tests/"
    "__tests__/"
)

for pattern in "${TEST_PATTERNS[@]}"; do
    case "$FILE_PATH" in
        $pattern|*$pattern*)
            echo "WARNING: Modifying test file: $FILE_PATH"
            echo "Ensure tests still pass after modifications."
            exit 1
            ;;
    esac
done

exit 0
