import { getDb } from "./db";

export interface Transfer {
  id: number;
  user_id: number;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  description: string;
  occurred_on: string;
  created_at: string;
}

export interface TransferWithAccounts extends Transfer {
  from_account_name: string;
  to_account_name: string;
}

export interface NewTransfer {
  user_id: number;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  description: string;
  occurred_on: string;
}

export async function createTransfer(input: NewTransfer): Promise<Transfer> {
  const db = await getDb();
  const result = await db.query<Transfer>(
    `INSERT INTO transfers (user_id, from_account_id, to_account_id, amount, description, occurred_on)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.user_id,
      input.from_account_id,
      input.to_account_id,
      input.amount,
      input.description,
      input.occurred_on,
    ]
  );
  return result.rows[0];
}

/**
 * Lists a user's transfers touching any of `accountIds` (as either side) —
 * omit it for every transfer the user has made across all their accounts.
 */
export async function listTransfersForUser(
  userId: number,
  accountIds?: number[]
): Promise<TransferWithAccounts[]> {
  const db = await getDb();

  if (accountIds && accountIds.length > 0) {
    const placeholders = accountIds.map((_, index) => `$${index + 2}`).join(", ");
    const result = await db.query<TransferWithAccounts>(
      `SELECT transfers.*, fa.name AS from_account_name, ta.name AS to_account_name
       FROM transfers
       JOIN accounts fa ON fa.id = transfers.from_account_id
       JOIN accounts ta ON ta.id = transfers.to_account_id
       WHERE transfers.user_id = $1
         AND (transfers.from_account_id IN (${placeholders}) OR transfers.to_account_id IN (${placeholders}))
       ORDER BY transfers.occurred_on DESC, transfers.id DESC`,
      [userId, ...accountIds]
    );
    return result.rows;
  }

  const result = await db.query<TransferWithAccounts>(
    `SELECT transfers.*, fa.name AS from_account_name, ta.name AS to_account_name
     FROM transfers
     JOIN accounts fa ON fa.id = transfers.from_account_id
     JOIN accounts ta ON ta.id = transfers.to_account_id
     WHERE transfers.user_id = $1
     ORDER BY transfers.occurred_on DESC, transfers.id DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Net cash movement from transfers for a set of accounts: money leaving one
 * of `accountIds` subtracts, money arriving into one of `accountIds` adds.
 * A transfer between two accounts both inside the set nets to zero, so it
 * never inflates the consolidated balance.
 */
export async function getTransferNetForAccounts(accountIds: number[]): Promise<number> {
  if (accountIds.length === 0) return 0;

  const db = await getDb();
  const placeholders = accountIds.map((_, index) => `$${index + 1}`).join(", ");

  const outResult = await db.query<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM transfers WHERE from_account_id IN (${placeholders})`,
    accountIds
  );
  const inResult = await db.query<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM transfers WHERE to_account_id IN (${placeholders})`,
    accountIds
  );

  return Number(inResult.rows[0].total) - Number(outResult.rows[0].total);
}
