import { getDb } from "./db";
import { getSetting } from "./settings";

const BUSINESS_DAYS_PER_YEAR = 252;
const DEFAULT_CDI_ANNUAL = 10.5;

export type CofrinhoMovementType = "deposit" | "withdrawal" | "yield";

export interface Cofrinho {
  id: number;
  account_id: number;
  name: string;
  goal_amount: number | null;
  cdi_percentage: number;
  balance: number;
  last_accrued_on: string;
  created_at: string;
}

export interface CofrinhoMovement {
  id: number;
  cofrinho_id: number;
  type: CofrinhoMovementType;
  amount: number;
  occurred_on: string;
  created_at: string;
}

export interface CofrinhoWithYield extends Cofrinho {
  monthlyYield: number;
}

export interface CofrinhoWithAccount extends CofrinhoWithYield {
  account_name: string;
}

/**
 * Lists a user's cofrinhos across all of their accounts, joined with the
 * account name. Pass `accountIds` to narrow to a subset — omit it for every
 * account the user owns.
 */
export async function listCofrinhosForUser(
  userId: number,
  accountIds?: number[]
): Promise<CofrinhoWithAccount[]> {
  const db = await getDb();

  const rows =
    accountIds && accountIds.length > 0
      ? (
          await db.query<Cofrinho & { account_name: string }>(
            `SELECT cofrinhos.*, accounts.name AS account_name
             FROM cofrinhos
             JOIN accounts ON accounts.id = cofrinhos.account_id
             WHERE accounts.user_id = $1
               AND cofrinhos.account_id IN (${accountIds
                 .map((_, index) => `$${index + 2}`)
                 .join(", ")})
             ORDER BY accounts.name ASC, cofrinhos.name ASC`,
            [userId, ...accountIds]
          )
        ).rows
      : (
          await db.query<Cofrinho & { account_name: string }>(
            `SELECT cofrinhos.*, accounts.name AS account_name
             FROM cofrinhos
             JOIN accounts ON accounts.id = cofrinhos.account_id
             WHERE accounts.user_id = $1
             ORDER BY accounts.name ASC, cofrinhos.name ASC`,
            [userId]
          )
        ).rows;

  const cofrinhos: CofrinhoWithAccount[] = [];
  for (const cofrinho of rows) {
    cofrinhos.push({ ...cofrinho, monthlyYield: await getMonthlyYield(cofrinho.id) });
  }
  return cofrinhos;
}

export async function createCofrinho(
  accountId: number,
  name: string,
  cdiPercentage: number,
  goalAmount: number | null
): Promise<Cofrinho> {
  const db = await getDb();
  const result = await db.query<Cofrinho>(
    "INSERT INTO cofrinhos (account_id, name, cdi_percentage, goal_amount) VALUES ($1, $2, $3, $4) RETURNING *",
    [accountId, name.trim(), cdiPercentage, goalAmount]
  );
  return result.rows[0];
}

export async function getCofrinho(cofrinhoId: number): Promise<Cofrinho | null> {
  const db = await getDb();
  const result = await db.query<Cofrinho>("SELECT * FROM cofrinhos WHERE id = $1", [cofrinhoId]);
  return result.rows[0] ?? null;
}

export interface CofrinhoEdit {
  name: string;
  cdiPercentage: number;
  goalAmount: number | null;
  accountId: number;
}

/**
 * Updates a cofrinho's fields, including reassigning it to a different
 * account owned by the same user (the balance moves with it — this is a
 * reclassification, not a transfer, and never touches any account's cash).
 */
export async function updateCofrinho(
  cofrinhoId: number,
  edit: CofrinhoEdit
): Promise<Cofrinho> {
  const db = await getDb();
  const result = await db.query<Cofrinho>(
    `UPDATE cofrinhos
     SET name = $2, cdi_percentage = $3, goal_amount = $4, account_id = $5
     WHERE id = $1
     RETURNING *`,
    [cofrinhoId, edit.name.trim(), edit.cdiPercentage, edit.goalAmount, edit.accountId]
  );
  return result.rows[0];
}

export async function deleteCofrinho(cofrinhoId: number): Promise<void> {
  const db = await getDb();
  await db.query("DELETE FROM cofrinhos WHERE id = $1", [cofrinhoId]);
}

export async function listMovements(cofrinhoId: number): Promise<CofrinhoMovement[]> {
  const db = await getDb();
  const result = await db.query<CofrinhoMovement>(
    "SELECT * FROM cofrinho_movements WHERE cofrinho_id = $1 ORDER BY occurred_on DESC, id DESC",
    [cofrinhoId]
  );
  return result.rows;
}

export async function recordMovement(
  cofrinhoId: number,
  type: CofrinhoMovementType,
  amount: number
): Promise<Cofrinho> {
  await accrueCofrinhoYield(cofrinhoId);

  const db = await getDb();
  const delta = type === "withdrawal" ? -amount : amount;

  const result = await db.query<Cofrinho>(
    `WITH inserted AS (
       INSERT INTO cofrinho_movements (cofrinho_id, type, amount) VALUES ($1, $2, $3)
     )
     UPDATE cofrinhos SET balance = balance + $4 WHERE id = $1 RETURNING *`,
    [cofrinhoId, type, amount, delta]
  );
  return result.rows[0];
}

function getAnnualCdiRate(rate: number | null): number {
  if (rate !== null && Number.isFinite(rate) && rate > 0) return rate / 100;
  return DEFAULT_CDI_ANNUAL / 100;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function countBusinessDays(startExclusive: string, endInclusive: string): number {
  const start = new Date(`${startExclusive}T00:00:00`);
  const end = new Date(`${endInclusive}T00:00:00`);

  let count = 0;
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1);

  while (cursor <= end) {
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

async function getUserIdForCofrinho(cofrinhoId: number): Promise<number | null> {
  const db = await getDb();
  const result = await db.query<{ user_id: number }>(
    `SELECT accounts.user_id
     FROM cofrinhos
     JOIN accounts ON accounts.id = cofrinhos.account_id
     WHERE cofrinhos.id = $1`,
    [cofrinhoId]
  );
  return result.rows[0]?.user_id ?? null;
}

export async function accrueCofrinhoYield(
  cofrinhoId: number,
  referenceDate: Date = new Date()
): Promise<void> {
  const db = await getDb();
  const cofrinhoResult = await db.query<Cofrinho>("SELECT * FROM cofrinhos WHERE id = $1", [
    cofrinhoId,
  ]);
  const cofrinho = cofrinhoResult.rows[0];
  if (!cofrinho) return;

  const today = toIsoDate(referenceDate);
  const businessDays = countBusinessDays(cofrinho.last_accrued_on, today);

  if (businessDays <= 0 || cofrinho.balance <= 0) {
    if (today > cofrinho.last_accrued_on) {
      await db.query("UPDATE cofrinhos SET last_accrued_on = $1 WHERE id = $2", [
        today,
        cofrinhoId,
      ]);
    }
    return;
  }

  const userId = await getUserIdForCofrinho(cofrinhoId);
  const cdiRateSetting = userId === null ? null : await getSetting(userId, "cdi_rate_annual");
  const effectiveAnnualRate =
    getAnnualCdiRate(cdiRateSetting === null ? null : Number(cdiRateSetting)) *
    (cofrinho.cdi_percentage / 100);
  const dailyFactor = Math.pow(1 + effectiveAnnualRate, 1 / BUSINESS_DAYS_PER_YEAR);
  const yieldAmount = cofrinho.balance * (Math.pow(dailyFactor, businessDays) - 1);
  const roundedYield = Math.round(yieldAmount * 100) / 100;

  if (roundedYield > 0) {
    await db.query(
      `WITH inserted AS (
         INSERT INTO cofrinho_movements (cofrinho_id, type, amount, occurred_on)
         VALUES ($1, 'yield', $2, $3)
       )
       UPDATE cofrinhos SET balance = balance + $2, last_accrued_on = $3 WHERE id = $1`,
      [cofrinhoId, roundedYield, today]
    );
  } else {
    await db.query("UPDATE cofrinhos SET last_accrued_on = $1 WHERE id = $2", [today, cofrinhoId]);
  }
}

export async function accrueYieldsForAccount(
  accountId: number,
  referenceDate: Date = new Date()
): Promise<void> {
  const db = await getDb();
  const result = await db.query<{ id: number }>(
    "SELECT id FROM cofrinhos WHERE account_id = $1",
    [accountId]
  );
  for (const { id } of result.rows) {
    await accrueCofrinhoYield(id, referenceDate);
  }
}

export async function accrueYieldsForUser(
  userId: number,
  referenceDate: Date = new Date()
): Promise<void> {
  const db = await getDb();
  const result = await db.query<{ id: number }>(
    `SELECT cofrinhos.id
     FROM cofrinhos
     JOIN accounts ON accounts.id = cofrinhos.account_id
     WHERE accounts.user_id = $1`,
    [userId]
  );
  for (const { id } of result.rows) {
    await accrueCofrinhoYield(id, referenceDate);
  }
}

export async function getMonthlyYield(
  cofrinhoId: number,
  referenceDate: Date = new Date()
): Promise<number> {
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const today = toIsoDate(referenceDate);

  const db = await getDb();
  const result = await db.query<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM cofrinho_movements
     WHERE cofrinho_id = $1 AND type = 'yield' AND occurred_on BETWEEN $2 AND $3`,
    [cofrinhoId, monthStart, today]
  );

  return Number(result.rows[0].total);
}
