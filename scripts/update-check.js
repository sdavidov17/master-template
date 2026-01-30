#!/usr/bin/env node

/**
 * Update Check Script
 *
 * Checks upstream template repositories for updates.
 * Used by the daily GitHub Action workflow.
 *
 * Upstream repos monitored:
 * - affaan-m/everything-claude-code
 * - obra/superpowers
 * - davila7/claude-code-templates
 */

import https from 'https';

const UPSTREAM_REPOS = [
  {
    name: 'everything-claude-code',
    owner: 'affaan-m',
    repo: 'everything-claude-code',
    description: 'Battle-tested Claude Code configs (Anthropic hackathon winner)',
  },
  {
    name: 'superpowers',
    owner: 'obra',
    repo: 'superpowers',
    description: 'Workflow enforcement framework for coding agents',
  },
  {
    name: 'claude-code-templates',
    owner: 'davila7',
    repo: 'claude-code-templates',
    description: '100+ installable Claude Code components',
  },
];

// File to track last checked commits
const CACHE_FILE = '.claude/memory/upstream-versions.json';

/**
 * Fetch latest commit info from GitHub API
 */
function fetchLatestCommit(owner, repo) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/commits?per_page=1`,
      headers: {
        'User-Agent': 'master-template-update-check',
        Accept: 'application/vnd.github.v3+json',
      },
    };

    https
      .get(options, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const commits = JSON.parse(data);
            if (commits.length > 0) {
              resolve({
                sha: commits[0].sha,
                message: commits[0].commit.message.split('\n')[0],
                date: commits[0].commit.committer.date,
                author: commits[0].commit.author.name,
              });
            } else {
              resolve(null);
            }
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

/**
 * Fetch repo info (stars, updated date)
 */
function fetchRepoInfo(owner, repo) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}`,
      headers: {
        'User-Agent': 'master-template-update-check',
        Accept: 'application/vnd.github.v3+json',
      },
    };

    https
      .get(options, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const repoData = JSON.parse(data);
            resolve({
              stars: repoData.stargazers_count,
              updated: repoData.updated_at,
              description: repoData.description,
            });
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

/**
 * Load cached version info
 */
function loadCache() {
  try {
    const fs = await import('fs');
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }
  } catch {
    // Cache doesn't exist or is invalid
  }
  return {};
}

/**
 * Save cache
 */
async function saveCache(cache) {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (e) {
    console.error('Failed to save cache:', e.message);
  }
}

/**
 * Main check function
 */
async function main() {
  console.log('🔍 Checking upstream template repositories...\n');
  console.log(`Date: ${new Date().toISOString()}\n`);

  const updates = [];
  const results = [];

  for (const upstream of UPSTREAM_REPOS) {
    try {
      console.log(`Checking ${upstream.owner}/${upstream.repo}...`);

      const [commit, info] = await Promise.all([
        fetchLatestCommit(upstream.owner, upstream.repo),
        fetchRepoInfo(upstream.owner, upstream.repo),
      ]);

      if (commit) {
        results.push({
          name: upstream.name,
          owner: upstream.owner,
          repo: upstream.repo,
          description: upstream.description,
          stars: info?.stars || 'N/A',
          latestCommit: commit.sha.slice(0, 7),
          commitMessage: commit.message,
          commitDate: commit.date,
          commitAuthor: commit.author,
        });

        console.log(`  ✅ Latest: ${commit.sha.slice(0, 7)} - ${commit.message}`);
        console.log(`  📅 Date: ${new Date(commit.date).toLocaleDateString()}`);
        console.log(`  ⭐ Stars: ${info?.stars?.toLocaleString() || 'N/A'}`);
      } else {
        console.log(`  ⚠️ Could not fetch commit info`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log('');
  }

  // Summary
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log('');

  if (results.length > 0) {
    console.log('Updates available from upstream repositories:\n');

    for (const result of results) {
      console.log(`📦 ${result.name}`);
      console.log(`   Repo: https://github.com/${result.owner}/${result.repo}`);
      console.log(`   Stars: ${result.stars?.toLocaleString() || 'N/A'}`);
      console.log(`   Latest: ${result.latestCommit} (${new Date(result.commitDate).toLocaleDateString()})`);
      console.log(`   Message: ${result.commitMessage}`);
      console.log('');
    }

    console.log('\nTo incorporate updates:');
    console.log('1. Review changes in each repo');
    console.log('2. Update relevant files in this template');
    console.log('3. Test changes locally');
    console.log('4. Commit with message: "chore: sync with upstream templates"');
  } else {
    console.log('No updates found or unable to check repositories.');
  }

  // Output for GitHub Action detection
  if (results.length > 0) {
    console.log('\nUpdates available');
  }
}

main().catch(error => {
  console.error('Update check failed:', error);
  process.exit(1);
});
