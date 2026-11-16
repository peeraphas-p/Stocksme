import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { computePnl } from "../pnl";
import { SIDE_ALL_BUY, SIDE_ALL_SELL, guessMapping, isDateOnlyTime, parseDateTime, parseNumber, parseSide, parseWorkbook, planTables, toTrades } from "./index";

describe("parseDateTime", () => {
  it("reads Webull-style US Eastern time (winter and summer)", () => {
    expect(parseDateTime("01/05/2026 09:31:02 EST", "MDY", "America/New_York")).toBe("2026-01-05T14:31:02.000Z");
    expect(parseDateTime("07/06/2026 09:30:00 EDT", "MDY", "America/New_York")).toBe("2026-07-06T13:30:00.000Z");
  });
  it("reads Thai-time day-first dates and Buddhist years", () => {
    expect(parseDateTime("15/03/2569 21:45", "auto", "Asia/Bangkok")).toBe("2026-03-15T14:45:00.000Z");
  });
  it("reads ISO with AM/PM", () => {
    expect(parseDateTime("2026-02-10 1:05 PM", "auto", "UTC")).toBe("2026-02-10T13:05:00.000Z");
  });
  it("places date-only values at 10:00 New York time on that trading day", () => {
    expect(parseDateTime("2026-02-10", "auto", "Asia/Bangkok")).toBe("2026-02-10T15:00:00.000Z"); // EST
    expect(parseDateTime("2026-07-10", "auto", "UTC")).toBe("2026-07-10T14:00:00.000Z"); // EDT
    expect(parseDateTime(new Date(2026, 1, 10), "auto", "Asia/Bangkok")).toBe("2026-02-10T15:00:00.000Z"); // Excel date cell
  });
  it("reads Excel date-time cells as the wall-clock time in the chosen zone", () => {
    expect(parseDateTime(new Date(2026, 1, 10, 21, 45), "auto", "Asia/Bangkok")).toBe("2026-02-10T14:45:00.000Z");
  });
  it("rejects garbage", () => {
    expect(parseDateTime("yesterday", "auto", "UTC")).toBeNull();
  });
});

describe("field parsers", () => {
  it("parses money and sides", () => {
    expect(parseNumber("$1,234.50")).toBe(1234.5);
    expect(parseNumber("(2.10)")).toBe(-2.1);
    expect(parseSide("Buy")).toBe("BUY");
    expect(parseSide("ขาย")).toBe("SELL");
    expect(parseSide("dividend")).toBeNull();
  });
});

describe("Webull orders CSV", () => {
  const headers = ["Name", "Symbol", "Side", "Status", "Filled", "Total Qty", "Price", "Avg Price", "Time-in-Force", "Placed Time", "Filled Time"];
  const rows = [
    { Name: "NVIDIA", Symbol: "NVDA", Side: "Buy", Status: "Filled", Filled: "10", "Total Qty": "10", Price: "@120.00", "Avg Price": "119.95", "Time-in-Force": "DAY", "Placed Time": "01/05/2026 09:30:58 EST", "Filled Time": "01/05/2026 09:31:02 EST" },
    { Name: "NVIDIA", Symbol: "NVDA", Side: "Sell", Status: "Cancelled", Filled: "0", "Total Qty": "10", Price: "@130.00", "Avg Price": "", "Time-in-Force": "DAY", "Placed Time": "01/05/2026 10:00:00 EST", "Filled Time": "" },
    { Name: "NVIDIA", Symbol: "NVDA", Side: "Sell", Status: "Filled", Filled: "10", "Total Qty": "10", Price: "@125.00", "Avg Price": "125.10", "Time-in-Force": "DAY", "Placed Time": "01/05/2026 11:00:00 EST", "Filled Time": "01/05/2026 11:00:03 EST" },
  ];

  it("maps columns and keeps only filled orders", () => {
    const m = guessMapping(headers);
    expect(m).toMatchObject({ symbol: "Symbol", side: "Side", qty: "Filled", price: "Avg Price", date: "Filled Time", status: "Status" });
    const out = toTrades(rows, m, "webull", "MDY", "America/New_York");
    expect(out.filter((r) => r.trade)).toHaveLength(2);
    expect(out[1].skip).toBeTruthy();
    expect(out[0].trade).toMatchObject({ symbol: "NVDA", side: "BUY", qty: 10, price_usd: 119.95, executed_at: "2026-01-05T14:31:02.000Z", broker: "Webull" });
  });

  it("gives identical fills distinct keys so neither is dropped", () => {
    const m = guessMapping(headers);
    const out = toTrades([rows[0], rows[0]], m, "webull", "MDY", "America/New_York");
    expect(out[0].trade!.external_key).not.toBe(out[1].trade!.external_key);
  });
});

describe("generic Thai headers", () => {
  it("maps Thai column names", () => {
    const m = guessMapping(["วันที่", "เวลา", "หุ้น", "ประเภท", "จำนวน", "ราคา", "ค่าธรรมเนียม"]);
    expect(m).toEqual({ date: "วันที่", time: "เวลา", symbol: "หุ้น", side: "ประเภท", qty: "จำนวน", price: "ราคา", fee: "ค่าธรรมเนียม" });
    const out = toTrades([{ วันที่: "15/03/2026", เวลา: "21:45", หุ้น: "tsla", ประเภท: "ซื้อ", จำนวน: "0.5", ราคา: "250", ค่าธรรมเนียม: "0.15" }], m, "dime", "auto", "Asia/Bangkok");
    expect(out[0].trade).toMatchObject({ symbol: "TSLA", side: "BUY", qty: 0.5, fee_usd: 0.15, executed_at: "2026-03-15T14:45:00.000Z" });
  });
});

// ตัวอย่างสมมติในรูปแบบไฟล์ Dime (ไม่ใช่ข้อมูลจริง)
const DIME_HEADERS = [
  "วันที่ซื้อ", "หุ้น", "จำนวนหุ้น", "ราคาต่อหุ้น (USD)", "ยอดรวม (USD)", "ยอดรวม (THB)", "มูลค่าก่อนค่าธรรมเนียม (USD)",
  "ค่าธรรมเนียมรวม VAT (USD)", "ค่าธรรมเนียมรวม VAT (THB)", "อัตราแลกเปลี่ยน THB/USD", "ตลาด", "วันชำระราคา", "เลขที่คำสั่ง", "เลขที่ใบกำกับภาษี",
];
const DIME_ROWS = [
  [new Date(2026, 0, 15), "MSFT", 2.5, 410.25, 1027.27, 34824.45, 1025.62, 1.65, 55.94, 33.9, "XNAS", new Date(2026, 0, 16), "100001", "DIMEOS20260116000001"],
  [new Date(2026, 0, 15), "SPY260116C00600000", 1, 15, 15, 508.5, 15, 0, 0, 33.9, "Option", new Date(2026, 0, 16), "100002", "DIMEOS20260116000001"],
];
const toObjects = (headers: string[], rows: unknown[][]) => rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));

const DIME_SELL_HEADERS = DIME_HEADERS.map((h) => h.replace("วันที่ซื้อ", "วันที่ขาย").replace("ยอดรวม", "ยอดรับสุทธิ"));
const DIME_SELL_ROWS = [
  [new Date(2026, 0, 20), "MSFT", 2.5, 420.1, 1048.56, 35755.9, 1050.25, 1.69, 57.63, 34.1, "XNAS", new Date(2026, 0, 21), "100003", "DIMEOS20260121000001"],
];
const DIME_SUMMARY = [["หุ้น", "จำนวนครั้งที่ซื้อ", "จำนวนหุ้นรวม", "ยอดซื้อรวม (USD)"], ["MSFT", 1, 2.5, 1027.27], ["รวม", 2, "", 1042.27]];

function dimeWorkbook(sheets: [string, unknown[][]][]) {
  const wb = XLSX.utils.book_new();
  for (const [name, aoa] of sheets) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa, { cellDates: true }), name);
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("Dime export", () => {
  it("maps Dime columns and treats a buy list as all buys", () => {
    const m = guessMapping(DIME_HEADERS, "รายการซื้อ", "รายการซื้อหุ้น Dime.xlsx");
    expect(m).toEqual({
      symbol: "หุ้น",
      side: SIDE_ALL_BUY,
      qty: "จำนวนหุ้น",
      price: "ราคาต่อหุ้น (USD)",
      gross: "มูลค่าก่อนค่าธรรมเนียม (USD)",
      fee: "ค่าธรรมเนียมรวม VAT (USD)",
      fx: "อัตราแลกเปลี่ยน THB/USD",
      date: "วันที่ซื้อ",
      orderId: "เลขที่คำสั่ง",
    });
  });

  it("uses Dime's own fee and FX, exact price from amount ÷ shares, and the order number as the key", () => {
    const m = guessMapping(DIME_HEADERS);
    const out = toTrades(toObjects(DIME_HEADERS, DIME_ROWS), m, "dime", "auto", "Asia/Bangkok");
    expect(out[0].trade).toEqual({
      seq: 100001,
      seq_cycle: 1_000_000,
      symbol: "MSFT",
      side: "BUY",
      qty: 2.5,
      price_usd: 410.248,
      fee_usd: 1.65,
      fx_rate: 33.9,
      executed_at: "2026-01-15T15:00:00.000Z",
      broker: "Dime!",
      external_key: "dime|order:100001|BUY|1",
    });
    expect(out[1].trade).toMatchObject({ symbol: "SPY260116C00600000", qty: 1, price_usd: 15, fee_usd: 0 });
  });

  it("decides buy/sell from the headers first, then the sheet name, then the file name", () => {
    // ชีตขายในไฟล์ที่ชื่อมีคำว่า "ซื้อ" ต้องยังเป็นรายการขาย
    expect(guessMapping(DIME_SELL_HEADERS, "รายการขาย", "รายการซื้อหุ้น Dime.xlsx").side).toBe(SIDE_ALL_SELL);
    expect(guessMapping(["วันที่", "หุ้น", "จำนวนหุ้น", "ราคา"], "รายการขาย", "รายการซื้อหุ้น.xlsx").side).toBe(SIDE_ALL_SELL);
    expect(guessMapping(["วันที่", "หุ้น", "จำนวนหุ้น", "ราคา"], "Sheet1", "buys-2026.csv").side).toBe(SIDE_ALL_BUY);
    expect(guessMapping(["วันที่", "หุ้น", "จำนวนหุ้น", "ราคา"], "Sheet1", "ประวัติซื้อขาย.xlsx").side).toBeUndefined();
    expect(guessMapping(["วันที่", "หุ้น", "ราคาซื้อ", "ราคาขาย"], "รายการขาย").side).toBeUndefined();
  });

  it("imports the buy and sell sheets together and leaves the summary sheet out", async () => {
    const buf = dimeWorkbook([
      ["รายการซื้อ", [DIME_HEADERS, ...DIME_ROWS]],
      ["รายการขาย", [DIME_SELL_HEADERS, ...DIME_SELL_ROWS]],
      ["สรุปรายหุ้น", DIME_SUMMARY],
    ]);
    const tables = planTables(await parseWorkbook(buf), "รายการซื้อหุ้น Dime.xlsx");
    expect(tables.map((t) => [t.sheet, t.include, t.map.side])).toEqual([
      ["รายการซื้อ", true, SIDE_ALL_BUY],
      ["รายการขาย", true, SIDE_ALL_SELL],
      ["สรุปรายหุ้น", false, SIDE_ALL_BUY],
    ]);

    const seen = new Map<string, number>();
    const parsed = tables.filter((t) => t.include).flatMap((t) => toTrades(t.rows, t.map, "dime", "auto", "Asia/Bangkok", { sheet: t.sheet, seen }));
    expect(parsed.map((p) => [p.sheet, p.line, p.trade?.side])).toEqual([
      ["รายการซื้อ", 2, "BUY"],
      ["รายการซื้อ", 3, "BUY"],
      ["รายการขาย", 2, "SELL"],
    ]);
    expect(parsed[2].trade).toMatchObject({ price_usd: 420.1, fee_usd: 1.69, fx_rate: 34.1, executed_at: "2026-01-20T15:00:00.000Z", external_key: "dime|order:100003|SELL|1" });

    // กำไรหลังหักค่าธรรมเนียมทั้งสองขา และแปลงเป็นบาทด้วยอัตราของแต่ละวัน
    const r = computePnl(parsed.map((p, i) => ({ id: `t${i}`, ...p.trade! })), 35, new Date("2026-01-15T12:00:00Z")); // ก่อนออปชันตัวอย่างหมดอายุ
    expect(r.closed).toHaveLength(1);
    expect(r.closed[0].costUsd).toBeCloseTo(1027.27, 6); // = ยอดรวม (USD) ในชีตซื้อ
    expect(r.closed[0].proceedsUsd).toBeCloseTo(1048.56, 6); // = ยอดรับสุทธิ (USD) ในชีตขาย
    expect(r.closed[0].pnlUsd).toBeCloseTo(21.29, 6);
    expect(r.closed[0].pnlThb).toBeCloseTo(1048.56 * 34.1 - 1027.27 * 33.9, 4);
    expect(r.open.map((o) => o.symbol)).toEqual(["SPY260116C00600000"]);
    expect(r.warnings).toEqual([]);
  });

  it("offers the closest sheet when none can be mapped completely", () => {
    const tables = planTables([
      { sheet: "A", headers: ["foo", "bar"], rows: [] },
      { sheet: "B", headers: ["Symbol", "Qty", "Price", "bar"], rows: [] },
    ]);
    expect(tables.map((t) => t.include)).toEqual([false, true]);
  });

  it("keeps identical fills in different sheets from sharing a key", () => {
    const row = { Symbol: "AAPL", Side: "Buy", Qty: "1", Price: "10", Date: "2026-01-05 09:31" };
    const m = guessMapping(Object.keys(row));
    const seen = new Map<string, number>();
    const a = toTrades([row], m, "generic", "auto", "America/New_York", { sheet: "S1", seen });
    const b = toTrades([row], m, "generic", "auto", "America/New_York", { sheet: "S2", seen });
    expect(a[0].trade!.external_key).not.toBe(b[0].trade!.external_key);
  });
});

describe("isDateOnlyTime", () => {
  it("flags trades that came from a date-only file", () => {
    expect(isDateOnlyTime(parseDateTime("2026-02-10", "auto", "Asia/Bangkok")!)).toBe(true);
    expect(isDateOnlyTime(parseDateTime("2026-07-10", "auto", "Asia/Bangkok")!)).toBe(true);
    expect(isDateOnlyTime("2026-02-10T15:00:01.000Z")).toBe(false);
    expect(isDateOnlyTime("2026-02-10T14:31:02.000Z")).toBe(false);
  });
});
