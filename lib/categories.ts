import { getDb } from "./db";

export type CategoryKind = "income" | "expense" | "both";

export interface Category {
  id: number;
  name: string;
  kind: CategoryKind;
  created_at: string;
}

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const result = await db.query<Category>("SELECT * FROM categories ORDER BY name ASC");
  return result.rows;
}

export async function createCategory(name: string, kind: CategoryKind): Promise<Category> {
  const db = await getDb();
  const result = await db.query<Category>(
    "INSERT INTO categories (name, kind) VALUES ($1, $2) RETURNING *",
    [name.trim(), kind]
  );
  return result.rows[0];
}
