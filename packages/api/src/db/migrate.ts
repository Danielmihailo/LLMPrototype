import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function migrate(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  const dir = join(__dirname, "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const { rows } = await pool.query(
      "SELECT 1 FROM _migrations WHERE name = $1",
      [file],
    );
    if (rows.length > 0) continue;

    const sql = readFileSync(join(dir, file), "utf-8");
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await pool.query("COMMIT");
      console.log(`Applied migration: ${file}`);
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  }
}

const isMigrateCli =
  process.argv[1]?.includes("migrate.ts") ||
  process.argv[1]?.includes("migrate.js");

if (isMigrateCli) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
