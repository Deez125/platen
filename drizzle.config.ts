import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Don't try to manage Supabase-internal schemas.
  schemaFilter: ["public"],
  // Strict so we don't accidentally drop columns silently.
  strict: true,
  verbose: true,
});
