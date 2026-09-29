import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../config/env.js";
import * as schema from "./schema/index.js";

const isSsl = env.DATABASE_URL.includes("neon.tech") || env.DATABASE_URL.includes("sslmode=require") || env.DATABASE_URL.includes("ssl=true");

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: isSsl ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });

export type Db = typeof db;
