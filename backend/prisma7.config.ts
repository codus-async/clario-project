import { config as loadEnv } from "dotenv";
import { defineConfig } from "@prisma/prisma7/config";

loadEnv({ path: "../.env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
