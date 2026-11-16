import { describe, expect, it } from "vitest";
import { parseOption } from "./options";

describe("parseOption", () => {
  it("reads OCC option symbols", () => {
    expect(parseOption("AMZN250919C00247500")).toEqual({ underlying: "AMZN", expiry: "2025-09-19", type: "Call", strike: 247.5 });
    expect(parseOption("spy260116p00600000")).toEqual({ underlying: "SPY", expiry: "2026-01-16", type: "Put", strike: 600 });
  });
  it("leaves ordinary tickers alone", () => {
    expect(parseOption("NVDA")).toBeNull();
    expect(parseOption("BRK.B")).toBeNull();
    expect(parseOption("AMZN251319C00247500")).toBeNull(); // month 13
  });
});
