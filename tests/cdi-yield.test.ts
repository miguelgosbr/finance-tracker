import { beforeEach, describe, expect, it } from "vitest";
import {
  accrueCofrinhoYield,
  createCofrinho,
  getCofrinho,
  getMonthlyYield,
  recordMovement,
} from "@/lib/cofrinhos";
import { getDb } from "@/lib/db";
import { setSetting } from "@/lib/settings";
import { createTestUserAndAccount, type TestFixture } from "./helpers";

const AT_ACCRUAL = new Date("2026-09-08T12:00:00");

let fixture: TestFixture;

beforeEach(async () => {
  fixture = await createTestUserAndAccount();
});

// 2026-09-01 and 2026-09-08 are both Tuesdays, so 5 business days elapse
// between them (Wed, Thu, Fri, Mon, Tue).
async function setupCofrinho(balance: number, cdiPercentage: number) {
  await setSetting(fixture.userId, "cdi_rate_annual", "10");
  const cofrinho = await createCofrinho(fixture.accountId, "Reserva", cdiPercentage, null);
  await recordMovement(cofrinho.id, "deposit", balance);
  const db = await getDb();
  await db.query("UPDATE cofrinhos SET last_accrued_on = $1 WHERE id = $2", [
    "2026-09-01",
    cofrinho.id,
  ]);
  return cofrinho.id;
}

describe("cofrinho CDI yield", () => {
  it("accrues compound interest over business days", async () => {
    const id = await setupCofrinho(1000, 100);

    await accrueCofrinhoYield(id, AT_ACCRUAL);

    // 1000 * (1.10^(5/252) - 1) ≈ 1.89
    const expected = Math.round(1000 * (Math.pow(1.1, 5 / 252) - 1) * 100) / 100;
    expect(expected).toBeCloseTo(1.89, 2);

    const cofrinho = await getCofrinho(id);
    expect(cofrinho!.balance).toBeCloseTo(1000 + expected, 5);
    expect(await getMonthlyYield(id, AT_ACCRUAL)).toBeCloseTo(expected, 5);
  });

  it("scales the yield by the cofrinho's CDI percentage", async () => {
    const id100 = await setupCofrinho(1000, 100);
    await accrueCofrinhoYield(id100, AT_ACCRUAL);
    const yield100 = await getMonthlyYield(id100, AT_ACCRUAL);

    const id115 = await setupCofrinho(1000, 115);
    await accrueCofrinhoYield(id115, AT_ACCRUAL);
    const yield115 = await getMonthlyYield(id115, AT_ACCRUAL);

    expect(yield115).toBeGreaterThan(yield100);
  });

  it("is idempotent for the same day", async () => {
    const id = await setupCofrinho(1000, 100);

    await accrueCofrinhoYield(id, AT_ACCRUAL);
    const afterFirst = (await getCofrinho(id))!.balance;

    await accrueCofrinhoYield(id, AT_ACCRUAL);
    const afterSecond = (await getCofrinho(id))!.balance;

    expect(afterSecond).toBe(afterFirst);
  });

  it("does not accrue on a zero balance", async () => {
    await setSetting(fixture.userId, "cdi_rate_annual", "10");
    const cofrinho = await createCofrinho(fixture.accountId, "Vazio", 100, null);
    const db = await getDb();
    await db.query("UPDATE cofrinhos SET last_accrued_on = $1 WHERE id = $2", [
      "2026-09-01",
      cofrinho.id,
    ]);

    await accrueCofrinhoYield(cofrinho.id, AT_ACCRUAL);

    expect((await getCofrinho(cofrinho.id))!.balance).toBe(0);
  });
});
