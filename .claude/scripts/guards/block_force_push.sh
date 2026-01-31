#!/bin/bash
# Guard: Block force push to protected branches
# Exit codes: 0 = allow, 1 = warn, 2 = block

COMMAND="$1"

# Block force push to main/master
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*--force.*\s+(origin\s+)?(main|master)'; then
    echo "BLOCKED: Force push to main/master is not allowed"
    echo "Use --force-with-lease for safer force pushes on feature branches"
    exit 2
fi

if echo "$COMMAND" | grep -qE 'git\s+push\s+.*-f\s+.*\s+(origin\s+)?(main|master)'; then
    echo "BLOCKED: Force push to main/master is not allowed"
    exit 2
fi

# Block push --force without --force-with-lease (warn only)
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*--force[^-]'; then
    echo "WARNING: Consider using --force-with-lease instead of --force for safety"
    exit 1
fi

exit 0
