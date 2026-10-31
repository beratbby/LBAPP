// Führt ausstehende Datenbank-Migrationen aus. Läuft automatisch vor `npm start`.
import pg from "pg";
import { migrations } from "../db/migrations.mjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL ist nicht gesetzt.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  // Verhindert, dass zwei Instanzen gleichzeitig migrieren.
  await client.query("SELECT pg_advisory_lock(424242)");
  try {
    const { rows } = await client.query("SELECT id FROM schema_migrations");
    const applied = new Set(rows.map((r) => r.id));
    for (const m of migrations) {
      if (applied.has(m.id)) continue;
      console.log(`→ Migration ${m.id} (${m.name})`);
      await client.query("BEGIN");
      try {
        await client.query(m.sql);
        await client.query("INSERT INTO schema_migrations (id, name) VALUES ($1, $2)", [m.id, m.name]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
    console.log("✅ Datenbank ist aktuell.");
  } finally {
    await client.query("SELECT pg_advisory_unlock(424242)");
  }
}

main()
  .catch((err) => {
    console.error("❌ Migration fehlgeschlagen:", err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
