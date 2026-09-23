import { getDb } from "./db";

export type Bank = "nubank" | "banco_do_brasil" | "mercado_pago" | "caixa" | "other";

export const VALID_BANKS: Bank[] = [
  "nubank",
  "banco_do_brasil",
  "mercado_pago",
  "caixa",
  "other",
];

export interface Account {
  id: number;
  user_id: number;
  name: string;
  bank: Bank;
  has_credit_line: boolean;
  credit_limit: number | null;
  created_at: string;
}

export interface NewAccountInput {
  name: string;
  bank: Bank;
  hasCreditLine: boolean;
  creditLimit: number | null;
}

export async function listAccounts(userId: number): Promise<Account[]> {
  const db = await getDb();
  const result = await db.query<Account>(
    "SELECT * FROM accounts WHERE user_id = $1 ORDER BY id ASC",
    [userId]
  );
  return result.rows;
}

export async function createAccount(userId: number, input: NewAccountInput): Promise<Account> {
  const db = await getDb();
  const result = await db.query<Account>(
    `INSERT INTO accounts (user_id, name, bank, has_credit_line, credit_limit)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, input.name.trim(), input.bank, input.hasCreditLine, input.creditLimit]
  );
  return result.rows[0];
}

export async function updateAccount(
  userId: number,
  accountId: number,
  input: NewAccountInput
): Promise<Account | null> {
  const db = await getDb();
  const result = await db.query<Account>(
    `UPDATE accounts
     SET name = $3, bank = $4, has_credit_line = $5, credit_limit = $6
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [accountId, userId, input.name.trim(), input.bank, input.hasCreditLine, input.creditLimit]
  );
  return result.rows[0] ?? null;
}

/** Returns the account only if it belongs to the given user — use for authorization checks. */
export async function getOwnedAccount(userId: number, accountId: number): Promise<Account | null> {
  const db = await getDb();
  const result = await db.query<Account>(
    "SELECT * FROM accounts WHERE id = $1 AND user_id = $2",
    [accountId, userId]
  );
  return result.rows[0] ?? null;
}

/** Returns true if an account belonging to the user was deleted. */
export async function deleteAccount(userId: number, accountId: number): Promise<boolean> {
  const owned = await getOwnedAccount(userId, accountId);
  if (!owned) return false;

  const db = await getDb();
  await db.query("DELETE FROM accounts WHERE id = $1 AND user_id = $2", [accountId, userId]);
  return true;
}

/** All account ids owned by the user — the "all accounts" consolidated scope. */
export async function listOwnedAccountIds(userId: number): Promise<number[]> {
  const accounts = await listAccounts(userId);
  return accounts.map((account) => account.id);
}

/**
 * Resolves the `?account=` query param into an owned account id list for API
 * routes: a specific id (validated to belong to the user), or every account
 * the user owns when the param is missing or "all". Returns null when the
 * param names an account the user doesn't own or isn't a valid id.
 */
export async function resolveScopeAccountIds(
  userId: number,
  accountParam: string | null
): Promise<number[] | null> {
  if (!accountParam || accountParam === "all") {
    return listOwnedAccountIds(userId);
  }

  const accountId = Number(accountParam);
  if (!Number.isInteger(accountId)) return null;

  const owned = await getOwnedAccount(userId, accountId);
  return owned ? [accountId] : null;
}
