import { getDb } from "./db";
import { getSetting } from "./settings";

const BUSINESS_DAYS_PER_YEAR = 252;
const DEFAULT_CDI_ANNUAL = 10.5;

export type CofrinhoMovementType = "deposit" | "withdrawal" | "yield";

export interface Cofrinho {
  id: number;
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

export function listCofrinhos(): CofrinhoWithYield[] {
  const cofrinhos = getDb()
    .prepare("SELECT * FROM cofrinhos ORDER BY name ASC")
    .all() as Cofrinho[];

  return cofrinhos.map((cofrinho) => ({
    ...cofrinho,
    monthlyYield: getMonthlyYield(cofrinho.id),
  }));
}

export function createCofrinho(
  name: string,
  cdiPercentage: number,
  goalAmount: number | null
): Cofrinho {
  const result = getDb()
    .prepare(
      "INSERT INTO cofrinhos (name, cdi_percentage, goal_amount) VALUES (?, ?, ?)"
    )
    .run(name.trim(), cdiPercentage, goalAmount);

  return getDb()
    .prepare("SELECT * FROM cofrinhos WHERE id = ?")
    .get(result.lastInsertRowid) as Cofrinho;
}

export function listMovements(cofrinhoId: number): CofrinhoMovement[] {
  return getDb()
    .prepare(
      "SELECT * FROM cofrinho_movements WHERE cofrinho_id = ? ORDER BY occurred_on DESC, id DESC"
    )
    .all(cofrinhoId) as CofrinhoMovement[];
}

export function recordMovement(
  cofrinhoId: number,
  type: CofrinhoMovementType,
  amount: number
): Cofrinho {
  const db = getDb();

  accrueCofrinhoYield(cofrinhoId);

  const applyMovement = db.transaction(() => {
    const delta = type === "withdrawal" ? -amount : amount;

    db.prepare(
      "INSERT INTO cofrinho_movements (cofrinho_id, type, amount) VALUES (?, ?, ?)"
    ).run(cofrinhoId, type, amount);

    db.prepare("UPDATE cofrinhos SET balance = balance + ? WHERE id = ?").run(
      delta,
      cofrinhoId
    );
  });

  applyMovement();

  return db.prepare("SELECT * FROM cofrinhos WHERE id = ?").get(cofrinhoId) as Cofrinho;
}

function getAnnualCdiRate(): number {
  const configured = Number(getSetting("cdi_rate_annual"));
  if (Number.isFinite(configured) && configured > 0) return configured / 100;
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

export function accrueCofrinhoYield(cofrinhoId: number, referenceDate: Date = new Date()): void {
  const db = getDb();
  const cofrinho = db
    .prepare("SELECT * FROM cofrinhos WHERE id = ?")
    .get(cofrinhoId) as Cofrinho | undefined;

  if (!cofrinho) return;

  const today = toIsoDate(referenceDate);
  const businessDays = countBusinessDays(cofrinho.last_accrued_on, today);

  if (businessDays <= 0 || cofrinho.balance <= 0) {
    if (today > cofrinho.last_accrued_on) {
      db.prepare("UPDATE cofrinhos SET last_accrued_on = ? WHERE id = ?").run(today, cofrinhoId);
    }
    return;
  }

  const effectiveAnnualRate = getAnnualCdiRate() * (cofrinho.cdi_percentage / 100);
  const dailyFactor = Math.pow(1 + effectiveAnnualRate, 1 / BUSINESS_DAYS_PER_YEAR);
  const yieldAmount = cofrinho.balance * (Math.pow(dailyFactor, businessDays) - 1);
  const roundedYield = Math.round(yieldAmount * 100) / 100;

  const applyYield = db.transaction(() => {
    if (roundedYield > 0) {
      db.prepare(
        "INSERT INTO cofrinho_movements (cofrinho_id, type, amount, occurred_on) VALUES (?, 'yield', ?, ?)"
      ).run(cofrinhoId, roundedYield, today);
      db.prepare("UPDATE cofrinhos SET balance = balance + ? WHERE id = ?").run(
        roundedYield,
        cofrinhoId
      );
    }
    db.prepare("UPDATE cofrinhos SET last_accrued_on = ? WHERE id = ?").run(today, cofrinhoId);
  });

  applyYield();
}

export function accrueAllYields(referenceDate: Date = new Date()): void {
  const ids = getDb().prepare("SELECT id FROM cofrinhos").all() as { id: number }[];
  for (const { id } of ids) {
    accrueCofrinhoYield(id, referenceDate);
  }
}

export function getMonthlyYield(cofrinhoId: number, referenceDate: Date = new Date()): number {
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const today = toIsoDate(referenceDate);

  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM cofrinho_movements
       WHERE cofrinho_id = ? AND type = 'yield' AND occurred_on BETWEEN ? AND ?`
    )
    .get(cofrinhoId, monthStart, today) as { total: number };

  return row.total;
}
