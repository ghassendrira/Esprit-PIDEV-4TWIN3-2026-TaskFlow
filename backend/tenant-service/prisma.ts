import "dotenv/config";                // charge ton .env
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",      // ton fichier schema
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL_TENANT"),     // ici tu passes l'URL de la DB
  },
});