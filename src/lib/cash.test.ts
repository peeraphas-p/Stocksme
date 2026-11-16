import { describe, expect, it } from "vitest";
import { dividendsBySymbol, signedUsd, summarizeCash } from "./cash";
import type { CashMovement, Trade } from "./types";

let n = 0;
const m = (kind: CashMovement["kind"], usd: number, extra: Partial<CashMovement> = {}): CashMovement => ({
  id: `c${++n}`,
  kind,
  occurred_on: "2026-01-10",
  amount_usd: usd,
  amount_thb: null,
  symbol: null,
  broker: null,
  note: null,
  ...extra,
});
const t = (side: "BUY" | "SELL", qty: number, price: number, fee: number): Trade => ({
  id: `t${++n}`,
  symbol: "AAPL",
  side,
  qty,
  price_usd: price,
  fee_usd: fee,
  executed_at: "2026-01-11T15:00:00Z",
});

describe("summarizeCash", () => {
  it("tracks deposits, income and trading cash flows", () => {
    const s = summarizeCash(
      [
        m("DEPOSIT", 1000, { amount_thb: 34000 }),
        m("WITHDRAW", 200, { amount_thb: 6900 }),
        m("DIVIDEND", 10, { symbol: "AAPL" }),
        m("TAX", 1.5, { symbol: "AAPL" }),
        m("INTEREST", 0.4),
        m("FEE", 2),
      ],
      [t("BUY", 2, 100, 1), t("SELL", 2, 110, 1)],
    );
    expect(s.netDepositUsd).toBe(800);
    expect(s.netDepositThb).toBe(27100);
    expect(s.incomeNetUsd).toBeCloseTo(6.9, 10);
    expect(s.boughtUsd).toBe(201);
    expect(s.soldUsd).toBe(219);
    expect(s.cashUsd).toBeCloseTo(800 + 6.9 - 201 + 219, 10);
  });

  it("reports THB deposits as unknown if any deposit lacks a THB amount", () => {
    expect(summarizeCash([m("DEPOSIT", 100, { amount_thb: 3400 }), m("DEPOSIT", 50)], []).netDepositThb).toBeNull();
    expect(summarizeCash([], []).netDepositThb).toBe(0);
  });
});

describe("helpers", () => {
  it("signs amounts by kind", () => {
    expect(signedUsd(m("DEPOSIT", 5))).toBe(5);
    expect(signedUsd(m("WITHDRAW", 5))).toBe(-5);
    expect(signedUsd(m("TAX", 5))).toBe(-5);
  });
  it("nets dividends against withholding tax per symbol", () => {
    expect(
      dividendsBySymbol([m("DIVIDEND", 10, { symbol: "MSFT" }), m("TAX", 1.5, { symbol: "MSFT" }), m("DIVIDEND", 3, { symbol: "KO" }), m("DEPOSIT", 99)]),
    ).toEqual([
      { symbol: "MSFT", net: 8.5 },
      { symbol: "KO", net: 3 },
    ]);
  });
});
