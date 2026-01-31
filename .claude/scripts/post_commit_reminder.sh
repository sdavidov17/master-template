#!/bin/bash
# Post-commit reminder to run /reflect if there are pending learnings
# Can be used as a git post-commit hook

LEARNINGS_FILE=".claude/learnings.json"

# Check if learnings file exists and has learnings
if [ -f "$LEARNINGS_FILE" ]; then
    # Count learnings using jq if available
    if command -v jq &> /dev/null; then
        count=$(jq '.learnings | length' "$LEARNINGS_FILE" 2>/dev/null || echo "0")
    else
        # Fallback: grep for learning entries
        count=$(grep -c '"date"' "$LEARNINGS_FILE" 2>/dev/null || echo "0")
    fi

    if [ "$count" -gt 0 ]; then
        echo ""
        echo "--------------------------------------"
        echo " You have $count pending learning(s)"
        echo " Run /reflect to process them"
        echo "--------------------------------------"
        echo ""
    fi
fi

exit 0
