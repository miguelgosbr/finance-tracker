import { beforeEach, describe, expect, it } from "vitest";
import { getBurnRateDiagnosis } from "@/lib/analytics";
import { setSetting } from "@/lib/settings";
import { createTransaction } from "@/lib/transactions";
import { createTestUserAndAccount, type TestFixture } from "./helpers";

const FOOD_CATEGORY = 1;

// Day 15 of a 30-day month: half the month has elapsed.
const REFERENCE = new Date("2026-09-15T12:00:00");

let fixture: TestFixture;

beforeEach(async () => {
  fixture = await createTestUserAndAccount();
});

function addExpense(amount: number, occurredOn: string) {
  return createTransaction({
    account_id: fixture.accountId,
    type: "expense",
    amount,
    description: "gasto",
    category_id: FOOD_CATEGORY,
    occurred_on: occurredOn,
  });
}

describe("getBurnRateDiagnosis", () => {
  it("reports no_data without a budget or history", async () => {
    const diagnosis = await getBurnRateDiagnosis(fixture.userId, [fixture.accountId], REFERENCE);
    expect(diagnosis.status).toBe("no_data");
    expect(diagnosis.budget).toBe(0);
  });

  it("is on_track when spending is within the expected pace", async () => {
    await setSetting(fixture.userId, "monthly_budget", "1000");
    await addExpense(400, "2026-09-10");

    const diagnosis = await getBurnRateDiagnosis(fixture.userId, [fixture.accountId], REFERENCE);
    expect(diagnosis.status).toBe("on_track");
    expect(diagnosis.expectedSpendSoFar).toBe(500);
    // remaining budget 600 over the 15 remaining days
    expect(diagnosis.suggestedDailyLimit).toBeCloseTo(40, 5);
  });

  it("flags ahead_of_pace when spending exceeds the pace threshold", async () => {
    await setSetting(fixture.userId, "monthly_budget", "1000");
    await addExpense(700, "2026-09-10");

    const diagnosis = await getBurnRateDiagnosis(fixture.userId, [fixture.accountId], REFERENCE);
    expect(diagnosis.status).toBe("ahead_of_pace");
    // remaining budget 300 over 15 days
    expect(diagnosis.suggestedDailyLimit).toBeCloseTo(20, 5);
    expect(diagnosis.message).toContain("acima do esperado");
  });

  it("falls back to the trailing 3-month average when no budget is set", async () => {
    // Prior three months average to 900.
    await addExpense(600, "2026-08-05");
    await addExpense(900, "2026-07-05");
    await addExpense(1200, "2026-06-05");
    await addExpense(450, "2026-09-05");

    const diagnosis = await getBurnRateDiagnosis(fixture.userId, [fixture.accountId], REFERENCE);
    expect(diagnosis.budget).toBe(900);
    // expected so far = 900 * 15/30 = 450, exactly on pace
    expect(diagnosis.expectedSpendSoFar).toBe(450);
    expect(diagnosis.status).toBe("on_track");
  });
});
