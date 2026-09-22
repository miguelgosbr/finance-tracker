import { getDb } from "./db";

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

export function listCofrinhos(): Cofrinho[] {
  return getDb()
    .prepare("SELECT * FROM cofrinhos ORDER BY name ASC")
    .all() as Cofrinho[];
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
