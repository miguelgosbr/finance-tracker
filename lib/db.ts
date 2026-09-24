import type { Pool as PgPool } from "pg";

export interface QueryResult<T> {
  rows: T[];
}

export interface Queryable {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}

export const DEFAULT_CATEGORIES: { name: string; kind: "income" | "expense" | "both" }[] = [
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

export const DEFAULT_SETTINGS: Record<string, string> = {
  monthly_budget: "",
  cdi_rate_annual: "10.5",
};

export const DEFAULT_ACCOUNT_NAME = "Minha conta";

// Turbopack compiles lib/db.ts into separate module instances per bundle
// layer (route handlers vs. SSR), each of which would otherwise get its own
// `dbPromise` — harmless with real Postgres (the data lives in the external
// database either way) but fatal for the in-memory PGlite dev fallback,
// where each copy would be its own empty database. Storing the singleton on
// `globalThis` — the standard fix for this class of Next.js dev issue —
// keeps every layer pointed at the same instance.
const globalForDb = globalThis as typeof globalThis & {
  __financeDbPromise?: Promise<Queryable>;
};

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
  // The multi-account/auth schema is a breaking change from the earlier
  // single-tenant one (categories/transactions/cofrinhos gained user_id /
  // account_id columns, settings' primary key changed). Detect a pre-auth
  // database by the absence of categories.user_id and drop the old tables so
  // the CREATE TABLE statements below can recreate them with the new shape,
  // instead of silently no-op'ing against incompatible tables.
  await db.query(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'categories'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'user_id'
      ) THEN
        DROP TABLE IF EXISTS cofrinho_movements, cofrinhos, transactions, categories, settings CASCADE;
      END IF;
    END $$;
  `);

  // Accounts gained bank/credit-line fields (replacing the old
  // checking/credit "kind" split — a credit line is now a property of an
  // account) and later a customizable theme color, a credit line due day, a
  // closing day, and transactions gained a payment_method. Detect the old
  // shape by the absence of accounts.closing_day (the newest column) and
  // drop the account-scoped tables so they recreate with the current
  // columns.
  await db.query(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'accounts' AND column_name = 'closing_day'
      ) THEN
        DROP TABLE IF EXISTS cofrinho_movements, cofrinhos, transactions, accounts CASCADE;
      END IF;
    END $$;
  `);

  // transactions gained a status (paid/pending) for planning cash flow ahead
  // of the actual debit/credit. Detect the old shape and drop just that
  // table so it recreates with the column — nothing references transactions,
  // so no cascade needed.
  await db.query(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'transactions' AND column_name = 'status'
      ) THEN
        DROP TABLE IF EXISTS transactions CASCADE;
      END IF;
    END $$;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (now())::text
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (now())::text
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      bank TEXT NOT NULL DEFAULT 'custom'
        CHECK (bank IN ('nubank', 'banco_do_brasil', 'mercado_pago', 'caixa', 'custom')),
      bank_color TEXT NOT NULL DEFAULT '#71717a',
      has_credit_line BOOLEAN NOT NULL DEFAULT false,
      credit_limit DOUBLE PRECISION,
      credit_line_due_day INTEGER CHECK (credit_line_due_day BETWEEN 1 AND 31),
      closing_day INTEGER CHECK (closing_day BETWEEN 1 AND 31),
      created_at TEXT NOT NULL DEFAULT (now())::text
    );
  `);

  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);`
  );

  await db.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('income', 'expense', 'both')),
      created_at TEXT NOT NULL DEFAULT (now())::text,
      UNIQUE (user_id, name)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      amount DOUBLE PRECISION NOT NULL CHECK (amount > 0),
      description TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      occurred_on TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'account' CHECK (payment_method IN ('account', 'credit_line')),
      status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending')),
      created_at TEXT NOT NULL DEFAULT (now())::text
    );
  `);

  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);`
  );
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_transactions_occurred_on ON transactions(occurred_on);`
  );
  await db.query(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS cofrinhos (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      goal_amount DOUBLE PRECISION,
      cdi_percentage DOUBLE PRECISION NOT NULL DEFAULT 100,
      balance DOUBLE PRECISION NOT NULL DEFAULT 0,
      last_accrued_on TEXT NOT NULL DEFAULT (CURRENT_DATE)::text,
      created_at TEXT NOT NULL DEFAULT (now())::text
    );
  `);

  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_cofrinhos_account_id ON cofrinhos(account_id);`
  );

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
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (user_id, key)
    );
  `);

  // Transfers move cash between two of the user's own accounts without ever
  // touching `transactions`, so they never show up as income/expense in the
  // reports or burn-rate engine.
  await db.query(`
    CREATE TABLE IF NOT EXISTS transfers (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      to_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      amount DOUBLE PRECISION NOT NULL CHECK (amount > 0),
      description TEXT NOT NULL DEFAULT '',
      occurred_on TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (now())::text,
      CHECK (from_account_id <> to_account_id)
    );
  `);

  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_transfers_from_account ON transfers(from_account_id);`
  );
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_transfers_to_account ON transfers(to_account_id);`
  );
}

export async function getDb(): Promise<Queryable> {
  if (globalForDb.__financeDbPromise) return globalForDb.__financeDbPromise;

  globalForDb.__financeDbPromise = (async () => {
    const db = await createClient();
    await runMigrations(db);
    return db;
  })();

  return globalForDb.__financeDbPromise;
}

export function closeDb(): void {
  globalForDb.__financeDbPromise = undefined;
}
