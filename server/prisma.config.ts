import "dotenv/config";
import { defineConfig } from "prisma/config";


export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Empty while building (prisma generate needs no database);
    // migrations and the app need DATABASE_URL to be set
    url: process.env.DATABASE_URL ?? "",
  },
});