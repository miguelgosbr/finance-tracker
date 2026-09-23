import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_DB_FILENAME = "finance.db";

const DEFAULT_CATEGORIES: { name: string; kind: "income" | "expense" | "both" }[] = [
  { name: "Alimentação", kind: "expense" },
  { name: "Transporte", kind: "expense" },
  { name: "Moradia", kind: "expense" },
  { name: "Lazer", kind: "expense" },
  { name: "Saúde", kind: "expense" },
  { name: "Educação", kind: "expense" },
  { name: "Compras", kind: "expense" },
  { name: "Outros", kind: "both" },
  { name: "Salário", kind: "income" },
  { name: "Freelance", kind: "income" },
  { name: "Rendimentos", kind: "income" },
];

const DEFAULT_SETTINGS: Record<string, string> = {
  monthly_budget: "",
  cdi_rate_annual: "10.5",
};

let db: Database.Database | null = null;

function resolveDbPath(): string {
  if (process.env.DATABASE_PATH === ":memory:") return ":memory:";

  const filename = process.env.DATABASE_PATH
    ? path.basename(process.env.DATABASE_PATH)
    : DEFAULT_DB_FILENAME;
  return path.join(process.cwd(), "data", filename);
}

function runMigrations(instance: Database.Database) {
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");

  instance.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL CHECK (kind IN ('income', 'expense', 'both')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      amount REAL NOT NULL CHECK (amount > 0),
      description TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      occurred_on TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_occurred_on ON transactions(occurred_on);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

    CREATE TABLE IF NOT EXISTS cofrinhos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      goal_amount REAL,
      cdi_percentage REAL NOT NULL DEFAULT 100,
      balance REAL NOT NULL DEFAULT 0,
      last_accrued_on TEXT NOT NULL DEFAULT (date('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cofrinho_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cofrinho_id INTEGER NOT NULL REFERENCES cofrinhos(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'yield')),
      amount REAL NOT NULL CHECK (amount > 0),
      occurred_on TEXT NOT NULL DEFAULT (date('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cofrinho_movements_cofrinho_id ON cofrinho_movements(cofrinho_id);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const categoryCount = instance
    .prepare("SELECT COUNT(*) as count FROM categories")
    .get() as { count: number };

  if (categoryCount.count === 0) {
    const insertCategory = instance.prepare(
      "INSERT INTO categories (name, kind) VALUES (@name, @kind)"
    );
    const insertMany = instance.transaction((categories: typeof DEFAULT_CATEGORIES) => {
      for (const category of categories) insertCategory.run(category);
    });
    insertMany(DEFAULT_CATEGORIES);
  }

  const insertSetting = instance.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (@key, @value)"
  );
  const insertSettings = instance.transaction((settings: Record<string, string>) => {
    for (const [key, value] of Object.entries(settings)) {
      insertSetting.run({ key, value });
    }
  });
  insertSettings(DEFAULT_SETTINGS);
}

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = resolveDbPath();
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  db = new Database(dbPath);
  runMigrations(db);

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
