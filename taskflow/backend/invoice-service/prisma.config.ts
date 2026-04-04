// prisma.config.ts  ← doit être à la RACINE du dossier invoice-service
import "dotenv/config";  // ← très important pour charger .env

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",       // chemin correct
  migrations: {
    path: "prisma/migrations",          // dossier des migrations
  },
  datasource: {
    url: env("DATABASE_URL_INVOICE"),   // ← Prisma cherche CETTE variable dans .env
  },
});