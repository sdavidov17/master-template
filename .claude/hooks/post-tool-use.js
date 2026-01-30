#!/usr/bin/env node

/**
 * PostToolUse Hook - Code Formatting
 *
 * Automatically formats code after Claude writes or edits files.
 * Boris Cherny: "Claude is usually well-formatted, and the hook fixes the last 10%"
 *
 * This prevents CI failures due to formatting issues.
 *
 * Usage in .claude/settings.json:
 * {
 *   "hooks": {
 *     "PostToolUse": [{
 *       "matcher": "Write|Edit",
 *       "command": "node .claude/hooks/post-tool-use.js"
 *     }]
 *   }
 * }
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, extname } from 'path';

// Get the file path from environment or argument
const filePath = process.env.CLAUDE_FILE_PATH || process.argv[2];

if (!filePath) {
  // No file specified, exit silently
  process.exit(0);
}

/**
 * Detect project type and return appropriate format command
 */
function getFormatCommand(file) {
  const ext = extname(file).toLowerCase();
  const dir = process.cwd();

  // Node.js / TypeScript projects
  if (existsSync(join(dir, 'package.json'))) {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
    const scripts = pkg.scripts || {};

    // Check for format script
    if (scripts.format) {
      return `npm run format -- "${file}" 2>/dev/null || true`;
    }

    // Check for prettier
    if (pkg.devDependencies?.prettier || pkg.dependencies?.prettier) {
      return `npx prettier --write "${file}" 2>/dev/null || true`;
    }

    // Check for biome
    if (pkg.devDependencies?.['@biomejs/biome']) {
      return `npx biome format --write "${file}" 2>/dev/null || true`;
    }

    // Fallback for JS/TS files
    if (['.js', '.jsx', '.ts', '.tsx', '.json'].includes(ext)) {
      return `npx prettier --write "${file}" 2>/dev/null || true`;
    }
  }

  // Python projects
  if (existsSync(join(dir, 'pyproject.toml')) || existsSync(join(dir, 'requirements.txt'))) {
    if (['.py'].includes(ext)) {
      // Try black first, then ruff
      return `black "${file}" 2>/dev/null || ruff format "${file}" 2>/dev/null || true`;
    }
  }

  // Go projects
  if (existsSync(join(dir, 'go.mod'))) {
    if (['.go'].includes(ext)) {
      return `gofmt -w "${file}" 2>/dev/null || true`;
    }
  }

  // Rust projects
  if (existsSync(join(dir, 'Cargo.toml'))) {
    if (['.rs'].includes(ext)) {
      return `rustfmt "${file}" 2>/dev/null || true`;
    }
  }

  return null;
}

/**
 * Format the file
 */
function formatFile(file) {
  if (!existsSync(file)) {
    return;
  }

  const command = getFormatCommand(file);

  if (command) {
    try {
      execSync(command, {
        stdio: 'pipe',
        timeout: 10000, // 10 second timeout
      });
      console.log(`Formatted: ${file}`);
    } catch (error) {
      // Silently ignore formatting errors
      // The file might not need formatting or formatter might not be installed
    }
  }
}

// Run formatter
formatFile(filePath);
