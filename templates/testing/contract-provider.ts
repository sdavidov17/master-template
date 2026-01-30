/**
 * Contract Testing - Provider Side (Pact)
 *
 * Provider verification ensures that the provider (API) meets the contracts
 * defined by its consumers.
 *
 * This file demonstrates verifying a provider against consumer contracts.
 *
 * Installation:
 *   npm install @pact-foundation/pact @pact-foundation/pact-core
 *
 * Usage:
 *   1. Copy this file to your test directory
 *   2. Modify the state handlers for your API
 *   3. Run: npm test
 *   4. Results are reported back to the Pact Broker
 */

import { Verifier, VerifierOptions } from '@pact-foundation/pact';
import path from 'path';
import { Server } from 'http';

// Import your actual server/app
// import { createApp } from '../src/app';

// Example: Create a simple Express-like test server
import express, { Express } from 'express';

/**
 * Create the application for testing
 * Replace this with your actual app factory
 */
function createTestApp(): Express {
  const app = express();
  app.use(express.json());

  // In-memory test data store
  const users = new Map<string, { id: string; name: string; email: string; createdAt: string }>();

  // GET /users/:id
  app.get('/users/:id', (req, res) => {
    const user = users.get(req.params.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }
    res.json(user);
  });

  // POST /users
  app.post('/users', (req, res) => {
    const { name, email } = req.body;

    // Validate email
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        error: 'Invalid email format',
        code: 'VALIDATION_ERROR',
        field: 'email',
      });
    }

    const id = `user-${Date.now()}`;
    const user = {
      id,
      name,
      email,
      createdAt: new Date().toISOString(),
    };
    users.set(id, user);
    res.status(201).json(user);
  });

  // GET /users
  app.get('/users', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const allUsers = Array.from(users.values());
    const pageUsers = allUsers.slice(0, limit);

    res.json({
      users: pageUsers.map(({ id, name }) => ({ id, name })),
      total: allUsers.length || 10, // Default for tests
      page: 1,
      pageSize: limit,
    });
  });

  // Expose users map for state handlers
  (app as any).users = users;

  return app;
}

describe('User Service Provider Verification', () => {
  let server: Server;
  let app: Express;
  const port = 8081;

  beforeAll((done) => {
    app = createTestApp();
    server = app.listen(port, () => {
      console.log(`Provider running on port ${port}`);
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('validates the expectations of MyConsumerApp', async () => {
    const opts: VerifierOptions = {
      // Provider information
      provider: 'UserService',
      providerBaseUrl: `http://localhost:${port}`,

      // Pact sources - choose one:

      // Option 1: Local pact files (for development)
      pactUrls: [path.resolve(process.cwd(), 'pacts', 'MyConsumerApp-UserService.json')],

      // Option 2: Pact Broker (for CI/CD)
      // pactBrokerUrl: process.env.PACT_BROKER_URL,
      // pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      // consumerVersionSelectors: [
      //   { mainBranch: true },
      //   { deployedOrReleased: true },
      // ],

      // Provider version for Pact Broker
      providerVersion: process.env.GIT_COMMIT || '1.0.0',
      providerVersionBranch: process.env.GIT_BRANCH || 'main',

      // Publish verification results to broker
      publishVerificationResult: process.env.CI === 'true',

      // State handlers - set up provider state before each interaction
      stateHandlers: {
        'a user with ID abc-123 exists': async () => {
          const users = (app as any).users;
          users.set('abc-123', {
            id: 'abc-123',
            name: 'John Doe',
            email: 'john@example.com',
            createdAt: '2024-01-15T10:30:00Z',
          });
        },

        'no user with ID nonexistent exists': async () => {
          const users = (app as any).users;
          users.delete('nonexistent');
        },

        'there are users in the system': async () => {
          const users = (app as any).users;
          users.clear();
          for (let i = 1; i <= 10; i++) {
            users.set(`user-${i}`, {
              id: `user-${i}`,
              name: `User ${i}`,
              email: `user${i}@example.com`,
              createdAt: new Date().toISOString(),
            });
          }
        },

        'there are many users in the system': async () => {
          const users = (app as any).users;
          users.clear();
          for (let i = 1; i <= 100; i++) {
            users.set(`user-${i}`, {
              id: `user-${i}`,
              name: `User ${i}`,
              email: `user${i}@example.com`,
              createdAt: new Date().toISOString(),
            });
          }
        },
      },

      // Request filter - modify requests before they're made (e.g., add auth)
      requestFilter: (req, res, next) => {
        // Add authentication header for all requests
        // req.headers['Authorization'] = 'Bearer test-token';
        next();
      },

      // Logging
      logLevel: 'warn',
    };

    // Run verification
    const verifier = new Verifier(opts);
    await verifier.verifyProvider();
  });
});

/**
 * CI/CD Integration
 *
 * Provider verification in CI typically looks like:
 *
 * ```yaml
 * # .github/workflows/contract-tests.yml
 * jobs:
 *   provider-verification:
 *     runs-on: ubuntu-latest
 *     steps:
 *       - uses: actions/checkout@v4
 *
 *       - name: Setup Node
 *         uses: actions/setup-node@v4
 *
 *       - name: Install dependencies
 *         run: npm ci
 *
 *       - name: Run provider verification
 *         env:
 *           PACT_BROKER_URL: ${{ secrets.PACT_BROKER_URL }}
 *           PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
 *           GIT_COMMIT: ${{ github.sha }}
 *           GIT_BRANCH: ${{ github.ref_name }}
 *           CI: true
 *         run: npm run test:contract:provider
 *
 *       - name: Can I deploy?
 *         run: |
 *           npx pact-broker can-i-deploy \
 *             --pacticipant=UserService \
 *             --version=${{ github.sha }} \
 *             --to-environment=production
 * ```
 *
 * Webhook Setup:
 *
 * Configure the Pact Broker to trigger provider verification when a consumer
 * publishes a new pact. This ensures contracts are verified immediately.
 */

/**
 * State Handler Best Practices:
 *
 * 1. Keep state handlers idempotent - they may run multiple times
 * 2. Clean up state between tests when necessary
 * 3. Use a separate test database or in-memory store
 * 4. State descriptions should match exactly what consumers define
 * 5. Consider using a factory pattern for complex state setup
 */

/**
 * Handling Authentication:
 *
 * If your API requires authentication:
 *
 * 1. Use the requestFilter to add auth headers
 * 2. Create a test-only authentication bypass
 * 3. Or use provider states to set up authenticated sessions
 *
 * Example:
 * ```typescript
 * stateHandlers: {
 *   'user is authenticated as admin': async () => {
 *     // Set up admin session/token that the request filter will use
 *     process.env.TEST_AUTH_TOKEN = 'admin-token';
 *   }
 * }
 * ```
 */

export { createTestApp };
