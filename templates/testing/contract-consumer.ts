/**
 * Contract Testing - Consumer Side (Pact)
 *
 * Consumer-driven contract testing ensures that services can communicate correctly.
 * The consumer defines the contract, and the provider verifies it.
 *
 * This file demonstrates testing a consumer (client) that calls a provider (API).
 *
 * Installation:
 *   npm install @pact-foundation/pact @pact-foundation/pact-core
 *
 * Usage:
 *   1. Copy this file to your test directory
 *   2. Modify the interactions for your API
 *   3. Run: npm test
 *   4. Publish pact to broker: npx pact-broker publish ./pacts --consumer-app-version=1.0.0
 */

import { PactV4, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';

// Import your actual API client
// import { UserApiClient } from '../src/clients/user-api';

// Example API client for demonstration
class UserApiClient {
  constructor(private baseUrl: string) {}

  async getUser(id: string): Promise<{ id: string; name: string; email: string }> {
    const response = await fetch(`${this.baseUrl}/users/${id}`);
    if (!response.ok) {
      throw new Error(`User not found: ${response.status}`);
    }
    return response.json();
  }

  async createUser(user: { name: string; email: string }): Promise<{ id: string; name: string; email: string }> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.status}`);
    }
    return response.json();
  }

  async listUsers(limit?: number): Promise<{ users: Array<{ id: string; name: string }>; total: number }> {
    const url = limit ? `${this.baseUrl}/users?limit=${limit}` : `${this.baseUrl}/users`;
    const response = await fetch(url);
    return response.json();
  }
}

// Pact matchers for flexible matching
const { like, eachLike, regex, integer, string, uuid } = MatchersV3;

describe('User API Contract Tests', () => {
  // Configure the Pact provider
  const provider = new PactV4({
    consumer: 'MyConsumerApp',
    provider: 'UserService',
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'warn',
  });

  describe('GET /users/:id', () => {
    it('returns a user when the user exists', async () => {
      // Define the expected interaction
      await provider
        .addInteraction()
        .given('a user with ID abc-123 exists')
        .uponReceiving('a request for user abc-123')
        .withRequest('GET', '/users/abc-123', (builder) => {
          builder.headers({ Accept: 'application/json' });
        })
        .willRespondWith(200, (builder) => {
          builder
            .headers({ 'Content-Type': 'application/json' })
            .jsonBody({
              id: 'abc-123',
              name: like('John Doe'),
              email: regex(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'john@example.com'),
              createdAt: like('2024-01-15T10:30:00Z'),
            });
        })
        .executeTest(async (mockServer) => {
          // Create client pointing to mock server
          const client = new UserApiClient(mockServer.url);

          // Execute the actual client method
          const user = await client.getUser('abc-123');

          // Verify the response
          expect(user.id).toBe('abc-123');
          expect(user.name).toBeDefined();
          expect(user.email).toMatch(/@/);
        });
    });

    it('returns 404 when user does not exist', async () => {
      await provider
        .addInteraction()
        .given('no user with ID nonexistent exists')
        .uponReceiving('a request for a nonexistent user')
        .withRequest('GET', '/users/nonexistent')
        .willRespondWith(404, (builder) => {
          builder.jsonBody({
            error: like('User not found'),
            code: 'USER_NOT_FOUND',
          });
        })
        .executeTest(async (mockServer) => {
          const client = new UserApiClient(mockServer.url);

          await expect(client.getUser('nonexistent')).rejects.toThrow('User not found');
        });
    });
  });

  describe('POST /users', () => {
    it('creates a new user', async () => {
      const newUser = {
        name: 'Jane Doe',
        email: 'jane@example.com',
      };

      await provider
        .addInteraction()
        .uponReceiving('a request to create a new user')
        .withRequest('POST', '/users', (builder) => {
          builder
            .headers({
              'Content-Type': 'application/json',
              Accept: 'application/json',
            })
            .jsonBody({
              name: like('Jane Doe'),
              email: regex(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'jane@example.com'),
            });
        })
        .willRespondWith(201, (builder) => {
          builder
            .headers({ 'Content-Type': 'application/json' })
            .jsonBody({
              id: uuid(),
              name: like('Jane Doe'),
              email: like('jane@example.com'),
              createdAt: like('2024-01-15T10:30:00Z'),
            });
        })
        .executeTest(async (mockServer) => {
          const client = new UserApiClient(mockServer.url);

          const created = await client.createUser(newUser);

          expect(created.id).toBeDefined();
          expect(created.name).toBe('Jane Doe');
          expect(created.email).toBe('jane@example.com');
        });
    });

    it('returns 400 for invalid email', async () => {
      await provider
        .addInteraction()
        .uponReceiving('a request to create a user with invalid email')
        .withRequest('POST', '/users', (builder) => {
          builder
            .headers({ 'Content-Type': 'application/json' })
            .jsonBody({
              name: 'Test User',
              email: 'invalid-email',
            });
        })
        .willRespondWith(400, (builder) => {
          builder.jsonBody({
            error: like('Invalid email format'),
            code: 'VALIDATION_ERROR',
            field: 'email',
          });
        })
        .executeTest(async (mockServer) => {
          const client = new UserApiClient(mockServer.url);

          await expect(
            client.createUser({ name: 'Test User', email: 'invalid-email' })
          ).rejects.toThrow();
        });
    });
  });

  describe('GET /users', () => {
    it('returns a list of users', async () => {
      await provider
        .addInteraction()
        .given('there are users in the system')
        .uponReceiving('a request to list users')
        .withRequest('GET', '/users')
        .willRespondWith(200, (builder) => {
          builder.jsonBody({
            users: eachLike({
              id: uuid(),
              name: like('John Doe'),
            }),
            total: integer(10),
            page: integer(1),
            pageSize: integer(20),
          });
        })
        .executeTest(async (mockServer) => {
          const client = new UserApiClient(mockServer.url);

          const result = await client.listUsers();

          expect(result.users).toBeInstanceOf(Array);
          expect(result.users.length).toBeGreaterThan(0);
          expect(result.total).toBeGreaterThanOrEqual(result.users.length);
        });
    });

    it('supports pagination', async () => {
      await provider
        .addInteraction()
        .given('there are many users in the system')
        .uponReceiving('a request to list users with limit')
        .withRequest('GET', '/users', (builder) => {
          builder.query({ limit: '5' });
        })
        .willRespondWith(200, (builder) => {
          builder.jsonBody({
            users: eachLike(
              {
                id: uuid(),
                name: like('User'),
              },
              5
            ),
            total: integer(100),
          });
        })
        .executeTest(async (mockServer) => {
          const client = new UserApiClient(mockServer.url);

          const result = await client.listUsers(5);

          expect(result.users.length).toBeLessThanOrEqual(5);
        });
    });
  });
});

/**
 * Publishing Pacts to a Broker
 *
 * After running tests, publish the generated pact files to a Pact Broker:
 *
 * ```bash
 * npx pact-broker publish ./pacts \
 *   --broker-base-url=https://your-pact-broker.com \
 *   --broker-token=$PACT_BROKER_TOKEN \
 *   --consumer-app-version=$(git rev-parse HEAD) \
 *   --tag=$(git rev-parse --abbrev-ref HEAD)
 * ```
 *
 * Or use can-i-deploy to check if it's safe to deploy:
 *
 * ```bash
 * npx pact-broker can-i-deploy \
 *   --pacticipant=MyConsumerApp \
 *   --version=$(git rev-parse HEAD) \
 *   --to-environment=production
 * ```
 */

export { UserApiClient };
