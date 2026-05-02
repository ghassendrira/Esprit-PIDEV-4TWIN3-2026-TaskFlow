"use strict";
require("dotenv/config");
const { defineConfig, env } = require("prisma/config");

module.exports = defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
        seed: "ts-node --transpile-only prisma/seed.ts",
    },
    datasource: {
        url: env("DATABASE_URL_AUTH") || env("DATABASE_URL"),
    },
});
//# sourceMappingURL=prisma.config.js.map