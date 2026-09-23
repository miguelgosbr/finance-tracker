import { describe, expect, it } from "vitest";
import { createCofrinho, recordMovement } from "@/lib/cofrinhos";
import { createTransaction, getCurrentBalance } from "@/lib/transactions";

const SALARY_CATEGORY = 9;
const FOOD_CATEGORY = 1;

function addIncome(amount: number) {
  createTransaction({
    type: "income",
    amount,
    description: "receita",
    category_id: SALARY_CATEGORY,
    occurred_on: "2026-09-01",
  });
}

function addExpense(amount: number) {
  createTransaction({
    type: "expense",
    amount,
    description: "gasto",
    category_id: FOOD_CATEGORY,
    occurred_on: "2026-09-02",
  });
}

describe("getCurrentBalance", () => {
  it("starts at zero with no transactions", () => {
    expect(getCurrentBalance()).toBe(0);
  });

  it("is income minus expenses", () => {
    addIncome(1000);
    addExpense(250);
    addExpense(150);
    expect(getCurrentBalance()).toBe(600);
  });

  it("subtracts money allocated to cofrinhos", () => {
    addIncome(1000);
    const cofrinho = createCofrinho("Reserva", 100, null);
    recordMovement(cofrinho.id, "deposit", 300);
    expect(getCurrentBalance()).toBe(700);
  });

  it("gives money back when withdrawing from a cofrinho", () => {
    addIncome(1000);
    const cofrinho = createCofrinho("Reserva", 100, null);
    recordMovement(cofrinho.id, "deposit", 300);
    recordMovement(cofrinho.id, "withdrawal", 100);
    expect(getCurrentBalance()).toBe(800);
  });

  it("can be negative when expenses exceed income", () => {
    addIncome(100);
    addExpense(250);
    expect(getCurrentBalance()).toBe(-150);
  });
});
