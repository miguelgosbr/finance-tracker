import { beforeEach, describe, expect, it } from "vitest";
import { createCofrinho, recordMovement } from "@/lib/cofrinhos";
import { createTransaction, getCurrentBalance } from "@/lib/transactions";
import { createTestUserAndAccount, type TestFixture } from "./helpers";

const SALARY_CATEGORY = 9;
const FOOD_CATEGORY = 1;

let fixture: TestFixture;

beforeEach(async () => {
  fixture = await createTestUserAndAccount();
});

function addIncome(amount: number) {
  return createTransaction({
    account_id: fixture.accountId,
    type: "income",
    amount,
    description: "receita",
    category_id: SALARY_CATEGORY,
    occurred_on: "2026-09-01",
  });
}

function addExpense(amount: number) {
  return createTransaction({
    account_id: fixture.accountId,
    type: "expense",
    amount,
    description: "gasto",
    category_id: FOOD_CATEGORY,
    occurred_on: "2026-09-02",
  });
}

describe("getCurrentBalance", () => {
  it("starts at zero with no transactions", async () => {
    expect(await getCurrentBalance(fixture.accountId)).toBe(0);
  });

  it("is income minus expenses", async () => {
    await addIncome(1000);
    await addExpense(250);
    await addExpense(150);
    expect(await getCurrentBalance(fixture.accountId)).toBe(600);
  });

  it("subtracts money allocated to cofrinhos", async () => {
    await addIncome(1000);
    const cofrinho = await createCofrinho(fixture.accountId, "Reserva", 100, null);
    await recordMovement(cofrinho.id, "deposit", 300);
    expect(await getCurrentBalance(fixture.accountId)).toBe(700);
  });

  it("gives money back when withdrawing from a cofrinho", async () => {
    await addIncome(1000);
    const cofrinho = await createCofrinho(fixture.accountId, "Reserva", 100, null);
    await recordMovement(cofrinho.id, "deposit", 300);
    await recordMovement(cofrinho.id, "withdrawal", 100);
    expect(await getCurrentBalance(fixture.accountId)).toBe(800);
  });

  it("can be negative when expenses exceed income", async () => {
    await addIncome(100);
    await addExpense(250);
    expect(await getCurrentBalance(fixture.accountId)).toBe(-150);
  });
});
