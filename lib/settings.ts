import { getDb } from "./db";

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const result = await db.query<{ value: string }>(
    "SELECT value FROM settings WHERE key = $1",
    [key]
  );
  return result.rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}
