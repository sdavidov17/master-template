#!/usr/bin/env node

/**
 * Session Hooks for Claude Code
 *
 * Cross-platform Node.js implementation of session lifecycle hooks.
 * These hooks help maintain context across Claude Code sessions.
 *
 * Usage:
 * - Session start: node session-hooks.js start
 * - Session end: node session-hooks.js end
 * - Pre-edit check: node session-hooks.js pre-edit <file>
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const MEMORY_DIR = join(PROJECT_ROOT, '.claude', 'memory');
const SESSION_FILE = join(MEMORY_DIR, 'last-session.json');

/**
 * Ensure memory directory exists
 */
function ensureMemoryDir() {
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

/**
 * Load previous session context
 */
function loadSessionContext() {
  ensureMemoryDir();

  if (!existsSync(SESSION_FILE)) {
    console.log('No previous session found. Starting fresh.');
    return null;
  }

  try {
    const data = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
    console.log('=== Previous Session Context ===');
    console.log(`Last active: ${data.timestamp}`);

    if (data.workingOn) {
      console.log(`Working on: ${data.workingOn}`);
    }

    if (data.pendingTasks?.length > 0) {
      console.log('Pending tasks:');
      data.pendingTasks.forEach((task, i) => {
        console.log(`  ${i + 1}. ${task}`);
      });
    }

    if (data.recentFiles?.length > 0) {
      console.log('Recent files:');
      data.recentFiles.forEach(file => {
        console.log(`  - ${file}`);
      });
    }

    console.log('================================');
    return data;
  } catch (error) {
    console.error('Failed to load session context:', error.message);
    return null;
  }
}

/**
 * Save session context for next session
 */
function saveSessionContext(context = {}) {
  ensureMemoryDir();

  const sessionData = {
    timestamp: new Date().toISOString(),
    workingOn: context.workingOn || null,
    pendingTasks: context.pendingTasks || [],
    recentFiles: context.recentFiles || [],
    notes: context.notes || '',
  };

  try {
    writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
    console.log('Session context saved.');
  } catch (error) {
    console.error('Failed to save session context:', error.message);
  }
}

/**
 * Pre-edit check for common issues
 */
function preEditCheck(filePath) {
  if (!filePath) {
    console.log('No file path provided for pre-edit check.');
    return;
  }

  const warnings = [];

  // Check for console.log in TypeScript/JavaScript files
  if (filePath.match(/\.(ts|tsx|js|jsx)$/)) {
    try {
      const content = readFileSync(filePath, 'utf-8');

      // Count console.log occurrences
      const consoleMatches = content.match(/console\.(log|debug|info)/g);
      if (consoleMatches) {
        warnings.push(`Found ${consoleMatches.length} console.log statement(s) - remove before shipping`);
      }

      // Check for TODO comments
      const todoMatches = content.match(/\/\/\s*TODO/gi);
      if (todoMatches) {
        warnings.push(`Found ${todoMatches.length} TODO comment(s)`);
      }

      // Check file size
      const lines = content.split('\n').length;
      if (lines > 400) {
        warnings.push(`File has ${lines} lines (target: 200-400, max: 800)`);
      }
    } catch (error) {
      // File might not exist yet
    }
  }

  if (warnings.length > 0) {
    console.log('=== Pre-Edit Warnings ===');
    warnings.forEach(w => console.log(`⚠️  ${w}`));
    console.log('=========================');
  }
}

// CLI handling
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'start':
    loadSessionContext();
    break;
  case 'end':
    saveSessionContext({
      workingOn: arg || null,
    });
    break;
  case 'pre-edit':
    preEditCheck(arg);
    break;
  default:
    console.log('Usage: node session-hooks.js <start|end|pre-edit> [arg]');
}
