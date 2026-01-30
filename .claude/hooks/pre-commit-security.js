#!/usr/bin/env node

/**
 * Pre-commit Security Hook for Claude Code
 *
 * Scans staged files for potential secrets before committing.
 * Works alongside Gitleaks pre-commit hook as an additional layer.
 *
 * Patterns detected:
 * - API keys (various formats)
 * - AWS credentials
 * - Database connection strings
 * - JWT tokens
 * - Private keys
 * - Generic high-entropy strings
 */

import { execSync } from 'child_process';

// Secret patterns to detect
const SECRET_PATTERNS = [
  // AWS
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g },
  { name: 'AWS Secret Key', pattern: /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g, context: /aws|secret|key/i },

  // API Keys
  { name: 'Generic API Key', pattern: /api[_-]?key\s*[=:]\s*['"]?[A-Za-z0-9_\-]{20,}['"]?/gi },
  { name: 'Bearer Token', pattern: /bearer\s+[A-Za-z0-9_\-\.]+/gi },

  // Database
  { name: 'Database URL', pattern: /(postgres|mysql|mongodb|redis):\/\/[^@\s]+:[^@\s]+@/gi },

  // JWT
  { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g },

  // Private Keys
  { name: 'Private Key', pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g },
  { name: 'OpenSSH Private Key', pattern: /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----/g },

  // Common vendor patterns
  { name: 'Slack Token', pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g },
  { name: 'GitHub Token', pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g },
  { name: 'Stripe Key', pattern: /sk_live_[0-9a-zA-Z]{24,}/g },
  { name: 'Stripe Publishable', pattern: /pk_live_[0-9a-zA-Z]{24,}/g },
  { name: 'SendGrid Key', pattern: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g },
  { name: 'Twilio Key', pattern: /SK[0-9a-fA-F]{32}/g },
  { name: 'OpenAI Key', pattern: /sk-[A-Za-z0-9]{48}/g },
  { name: 'Anthropic Key', pattern: /sk-ant-[A-Za-z0-9_-]{40,}/g },

  // Generic patterns
  { name: 'Password Assignment', pattern: /password\s*[=:]\s*['"][^'"]{8,}['"]/gi },
  { name: 'Secret Assignment', pattern: /secret\s*[=:]\s*['"][^'"]{8,}['"]/gi },
];

// Files to skip
const SKIP_PATTERNS = [
  /node_modules\//,
  /\.git\//,
  /dist\//,
  /build\//,
  /\.env\.example$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.secrets\.baseline$/,
  /\.pre-commit-config\.yaml$/,
  /pre-commit-security\.js$/, // Skip this file itself
];

/**
 * Get staged files from git
 */
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      encoding: 'utf-8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    return [];
  }
}

/**
 * Read file content
 */
function readFile(filePath) {
  try {
    return execSync(`git show :${filePath}`, { encoding: 'utf-8' });
  } catch (error) {
    return null;
  }
}

/**
 * Check if file should be skipped
 */
function shouldSkip(filePath) {
  return SKIP_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Scan content for secrets
 */
function scanForSecrets(content, filePath) {
  const findings = [];

  for (const { name, pattern, context } of SECRET_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      // If pattern requires context, verify it
      if (context && !context.test(content)) {
        continue;
      }

      // Find line numbers for matches
      const lines = content.split('\n');
      for (const match of matches) {
        const lineNum = lines.findIndex(line => line.includes(match)) + 1;
        findings.push({
          type: name,
          file: filePath,
          line: lineNum,
          match: match.substring(0, 50) + (match.length > 50 ? '...' : ''),
        });
      }
    }
  }

  return findings;
}

/**
 * Main execution
 */
function main() {
  const files = getStagedFiles();
  const allFindings = [];

  for (const file of files) {
    if (shouldSkip(file)) continue;

    const content = readFile(file);
    if (!content) continue;

    const findings = scanForSecrets(content, file);
    allFindings.push(...findings);
  }

  if (allFindings.length > 0) {
    console.error('\n🚨 SECURITY: Potential secrets detected in staged files!\n');

    for (const finding of allFindings) {
      console.error(`  ❌ ${finding.type}`);
      console.error(`     File: ${finding.file}:${finding.line}`);
      console.error(`     Match: ${finding.match}\n`);
    }

    console.error('To fix:');
    console.error('1. Remove the secret from your code');
    console.error('2. Use environment variables instead');
    console.error('3. If this is a false positive, add to .secrets.baseline\n');

    process.exit(1);
  }

  console.log('✅ No secrets detected in staged files');
  process.exit(0);
}

// Export for testing
export { scanForSecrets, SECRET_PATTERNS };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
