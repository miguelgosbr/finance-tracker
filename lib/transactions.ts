import { getDb } from "./db";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  description: string;
  category_id: number;
  occurred_on: string;
  created_at: string;
}

export interface NewTransaction {
  type: TransactionType;
  amount: number;
  description: string;
  category_id: number;
  occurred_on: string;
}

export function listTransactions(): Transaction[] {
  return getDb()
    .prepare("SELECT * FROM transactions ORDER BY occurred_on DESC, id DESC")
    .all() as Transaction[];
}

export function createTransaction(input: NewTransaction): Transaction {
  const result = getDb()
    .prepare(
      `INSERT INTO transactions (type, amount, description, category_id, occurred_on)
       VALUES (@type, @amount, @description, @category_id, @occurred_on)`
    )
    .run(input);

  return getDb()
    .prepare("SELECT * FROM transactions WHERE id = ?")
    .get(result.lastInsertRowid) as Transaction;
}

export function getCurrentBalance(): number {
  const db = getDb();

  const transactionsRow = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as net
       FROM transactions`
    )
    .get() as { net: number };

  const cofrinhosRow = db
    .prepare(`SELECT COALESCE(SUM(balance), 0) as total FROM cofrinhos`)
    .get() as { total: number };

  return transactionsRow.net - cofrinhosRow.total;
}
