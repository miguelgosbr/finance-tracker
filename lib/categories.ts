import { getDb } from "./db";

export type CategoryKind = "income" | "expense" | "both";

export interface Category {
  id: number;
  name: string;
  kind: CategoryKind;
  created_at: string;
}

export function listCategories(): Category[] {
  return getDb()
    .prepare("SELECT * FROM categories ORDER BY name ASC")
    .all() as Category[];
}

export function createCategory(name: string, kind: CategoryKind): Category {
  const result = getDb()
    .prepare("INSERT INTO categories (name, kind) VALUES (?, ?)")
    .run(name.trim(), kind);

  return getDb()
    .prepare("SELECT * FROM categories WHERE id = ?")
    .get(result.lastInsertRowid) as Category;
}
