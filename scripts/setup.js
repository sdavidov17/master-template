#!/usr/bin/env node

/**
 * Project Setup Script
 *
 * Initializes a new project from this template.
 * Detects language and scaffolds appropriate configuration.
 *
 * Usage:
 *   node scripts/setup.js
 *   node scripts/setup.js --language=node
 *   node scripts/setup.js --language=python
 *   node scripts/setup.js --language=go
 *   node scripts/setup.js --with-observability
 *   node scripts/setup.js --with-testing
 *   node scripts/setup.js --with-agentic
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const TEMPLATES_DIR = join(__dirname, 'templates');

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {};
args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    options[key] = value || true;
  }
});

/**
 * Prompt user for input
 */
async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Detect project language from existing files
 */
function detectLanguage() {
  if (existsSync(join(PROJECT_ROOT, 'package.json'))) return 'node';
  if (existsSync(join(PROJECT_ROOT, 'pyproject.toml'))) return 'python';
  if (existsSync(join(PROJECT_ROOT, 'requirements.txt'))) return 'python';
  if (existsSync(join(PROJECT_ROOT, 'go.mod'))) return 'go';
  return null;
}

/**
 * Update CLAUDE.md with project info
 */
function updateClaudeMd(projectName, language, mode = 'MVP') {
  const claudeMdPath = join(PROJECT_ROOT, 'CLAUDE.md');

  if (!existsSync(claudeMdPath)) {
    console.log('CLAUDE.md not found, skipping update.');
    return;
  }

  let content = readFileSync(claudeMdPath, 'utf-8');

  content = content.replace('[PROJECT_NAME]', projectName);
  content = content.replace('[BRIEF_DESCRIPTION]', `A ${language} project`);
  content = content.replace('[node|python|go|other]', language);
  content = content.replace('Architecture Mode:** MVP', `Architecture Mode:** ${mode}`);

  writeFileSync(claudeMdPath, content);
  console.log(`✅ Updated CLAUDE.md for ${projectName} (${language})`);
}

/**
 * Create .env.example file
 */
function createEnvExample() {
  const envPath = join(PROJECT_ROOT, '.env.example');

  const content = `# Environment Variables
# Copy this file to .env and fill in the values

# Database
DATABASE_URL=

# API Keys (if needed)
API_KEY=

# Claude Code MCPs (optional)
GITHUB_TOKEN=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
`;

  writeFileSync(envPath, content);
  console.log('✅ Created .env.example');
}

/**
 * Initialize Node.js project
 */
function initNode() {
  console.log('\n📦 Setting up Node.js project...\n');

  // Create src directory
  mkdirSync(join(PROJECT_ROOT, 'src'), { recursive: true });
  mkdirSync(join(PROJECT_ROOT, 'tests'), { recursive: true });

  // Create basic tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      outDir: './dist',
      rootDir: './src',
      declaration: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  };

  writeFileSync(
    join(PROJECT_ROOT, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2)
  );
  console.log('✅ Created tsconfig.json');

  // Update package.json with TypeScript scripts
  const pkgPath = join(PROJECT_ROOT, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

  pkg.scripts = {
    ...pkg.scripts,
    dev: 'tsx watch src/index.ts',
    build: 'tsc',
    start: 'node dist/index.js',
    test: 'vitest run',
    'test:watch': 'vitest',
    lint: 'eslint src/',
  };

  pkg.devDependencies = {
    typescript: '^5.0.0',
    tsx: '^4.0.0',
    vitest: '^2.0.0',
    '@types/node': '^20.0.0',
  };

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log('✅ Updated package.json');

  // Create entry point
  writeFileSync(
    join(PROJECT_ROOT, 'src', 'index.ts'),
    `// Entry point\n\nconsole.log('Hello from ${pkg.name}!');\n`
  );
  console.log('✅ Created src/index.ts');
}

/**
 * Initialize Python project
 */
function initPython() {
  console.log('\n🐍 Setting up Python project...\n');

  // Create src directory
  mkdirSync(join(PROJECT_ROOT, 'src'), { recursive: true });
  mkdirSync(join(PROJECT_ROOT, 'tests'), { recursive: true });

  // Create pyproject.toml
  const pyproject = `[project]
name = "project"
version = "0.1.0"
description = ""
requires-python = ">=3.10"
dependencies = []

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "ruff>=0.4",
    "black>=24.0",
]

[tool.ruff]
line-length = 100
target-version = "py310"

[tool.black]
line-length = 100
target-version = ["py310"]

[tool.pytest.ini_options]
testpaths = ["tests"]
`;

  writeFileSync(join(PROJECT_ROOT, 'pyproject.toml'), pyproject);
  console.log('✅ Created pyproject.toml');

  // Create __init__.py files
  writeFileSync(join(PROJECT_ROOT, 'src', '__init__.py'), '');
  writeFileSync(join(PROJECT_ROOT, 'tests', '__init__.py'), '');
  console.log('✅ Created package structure');

  // Create main.py
  writeFileSync(
    join(PROJECT_ROOT, 'src', 'main.py'),
    `"""Main entry point."""\n\n\ndef main():\n    print("Hello!")\n\n\nif __name__ == "__main__":\n    main()\n`
  );
  console.log('✅ Created src/main.py');
}

/**
 * Initialize Go project
 */
function initGo() {
  console.log('\n🐹 Setting up Go project...\n');

  const projectName = options.name || 'myproject';

  // Create go.mod
  const gomod = `module ${projectName}

go 1.22

require ()
`;

  writeFileSync(join(PROJECT_ROOT, 'go.mod'), gomod);
  console.log('✅ Created go.mod');

  // Create main.go
  const mainGo = `package main

import "fmt"

func main() {
	fmt.Println("Hello from ${projectName}!")
}
`;

  writeFileSync(join(PROJECT_ROOT, 'main.go'), mainGo);
  console.log('✅ Created main.go');

  // Create Makefile
  const makefile = `.PHONY: build run test lint clean

build:
\tgo build -o bin/app .

run:
\tgo run .

test:
\tgo test ./... -v

lint:
\tgolangci-lint run

clean:
\trm -rf bin/
`;

  writeFileSync(join(PROJECT_ROOT, 'Makefile'), makefile);
  console.log('✅ Created Makefile');
}

/**
 * Main setup function
 */
async function main() {
  console.log('🚀 Master Template Setup\n');

  // Determine language
  let language = options.language || detectLanguage();

  if (!language) {
    console.log('No language detected. Please choose:');
    console.log('1. Node.js/TypeScript');
    console.log('2. Python');
    console.log('3. Go');
    console.log('4. Skip (generic)');

    const choice = await prompt('\nEnter choice (1-4): ');

    switch (choice) {
      case '1':
        language = 'node';
        break;
      case '2':
        language = 'python';
        break;
      case '3':
        language = 'go';
        break;
      default:
        language = 'generic';
    }
  }

  // Get project name
  const projectName = options.name || (await prompt('Project name: ')) || 'my-project';

  // Initialize based on language
  switch (language) {
    case 'node':
      initNode();
      break;
    case 'python':
      initPython();
      break;
    case 'go':
      initGo();
      break;
    default:
      console.log('Skipping language-specific setup.');
  }

  // Common setup
  createEnvExample();
  updateClaudeMd(projectName, language);

  // Optional scaffolding
  if (options['with-observability']) {
    await scaffoldObservability(language);
  }

  if (options['with-testing']) {
    await scaffoldTesting(language);
  }

  if (options['with-agentic']) {
    await scaffoldAgentic(language);
  }

  // Install pre-commit hooks
  console.log('\n🔒 Setting up pre-commit hooks...');
  console.log('Run: pip install pre-commit && pre-commit install');

  console.log('\n✨ Setup complete!\n');
  console.log('Next steps:');
  console.log('1. Review and customize CLAUDE.md');
  console.log('2. Enable MCPs in .claude/settings.json as needed');
  console.log('3. Install pre-commit hooks: pip install pre-commit && pre-commit install');
  console.log('4. Run your first /plan or /tdd command');
  console.log('');
  console.log('Optional scaffolding (run setup again with flags):');
  console.log('  --with-observability  Add OpenTelemetry and structured logging');
  console.log('  --with-testing        Add contract testing and mutation testing');
  console.log('  --with-agentic        Add LLM tracing and agent testing');
  console.log('');
}

/**
 * Scaffold observability infrastructure
 */
async function scaffoldObservability(language) {
  console.log('\n📊 Scaffolding observability...\n');

  mkdirSync(join(PROJECT_ROOT, 'src', 'lib'), { recursive: true });

  const templateMap = {
    node: {
      otel: 'templates/observability/otel-node.ts',
      logger: 'templates/logging/logger-node.ts',
      health: 'templates/health/health-node.ts',
    },
    python: {
      otel: 'templates/observability/otel-python.py',
      logger: 'templates/logging/logger-python.py',
      health: 'templates/health/health-python.py',
    },
    go: {
      otel: 'templates/observability/otel-go.go',
      logger: 'templates/logging/logger-go.go',
      health: 'templates/health/health-go.go',
    },
  };

  const templates = templateMap[language];
  if (!templates) {
    console.log('Observability templates not available for this language.');
    return;
  }

  // Copy templates
  for (const [name, src] of Object.entries(templates)) {
    const srcPath = join(PROJECT_ROOT, src);
    const ext = language === 'python' ? '.py' : language === 'go' ? '.go' : '.ts';
    const destPath = join(PROJECT_ROOT, 'src', 'lib', `${name}${ext}`);

    if (existsSync(srcPath)) {
      copyFileSync(srcPath, destPath);
      console.log(`✅ Created src/lib/${name}${ext}`);
    }
  }

  console.log('\nInstall dependencies:');
  if (language === 'node') {
    console.log('npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node pino');
  } else if (language === 'python') {
    console.log('pip install opentelemetry-sdk opentelemetry-exporter-otlp structlog');
  } else if (language === 'go') {
    console.log('go get go.opentelemetry.io/otel go.opentelemetry.io/otel/sdk');
  }
}

/**
 * Scaffold testing infrastructure
 */
async function scaffoldTesting(language) {
  console.log('\n🧪 Scaffolding testing infrastructure...\n');

  mkdirSync(join(PROJECT_ROOT, 'tests'), { recursive: true });

  // Copy mutation testing config
  const mutationConfigSrc = join(PROJECT_ROOT, 'templates', 'testing', 'mutation-config.json');
  if (existsSync(mutationConfigSrc) && language === 'node') {
    copyFileSync(mutationConfigSrc, join(PROJECT_ROOT, 'stryker.config.json'));
    console.log('✅ Created stryker.config.json (mutation testing)');
  }

  // Copy contract testing templates
  if (language === 'node') {
    const consumerSrc = join(PROJECT_ROOT, 'templates', 'testing', 'contract-consumer.ts');
    const providerSrc = join(PROJECT_ROOT, 'templates', 'testing', 'contract-provider.ts');

    if (existsSync(consumerSrc)) {
      copyFileSync(consumerSrc, join(PROJECT_ROOT, 'tests', 'contract-consumer.test.ts'));
      console.log('✅ Created tests/contract-consumer.test.ts');
    }
    if (existsSync(providerSrc)) {
      copyFileSync(providerSrc, join(PROJECT_ROOT, 'tests', 'contract-provider.test.ts'));
      console.log('✅ Created tests/contract-provider.test.ts');
    }

    // Copy accessibility config
    const a11ySrc = join(PROJECT_ROOT, 'templates', 'testing', 'a11y-config.ts');
    if (existsSync(a11ySrc)) {
      copyFileSync(a11ySrc, join(PROJECT_ROOT, 'tests', 'accessibility.test.ts'));
      console.log('✅ Created tests/accessibility.test.ts');
    }
  }

  console.log('\nInstall dependencies:');
  if (language === 'node') {
    console.log('npm install --save-dev @stryker-mutator/core @pact-foundation/pact @axe-core/playwright');
  } else if (language === 'python') {
    console.log('pip install mutmut pact-python axe-selenium-python');
  }
}

/**
 * Scaffold agentic infrastructure
 */
async function scaffoldAgentic(language) {
  console.log('\n🤖 Scaffolding agentic infrastructure...\n');

  if (language !== 'node') {
    console.log('Agentic templates currently only available for Node.js/TypeScript.');
    return;
  }

  mkdirSync(join(PROJECT_ROOT, 'src', 'lib', 'agentic'), { recursive: true });

  const templates = [
    { src: 'templates/agentic/llm-tracing.ts', dest: 'src/lib/agentic/llm-tracing.ts' },
    { src: 'templates/agentic/agent-testing.ts', dest: 'src/lib/agentic/agent-testing.ts' },
    { src: 'templates/agentic/prompt-versioning.ts', dest: 'src/lib/agentic/prompt-versioning.ts' },
    { src: 'templates/agentic/cost-tracking.ts', dest: 'src/lib/agentic/cost-tracking.ts' },
  ];

  for (const { src, dest } of templates) {
    const srcPath = join(PROJECT_ROOT, src);
    const destPath = join(PROJECT_ROOT, dest);

    if (existsSync(srcPath)) {
      copyFileSync(srcPath, destPath);
      console.log(`✅ Created ${dest}`);
    }
  }

  console.log('\nInstall dependencies:');
  console.log('npm install openai @opentelemetry/api');
}

main().catch(console.error);
