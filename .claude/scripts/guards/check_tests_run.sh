#!/bin/bash
# Guard: Remind to run tests before ending session
# Used as a Stop hook to verify tests were run
# Exit codes: 0 = allow (reminder only)

# This is a gentle reminder, not a blocker
# Check if common test commands were recently run by looking at shell history

echo "Session ending reminder:"
echo "-------------------------"
echo "Before finalizing changes, ensure you have:"
echo "  [ ] Run the test suite (npm test / pytest / go test)"
echo "  [ ] Verified no linting errors (npm run lint / ruff check)"
echo "  [ ] Reviewed changes with 'git diff'"
echo ""
echo "Use /ship command for a comprehensive pre-merge checklist."

exit 0
