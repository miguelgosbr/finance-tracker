import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, getDb } from "@/lib/db";

export interface TestFixture {
  userId: number;
  accountId: number;
}

/**
 * Creates a user with one default account, seeded categories and default
 * settings — mirroring what lib/auth.ts's signUp() does — for tests that
 * exercise account-scoped or user-scoped data access directly.
 */
export async function createTestUserAndAccount(): Promise<TestFixture> {
  const db = await getDb();

  const userResult = await db.query<{ id: number }>(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
    [`test-${Math.random().toString(36).slice(2)}@example.com`, "hash"]
  );
  const userId = userResult.rows[0].id;

  const accountResult = await db.query<{ id: number }>(
    "INSERT INTO accounts (user_id, name) VALUES ($1, 'Conta teste') RETURNING id",
    [userId]
  );
  const accountId = accountResult.rows[0].id;

  for (const category of DEFAULT_CATEGORIES) {
    await db.query("INSERT INTO categories (user_id, name, kind) VALUES ($1, $2, $3)", [
      userId,
      category.name,
      category.kind,
    ]);
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.query("INSERT INTO settings (user_id, key, value) VALUES ($1, $2, $3)", [
      userId,
      key,
      value,
    ]);
  }

  return { userId, accountId };
}
