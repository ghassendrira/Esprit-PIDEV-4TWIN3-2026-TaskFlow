import "dotenv/config";                // charge ton .env
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",      // ton fichier schema
  migrations: {
    path: "prisma/migrations",
    seed: 'ts-node ./prisma/seed.ts',
  },
  datasource: {
    url: env("DATABASE_URL_EXPENSE") || env("DATABASE_URL"),     // ici tu passes l'URL de la DB
  },
});