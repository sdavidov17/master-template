// Drizzle Kit Configuration
// Copy to: drizzle.config.ts
// Docs: https://orm.drizzle.team/kit-docs/config-reference

import type { Config } from "drizzle-kit";

export default {
  // Schema file(s) location
  schema: "./src/db/schema.ts",

  // Output directory for migrations
  out: "./drizzle/migrations",

  // Database driver
  driver: "pg", // or "mysql2", "better-sqlite", "turso", "libsql"

  // Database connection
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },

  // Verbose logging
  verbose: true,

  // Strict mode - fail on warnings
  strict: true,

  // Table prefix (optional)
  // tablesFilter: ["app_*"],
} satisfies Config;
