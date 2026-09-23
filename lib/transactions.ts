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

export async function listTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  const result = await db.query<Transaction>(
    "SELECT * FROM transactions ORDER BY occurred_on DESC, id DESC"
  );
  return result.rows;
}

export async function createTransaction(input: NewTransaction): Promise<Transaction> {
  const db = await getDb();
  const result = await db.query<Transaction>(
    `INSERT INTO transactions (type, amount, description, category_id, occurred_on)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.type, input.amount, input.description, input.category_id, input.occurred_on]
  );
  return result.rows[0];
}

export async function getCurrentBalance(): Promise<number> {
  const db = await getDb();

  const transactionsResult = await db.query<{ net: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS net
     FROM transactions`
  );

  const cofrinhosResult = await db.query<{ total: number }>(
    `SELECT COALESCE(SUM(balance), 0) AS total FROM cofrinhos`
  );

  return Number(transactionsResult.rows[0].net) - Number(cofrinhosResult.rows[0].total);
}
