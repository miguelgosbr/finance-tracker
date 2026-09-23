import { describe, expect, it } from "vitest";
import {
  accrueCofrinhoYield,
  createCofrinho,
  getMonthlyYield,
  listCofrinhos,
  recordMovement,
} from "@/lib/cofrinhos";
import { getDb } from "@/lib/db";
import { setSetting } from "@/lib/settings";

// 2026-09-01 and 2026-09-08 are both Tuesdays, so 5 business days elapse
// between them (Wed, Thu, Fri, Mon, Tue).
function setupCofrinho(balance: number, cdiPercentage: number) {
  setSetting("cdi_rate_annual", "10");
  const cofrinho = createCofrinho("Reserva", cdiPercentage, null);
  recordMovement(cofrinho.id, "deposit", balance);
  getDb()
    .prepare("UPDATE cofrinhos SET last_accrued_on = ? WHERE id = ?")
    .run("2026-09-01", cofrinho.id);
  return cofrinho.id;
}

describe("cofrinho CDI yield", () => {
  it("accrues compound interest over business days", () => {
    const id = setupCofrinho(1000, 100);

    accrueCofrinhoYield(id, new Date("2026-09-08T12:00:00"));

    // 1000 * (1.10^(5/252) - 1) ≈ 1.89
    const expected = Math.round(1000 * (Math.pow(1.1, 5 / 252) - 1) * 100) / 100;
    expect(expected).toBeCloseTo(1.89, 2);

    const [cofrinho] = listCofrinhos();
    expect(cofrinho.balance).toBeCloseTo(1000 + expected, 5);
    expect(getMonthlyYield(id, new Date("2026-09-08T12:00:00"))).toBeCloseTo(expected, 5);
  });

  it("scales the yield by the cofrinho's CDI percentage", () => {
    const id100 = setupCofrinho(1000, 100);
    accrueCofrinhoYield(id100, new Date("2026-09-08T12:00:00"));
    const yield100 = getMonthlyYield(id100, new Date("2026-09-08T12:00:00"));

    // Fresh DB for the 115% case.
    const id115 = setupCofrinho(1000, 115);
    accrueCofrinhoYield(id115, new Date("2026-09-08T12:00:00"));
    const yield115 = getMonthlyYield(id115, new Date("2026-09-08T12:00:00"));

    expect(yield115).toBeGreaterThan(yield100);
  });

  it("is idempotent for the same day", () => {
    const id = setupCofrinho(1000, 100);

    accrueCofrinhoYield(id, new Date("2026-09-08T12:00:00"));
    const afterFirst = listCofrinhos()[0].balance;

    accrueCofrinhoYield(id, new Date("2026-09-08T12:00:00"));
    const afterSecond = listCofrinhos()[0].balance;

    expect(afterSecond).toBe(afterFirst);
  });

  it("does not accrue on a zero balance", () => {
    setSetting("cdi_rate_annual", "10");
    const cofrinho = createCofrinho("Vazio", 100, null);
    getDb()
      .prepare("UPDATE cofrinhos SET last_accrued_on = ? WHERE id = ?")
      .run("2026-09-01", cofrinho.id);

    accrueCofrinhoYield(cofrinho.id, new Date("2026-09-08T12:00:00"));

    expect(listCofrinhos()[0].balance).toBe(0);
  });
});
