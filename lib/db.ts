import type { Pool as PgPool } from "pg";

export interface QueryResult<T> {
  rows: T[];
}

export interface Queryable {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}

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

let dbPromise: Promise<Queryable> | null = null;

function getConnectionString(): string | undefined {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
}

function shouldUsePglite(): boolean {
  if (process.env.NODE_ENV === "test") return true;
  if (getConnectionString()) return false;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is not set. A PostgreSQL connection string is required in production."
    );
  }
  // Local development without a database: use an in-memory PGlite instance.
  return true;
}

async function createClient(): Promise<Queryable> {
  if (shouldUsePglite()) {
    const { PGlite } = await import("@electric-sql/pglite");
    const pglite = new PGlite();
    return {
      query: async (text, params) =>
        (await pglite.query(text, params as unknown[])) as QueryResult<never>,
    };
  }

  const { Pool } = await import("pg");
  const connectionString = getConnectionString();
  const pool: PgPool = new Pool({
    connectionString,
    ssl:
      connectionString && connectionString.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
  });
  return {
    query: async (text, params) =>
      (await pool.query(text, params as unknown[])) as unknown as QueryResult<never>,
  };
}

async function runMigrations(db: Queryable) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL CHECK (kind IN ('income', 'expense', 'both')),
      created_at TEXT NOT NULL DEFAULT (now())::text
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      amount DOUBLE PRECISION NOT NULL CHECK (amount > 0),
      description TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      occurred_on TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (now())::text
    );
  `);

  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_transactions_occurred_on ON transactions(occurred_on);`
  );
  await db.query(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS cofrinhos (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      goal_amount DOUBLE PRECISION,
      cdi_percentage DOUBLE PRECISION NOT NULL DEFAULT 100,
      balance DOUBLE PRECISION NOT NULL DEFAULT 0,
      last_accrued_on TEXT NOT NULL DEFAULT (CURRENT_DATE)::text,
      created_at TEXT NOT NULL DEFAULT (now())::text
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS cofrinho_movements (
      id SERIAL PRIMARY KEY,
      cofrinho_id INTEGER NOT NULL REFERENCES cofrinhos(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'yield')),
      amount DOUBLE PRECISION NOT NULL CHECK (amount > 0),
      occurred_on TEXT NOT NULL DEFAULT (CURRENT_DATE)::text,
      created_at TEXT NOT NULL DEFAULT (now())::text
    );
  `);

  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_cofrinho_movements_cofrinho_id ON cofrinho_movements(cofrinho_id);`
  );

  await db.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const categoryCount = await db.query<{ count: string }>(
    "SELECT COUNT(*)::int AS count FROM categories"
  );

  if (Number(categoryCount.rows[0].count) === 0) {
    for (const category of DEFAULT_CATEGORIES) {
      await db.query("INSERT INTO categories (name, kind) VALUES ($1, $2)", [
        category.name,
        category.kind,
      ]);
    }
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.query(
      "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING",
      [key, value]
    );
  }
}

export async function getDb(): Promise<Queryable> {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const db = await createClient();
    await runMigrations(db);
    return db;
  })();

  return dbPromise;
}

export function closeDb(): void {
  dbPromise = null;
}
