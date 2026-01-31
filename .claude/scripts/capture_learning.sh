#!/bin/bash
# Capture learnings from session for later reflection
# This script can be called to add a learning to learnings.json

LEARNINGS_FILE=".claude/learnings.json"
DATE=$(date +%Y-%m-%d)

# Function to add a learning
add_learning() {
    local category="$1"
    local original="$2"
    local correction="$3"
    local context="${4:-}"
    local file="${5:-}"

    if [ ! -f "$LEARNINGS_FILE" ]; then
        echo "Creating learnings file..."
        echo '{"learnings":[]}' > "$LEARNINGS_FILE"
    fi

    # Create the learning object
    local learning="{\"date\":\"$DATE\",\"category\":\"$category\",\"original\":\"$original\",\"correction\":\"$correction\""

    if [ -n "$context" ]; then
        learning="$learning,\"context\":\"$context\""
    fi

    if [ -n "$file" ]; then
        learning="$learning,\"file\":\"$file\""
    fi

    learning="$learning}"

    # Add to learnings array using jq if available, otherwise use sed
    if command -v jq &> /dev/null; then
        jq ".learnings += [$learning]" "$LEARNINGS_FILE" > "$LEARNINGS_FILE.tmp" && mv "$LEARNINGS_FILE.tmp" "$LEARNINGS_FILE"
    else
        # Fallback: append manually (less robust)
        echo "Note: Install jq for better JSON handling"
        echo "Learning captured: $correction"
    fi

    echo "Learning captured successfully!"
}

# Show usage
show_usage() {
    echo "Usage: capture_learning.sh <category> <original> <correction> [context] [file]"
    echo ""
    echo "Categories: style, pattern, tool, architecture, security, testing, workflow"
    echo ""
    echo "Example:"
    echo "  ./capture_learning.sh style 'Used snake_case' 'Use camelCase for functions' 'TypeScript convention'"
}

# Main
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_usage
    exit 0
fi

if [ $# -lt 3 ]; then
    show_usage
    exit 1
fi

add_learning "$1" "$2" "$3" "$4" "$5"
