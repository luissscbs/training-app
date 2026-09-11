import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "";

if (!url) {
  throw new Error(
    "Falta DATABASE_URL. Copia .env.example a .env.local y completa los valores.",
  );
}

const sql = neon(url);

export const db = drizzle(sql, { schema });
export type Db = typeof db;
