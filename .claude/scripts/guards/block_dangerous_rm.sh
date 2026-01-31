#!/bin/bash
# Guard: Block dangerous rm commands
# Exit codes: 0 = allow, 1 = warn, 2 = block

COMMAND="$1"

# Block rm -rf with dangerous paths
if echo "$COMMAND" | grep -qE 'rm\s+(-rf|-fr|-r\s+-f|-f\s+-r)\s+(/|~|/home|/Users|\$HOME)'; then
    echo "BLOCKED: Dangerous rm command detected: $COMMAND"
    echo "This command could delete critical system or user files."
    exit 2
fi

# Block rm -rf with wildcard at root-level directories
if echo "$COMMAND" | grep -qE 'rm\s+(-rf|-fr)\s+/[a-zA-Z]+/\*'; then
    echo "BLOCKED: Dangerous rm command with wildcard: $COMMAND"
    exit 2
fi

exit 0
