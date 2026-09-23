import { getDb } from "./db";

export type AccountKind = "checking" | "credit";

export interface Account {
  id: number;
  user_id: number;
  name: string;
  kind: AccountKind;
  created_at: string;
}

export async function listAccounts(userId: number): Promise<Account[]> {
  const db = await getDb();
  const result = await db.query<Account>(
    "SELECT * FROM accounts WHERE user_id = $1 ORDER BY id ASC",
    [userId]
  );
  return result.rows;
}

export async function createAccount(
  userId: number,
  name: string,
  kind: AccountKind
): Promise<Account> {
  const db = await getDb();
  const result = await db.query<Account>(
    "INSERT INTO accounts (user_id, name, kind) VALUES ($1, $2, $3) RETURNING *",
    [userId, name.trim(), kind]
  );
  return result.rows[0];
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
