import { getDb } from "./db";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: number;
  account_id: number;
  type: TransactionType;
  amount: number;
  description: string;
  category_id: number;
  occurred_on: string;
  created_at: string;
}

export interface TransactionWithAccount extends Transaction {
  account_name: string;
}

export interface NewTransaction {
  account_id: number;
  type: TransactionType;
  amount: number;
  description: string;
  category_id: number;
  occurred_on: string;
}

/**
 * Lists a user's transactions across all of their accounts, joined with the
 * account name. Pass `accountIds` to narrow to a subset (e.g. a single
 * selected account) — omit it for every account the user owns.
 */
export async function listTransactionsForUser(
  userId: number,
  accountIds?: number[]
): Promise<TransactionWithAccount[]> {
  const db = await getDb();

  if (accountIds && accountIds.length > 0) {
    const placeholders = accountIds.map((_, index) => `$${index + 2}`).join(", ");
    const result = await db.query<TransactionWithAccount>(
      `SELECT transactions.*, accounts.name AS account_name
       FROM transactions
       JOIN accounts ON accounts.id = transactions.account_id
       WHERE accounts.user_id = $1 AND transactions.account_id IN (${placeholders})
       ORDER BY transactions.occurred_on DESC, transactions.id DESC`,
      [userId, ...accountIds]
    );
    return result.rows;
  }

  const result = await db.query<TransactionWithAccount>(
    `SELECT transactions.*, accounts.name AS account_name
     FROM transactions
     JOIN accounts ON accounts.id = transactions.account_id
     WHERE accounts.user_id = $1
     ORDER BY transactions.occurred_on DESC, transactions.id DESC`,
    [userId]
  );
  return result.rows;
}

export async function createTransaction(input: NewTransaction): Promise<Transaction> {
  const db = await getDb();
  const result = await db.query<Transaction>(
    `INSERT INTO transactions (account_id, type, amount, description, category_id, occurred_on)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.account_id,
      input.type,
      input.amount,
      input.description,
      input.category_id,
      input.occurred_on,
    ]
  );
  return result.rows[0];
}

export async function getBalanceForAccounts(accountIds: number[]): Promise<number> {
  if (accountIds.length === 0) return 0;

  const db = await getDb();
  const placeholders = accountIds.map((_, index) => `$${index + 1}`).join(", ");

  const transactionsResult = await db.query<{ net: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS net
     FROM transactions
     WHERE account_id IN (${placeholders})`,
    accountIds
  );

  const cofrinhosResult = await db.query<{ total: number }>(
    `SELECT COALESCE(SUM(balance), 0) AS total FROM cofrinhos WHERE account_id IN (${placeholders})`,
    accountIds
  );

  return Number(transactionsResult.rows[0].net) - Number(cofrinhosResult.rows[0].total);
}

export async function getCurrentBalance(accountId: number): Promise<number> {
  return getBalanceForAccounts([accountId]);
}

export async function getCurrentBalanceForUser(userId: number): Promise<number> {
  const db = await getDb();
  const accountIdsResult = await db.query<{ id: number }>(
    "SELECT id FROM accounts WHERE user_id = $1",
    [userId]
  );
  return getBalanceForAccounts(accountIdsResult.rows.map((row) => row.id));
}
