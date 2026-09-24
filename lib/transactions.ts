import { getDb } from "./db";
import { getTransferNetForAccounts } from "./transfers";

export type TransactionType = "income" | "expense";
export type PaymentMethod = "account" | "credit_line";

export interface Transaction {
  id: number;
  account_id: number;
  type: TransactionType;
  amount: number;
  description: string;
  category_id: number;
  occurred_on: string;
  payment_method: PaymentMethod;
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
  paymentMethod?: PaymentMethod;
}

export interface TransactionEdit {
  type: TransactionType;
  amount: number;
  description: string;
  category_id: number;
  occurred_on: string;
  paymentMethod: PaymentMethod;
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
    `INSERT INTO transactions (account_id, type, amount, description, category_id, occurred_on, payment_method)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.account_id,
      input.type,
      input.amount,
      input.description,
      input.category_id,
      input.occurred_on,
      input.paymentMethod ?? "account",
    ]
  );
  return result.rows[0];
}

/** Returns the transaction only if it belongs to an account owned by the user. */
export async function getOwnedTransaction(
  userId: number,
  transactionId: number
): Promise<Transaction | null> {
  const db = await getDb();
  const result = await db.query<Transaction>(
    `SELECT transactions.*
     FROM transactions
     JOIN accounts ON accounts.id = transactions.account_id
     WHERE transactions.id = $1 AND accounts.user_id = $2`,
    [transactionId, userId]
  );
  return result.rows[0] ?? null;
}

export async function updateTransaction(
  userId: number,
  transactionId: number,
  edit: TransactionEdit
): Promise<Transaction | null> {
  const owned = await getOwnedTransaction(userId, transactionId);
  if (!owned) return null;

  const db = await getDb();
  const result = await db.query<Transaction>(
    `UPDATE transactions
     SET type = $2, amount = $3, description = $4, category_id = $5, occurred_on = $6, payment_method = $7
     WHERE id = $1
     RETURNING *`,
    [
      transactionId,
      edit.type,
      edit.amount,
      edit.description,
      edit.category_id,
      edit.occurred_on,
      edit.paymentMethod,
    ]
  );
  return result.rows[0];
}

export async function deleteTransaction(userId: number, transactionId: number): Promise<boolean> {
  const owned = await getOwnedTransaction(userId, transactionId);
  if (!owned) return false;

  const db = await getDb();
  await db.query("DELETE FROM transactions WHERE id = $1", [transactionId]);
  return true;
}

export async function getBalanceForAccounts(accountIds: number[]): Promise<number> {
  if (accountIds.length === 0) return 0;

  const db = await getDb();
  const placeholders = accountIds.map((_, index) => `$${index + 1}`).join(", ");

  // Expenses paid via a credit line don't leave the account's cash on hand
  // immediately — they accrue on the invoice instead, so they're excluded
  // from the cash balance (see getCreditLineUsageBetween for that tally).
  const transactionsResult = await db.query<{ net: number }>(
    `SELECT
       COALESCE(SUM(
         CASE
           WHEN type = 'income' THEN amount
           WHEN type = 'expense' AND payment_method = 'account' THEN -amount
           ELSE 0
         END
       ), 0) AS net
     FROM transactions
     WHERE account_id IN (${placeholders})`,
    accountIds
  );

  const cofrinhosResult = await db.query<{ total: number }>(
    `SELECT COALESCE(SUM(balance), 0) AS total FROM cofrinhos WHERE account_id IN (${placeholders})`,
    accountIds
  );

  const transferNet = await getTransferNetForAccounts(accountIds);

  return (
    Number(transactionsResult.rows[0].net) -
    Number(cofrinhosResult.rows[0].total) +
    transferNet
  );
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

/** Total spent via the credit line within an inclusive date range (an invoice cycle). */
export async function getCreditLineUsageBetween(
  accountId: number,
  startInclusive: string,
  endInclusive: string
): Promise<number> {
  const db = await getDb();
  const result = await db.query<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE account_id = $1 AND type = 'expense' AND payment_method = 'credit_line'
       AND occurred_on BETWEEN $2 AND $3`,
    [accountId, startInclusive, endInclusive]
  );
  return Number(result.rows[0].total);
}
