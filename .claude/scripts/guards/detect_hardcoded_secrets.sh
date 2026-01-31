#!/bin/bash
# Guard: Detect hardcoded secrets in code being written
# Exit codes: 0 = allow, 1 = warn, 2 = block
# Used with Edit/Write tool hooks - receives file content via stdin

CONTENT=$(cat)

# AWS Access Keys (AKIA...)
if echo "$CONTENT" | grep -qE 'AKIA[0-9A-Z]{16}'; then
    echo "BLOCKED: AWS Access Key ID detected in code"
    echo "Use environment variables instead: process.env.AWS_ACCESS_KEY_ID"
    exit 2
fi

# AWS Secret Keys (40 char base64)
if echo "$CONTENT" | grep -qE '["\x27][A-Za-z0-9/+=]{40}["\x27].*[Ss]ecret'; then
    echo "BLOCKED: Potential AWS Secret Access Key detected"
    exit 2
fi

# GitHub tokens
if echo "$CONTENT" | grep -qE 'gh[ps]_[A-Za-z0-9]{36,}'; then
    echo "BLOCKED: GitHub token detected in code"
    echo "Use GITHUB_TOKEN environment variable instead"
    exit 2
fi

if echo "$CONTENT" | grep -qE 'github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59}'; then
    echo "BLOCKED: GitHub Personal Access Token detected"
    exit 2
fi

# Slack tokens
if echo "$CONTENT" | grep -qE 'xox[baprs]-[0-9]{10,}-[A-Za-z0-9]+'; then
    echo "BLOCKED: Slack token detected in code"
    exit 2
fi

# Generic API keys (high confidence patterns)
if echo "$CONTENT" | grep -qE '["\x27]sk-[A-Za-z0-9]{32,}["\x27]'; then
    echo "BLOCKED: API key (sk-...) detected in code"
    echo "Use environment variables for API keys"
    exit 2
fi

# Stripe keys
if echo "$CONTENT" | grep -qE 'sk_live_[A-Za-z0-9]{24,}'; then
    echo "BLOCKED: Stripe live secret key detected"
    exit 2
fi

# Private keys
if echo "$CONTENT" | grep -qE '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'; then
    echo "BLOCKED: Private key detected in code"
    echo "Never commit private keys to source control"
    exit 2
fi

# JWTs (warn only - might be test tokens)
if echo "$CONTENT" | grep -qE 'eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'; then
    echo "WARNING: JWT token detected - verify this is a test/example token"
    exit 1
fi

exit 0
