import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // @ts-ignore - `process` is provided by Node at runtime
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
