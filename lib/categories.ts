import { getDb } from "./db";

export type CategoryKind = "income" | "expense" | "both";

export interface Category {
  id: number;
  user_id: number;
  name: string;
  kind: CategoryKind;
  created_at: string;
}

export async function listCategories(userId: number): Promise<Category[]> {
  const db = await getDb();
  const result = await db.query<Category>(
    "SELECT * FROM categories WHERE user_id = $1 ORDER BY name ASC",
    [userId]
  );
  return result.rows;
}

export async function getOwnedCategory(userId: number, categoryId: number): Promise<Category | null> {
  const db = await getDb();
  const result = await db.query<Category>(
    "SELECT * FROM categories WHERE id = $1 AND user_id = $2",
    [categoryId, userId]
  );
  return result.rows[0] ?? null;
}

export async function createCategory(
  userId: number,
  name: string,
  kind: CategoryKind
): Promise<Category> {
  const db = await getDb();
  const result = await db.query<Category>(
    "INSERT INTO categories (user_id, name, kind) VALUES ($1, $2, $3) RETURNING *",
    [userId, name.trim(), kind]
  );
  return result.rows[0];
}
