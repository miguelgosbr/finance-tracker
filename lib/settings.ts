import { getDb } from "./db";

export async function getSetting(userId: number, key: string): Promise<string | null> {
  const db = await getDb();
  const result = await db.query<{ value: string }>(
    "SELECT value FROM settings WHERE user_id = $1 AND key = $2",
    [userId, key]
  );
  return result.rows[0]?.value ?? null;
}

export async function setSetting(userId: number, key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO settings (user_id, key, value) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value`,
    [userId, key, value]
  );
}
