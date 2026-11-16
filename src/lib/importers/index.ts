import type { NewTrade, Side } from "../types";

export type BrokerId = "webull" | "dime" | "liberator" | "generic";
export type DateOrder = "auto" | "MDY" | "DMY" | "YMD";
export type Zone = "America/New_York" | "Asia/Bangkok" | "UTC";

export const BROKERS: { id: BrokerId; label: string; zone: Zone; order: DateOrder; help: string }[] = [
  {
    id: "webull",
    label: "Webull",
    zone: "America/New_York",
    order: "MDY",
    help: "แอป/เว็บ Webull → Orders (คำสั่งซื้อขาย) → History → Export เป็น CSV",
  },
  {
    id: "dime",
    label: "Dime!",
    zone: "Asia/Bangkok",
    order: "auto",
    help: "ไฟล์ Excel ของ Dime ที่มีชีต “รายการซื้อ” และ “รายการขาย” (คอลัมน์ วันที่ซื้อ/วันที่ขาย, หุ้น, จำนวนหุ้น, ราคาต่อหุ้น, ค่าธรรมเนียมรวม VAT, อัตราแลกเปลี่ยน, เลขที่คำสั่ง) — นำเข้าทั้งสองชีตพร้อมกัน ใช้ค่าธรรมเนียมและอัตรา ฿/$ จริงจากไฟล์",
  },
  {
    id: "liberator",
    label: "Liberator",
    zone: "Asia/Bangkok",
    order: "auto",
    help: "ใช้ statement/ประวัติรายการที่ส่งออกได้ แล้วตรวจการจับคู่คอลัมน์ด้านล่าง (ส่งไฟล์ตัวอย่างมาเพื่อทำตัวอ่านเฉพาะได้)",
  },
  { id: "generic", label: "อื่นๆ / CSV ทั่วไป", zone: "America/New_York", order: "auto", help: "ไฟล์ต้องมีคอลัมน์ หุ้น, ซื้อ/ขาย, จำนวน, ราคา, วันเวลา" },
];

export type Field = "symbol" | "side" | "qty" | "price" | "gross" | "fee" | "fx" | "date" | "time" | "orderId" | "status";
export type Mapping = Partial<Record<Field, string>>;

/** ค่าพิเศษของ mapping.side เมื่อไฟล์ไม่มีคอลัมน์ซื้อ/ขาย (เช่น ไฟล์รายการซื้ออย่างเดียว) */
export const SIDE_ALL_BUY = "__ALL_BUY__";
export const SIDE_ALL_SELL = "__ALL_SELL__";

export const FIELD_LABELS: Record<Field, string> = {
  symbol: "หุ้น (Symbol)",
  side: "ซื้อ/ขาย",
  qty: "จำนวนหุ้น",
  price: "ราคาต่อหุ้น (USD)",
  gross: "มูลค่าก่อนค่าธรรมเนียม (USD)",
  fee: "ค่าธรรมเนียม (USD)",
  fx: "อัตรา ฿/$",
  date: "วันที่ / วันเวลา",
  time: "เวลา (ถ้าแยกคอลัมน์)",
  orderId: "เลขที่คำสั่ง",
  status: "สถานะคำสั่ง",
};
export const REQUIRED: Field[] = ["symbol", "side", "qty", "price", "date"];

// ชื่อหัวคอลัมน์ (ตัวพิมพ์เล็ก) ที่รู้จัก — เรียงจากเฉพาะเจาะจงไปทั่วไป
const ALIASES: Record<Field, string[]> = {
  symbol: ["symbol", "ticker", "stock symbol", "stock", "instrument", "หุ้น", "ชื่อหุ้น", "สัญลักษณ์", "หลักทรัพย์"],
  side: ["side", "action", "buy/sell", "b/s", "transaction type", "trade type", "type", "direction", "ประเภท", "ประเภทรายการ", "ซื้อ/ขาย", "ฝั่ง"],
  qty: ["filled", "filled qty", "filled quantity", "executed qty", "quantity", "qty", "shares", "units", "จำนวน", "จำนวนหุ้น"],
  price: [
    "avg price", "average price", "avg. price", "filled price", "execution price", "executed price", "price (usd)", "price",
    "ราคาต่อหุ้น (usd)", "ราคาต่อหุ้น", "ราคาเฉลี่ย (usd)", "ราคาเฉลี่ย", "ราคาที่ได้", "ราคา (usd)", "ราคา",
  ],
  gross: ["มูลค่าก่อนค่าธรรมเนียม (usd)", "มูลค่าก่อนค่าธรรมเนียม", "gross amount (usd)", "gross amount", "principal amount", "principal"],
  fee: [
    "ค่าธรรมเนียมรวม vat (usd)", "ค่าธรรมเนียม (usd)", "fee (usd)", "fees (usd)", "commission (usd)",
    "fee", "fees", "commission", "commissions", "comm", "total fee", "ค่าธรรมเนียมรวม vat", "ค่าธรรมเนียม", "ค่าคอม", "ค่าคอมมิชชั่น",
  ],
  fx: ["อัตราแลกเปลี่ยน thb/usd", "อัตราแลกเปลี่ยน", "exchange rate", "fx rate", "thb/usd", "usd/thb"],
  date: [
    "filled time", "execution time", "executed time", "trade time", "trade date", "transaction date", "date/time", "datetime", "date", "time",
    "วันที่ซื้อ", "วันที่ขาย", "วันที่ซื้อขาย", "วันที่ทำรายการ", "วันเวลา", "วันที่",
  ],
  time: ["เวลา"],
  orderId: ["เลขที่คำสั่ง", "เลขที่คำสั่งซื้อขาย", "order id", "order no", "order no.", "order number", "order #"],
  status: ["status", "order status", "สถานะ"],
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * เดาว่าคอลัมน์ไหนคืออะไร
 * @param hints ชื่อชีต แล้วตามด้วยชื่อไฟล์ — ใช้เดาว่าทั้งตารางเป็นรายการซื้อหรือขาย เมื่อไม่มีคอลัมน์ซื้อ/ขาย
 *              (ดูจากหัวคอลัมน์ก่อน แล้วชื่อชีต แล้วชื่อไฟล์ ตามลำดับ)
 */
export function guessMapping(headers: string[], ...hints: string[]): Mapping {
  const m: Mapping = {};
  const used = new Set<string>();
  const nh = headers.map((h) => [h, norm(h)] as const);
  for (const field of Object.keys(ALIASES) as Field[]) {
    for (const alias of ALIASES[field]) {
      const hit = nh.find(([h, n]) => n === alias && !used.has(h));
      if (hit) {
        m[field] = hit[0];
        used.add(hit[0]);
        break;
      }
    }
  }
  if (m.time && !m.date) {
    m.date = m.time;
    delete m.time;
  }
  if (!m.side) {
    // ใช้แหล่งแรกที่บอกได้: ถ้าแหล่งนั้นพูดถึงทั้งซื้อและขาย ถือว่าเดาไม่ได้
    for (const source of [headers.join(" "), ...hints]) {
      const text = norm(source);
      const buy = /ซื้อ|\bbuys?\b|\bbought\b|purchase/.test(text);
      const sell = /ขาย|\bsells?\b|\bsold\b/.test(text);
      if (buy && sell) break;
      if (buy || sell) {
        m.side = buy ? SIDE_ALL_BUY : SIDE_ALL_SELL;
        break;
      }
    }
  }
  return m;
}

export function parseNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).trim();
  if (!s || s === "-" || s === "--") return null;
  const neg = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()$,฿\s]|USD|THB/gi, "").replace(/^-/, "");
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

export function parseSide(v: unknown): Side | null {
  const s = norm(String(v ?? ""));
  if (/^(buy|b|bot|bought|long|buy to open|ซื้อ)/.test(s)) return "BUY";
  if (/^(sell|s|sld|sold|short|sell to close|ขาย)/.test(s)) return "SELL";
  return null;
}

/** หา offset (นาที) ของ timezone ณ เวลานั้น */
function zoneOffsetMinutes(zone: string, utcMs: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const g = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return (asUtc - utcMs) / 60000;
}

/** เวลาแบบ wall-clock ในโซนที่กำหนด → ISO UTC */
export function zonedToIso(y: number, mo: number, d: number, h: number, mi: number, s: number, zone: string) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let off = zoneOffsetMinutes(zone, guess);
  off = zoneOffsetMinutes(zone, guess - off * 60000);
  return new Date(guess - off * 60000).toISOString();
}

/**
 * ไฟล์ที่มีแต่วันที่ (ไม่มีเวลา) ถือว่าเป็นวันซื้อขายของตลาด US
 * แล้ววางไว้ 10:00 น. เวลานิวยอร์ก ซึ่งเป็นวันเดียวกันทั้งเวลา US และเวลาไทย
 */
export const DATE_ONLY_NY_HOUR = 10;
const dateOnly = (y: number, mo: number, d: number) => zonedToIso(y, mo, d, DATE_ONLY_NY_HOUR, 0, 0, "America/New_York");

const nyClock = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** รายการนี้มาจากไฟล์ที่มีแต่วันที่หรือไม่ (เวลาตรง 10:00:00.000 นิวยอร์กพอดี) */
export function isDateOnlyTime(iso: string): boolean {
  const d = new Date(iso);
  if (d.getMilliseconds() !== 0) return false;
  const p = nyClock.formatToParts(d);
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return g("hour") === DATE_ONLY_NY_HOUR && g("minute") === 0 && g("second") === 0;
}

const TZ_ABBR: Record<string, string> = { EST: "America/New_York", EDT: "America/New_York", ET: "America/New_York", ICT: "Asia/Bangkok", UTC: "UTC", GMT: "UTC" };

/** แปลงข้อความ/เซลล์วันเวลา → ISO; รองรับ 01/05/2026 09:31:02 EST, 2026-01-05 09:31, 5/1/2569 (พ.ศ.), เซลล์วันที่ของ Excel */
export function parseDateTime(raw: unknown, order: DateOrder, zone: Zone): string | null {
  if (raw == null || raw === "") return null;

  // เซลล์วันที่ของ Excel: SheetJS ให้ Date ตามเวลาเครื่อง → อ่านเป็นเวลา wall-clock ตามที่เห็นในไฟล์
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    const [y, mo, d, h, mi, s] = [raw.getFullYear(), raw.getMonth() + 1, raw.getDate(), raw.getHours(), raw.getMinutes(), raw.getSeconds()];
    if (!h && !mi && !s) return dateOnly(y, mo, d);
    return zonedToIso(y, mo, d, h, mi, s, zone);
  }
  let s = String(raw).trim();

  // ISO ที่มี offset/Z อยู่แล้ว
  if (/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:?\d{2})$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  let z: string = zone;
  const abbr = s.match(/\s([A-Z]{2,4})$/);
  if (abbr && TZ_ABBR[abbr[1]]) {
    z = TZ_ABBR[abbr[1]];
    s = s.slice(0, abbr.index).trim();
  }

  const m = s.match(/^(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(AM|PM)?)?$/i);
  if (!m) return null;
  const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let y: number, mo: number, d: number;
  if (m[1].length === 4 || order === "YMD") [y, mo, d] = [a, b, c];
  else if (order === "DMY" || (order === "auto" && a > 12)) [d, mo, y] = [a, b, c];
  else [mo, d, y] = [a, b, c];
  if (y < 100) y += 2000;
  if (y > 2400) y -= 543; // พ.ศ.
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  if (m[4] === undefined) return dateOnly(y, mo, d);
  let h = Number(m[4]);
  const mi = Number(m[5]);
  const sec = Number(m[6] ?? 0);
  if (m[7]) {
    const pm = m[7].toUpperCase() === "PM";
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
  }
  if (h > 23 || mi > 59) return null;
  return zonedToIso(y, mo, d, h, mi, sec, z);
}

export interface ParsedRow {
  line: number;
  /** ชื่อชีตที่แถวนี้มาจาก (ไฟล์ Excel) */
  sheet?: string;
  trade?: NewTrade;
  skip?: string; // ข้ามโดยตั้งใจ (เช่น คำสั่งที่ยกเลิก)
  error?: string;
}

const SKIP_STATUS = /cancel|reject|fail|expired|pending|working|ยกเลิก|ไม่สำเร็จ/i;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * @param opts.sheet ชื่อชีต (ติดไปกับผลลัพธ์แต่ละแถว)
 * @param opts.seen  ส่ง Map เดียวกันเมื่ออ่านหลายชีตของไฟล์เดียว เพื่อให้ key ของรายการที่หน้าตาเหมือนกันไม่ชนกันข้ามชีต
 */
export function toTrades(
  rows: Record<string, unknown>[],
  map: Mapping,
  broker: BrokerId,
  order: DateOrder,
  zone: Zone,
  opts: { sheet?: string; seen?: Map<string, number> } = {},
): ParsedRow[] {
  const brokerLabel = BROKERS.find((b) => b.id === broker)?.label ?? broker;
  const seen = opts.seen ?? new Map<string, number>();
  return rows.map((r, i) => toTrade(r, i + 2, map, broker, brokerLabel, order, zone, seen)).map((p) => (opts.sheet ? { ...p, sheet: opts.sheet } : p));
}

function toTrade(
  r: Record<string, unknown>,
  line: number, // +header, 1-based
  map: Mapping,
  broker: BrokerId,
  brokerLabel: string,
  order: DateOrder,
  zone: Zone,
  seen: Map<string, number>,
): ParsedRow {
  const get = (f: Field) => (map[f] ? r[map[f]!] : undefined);
  const status = get("status");
  if (status != null && String(status).trim() && SKIP_STATUS.test(String(status))) return { line, skip: `สถานะ ${status}` };

  const symbol = String(get("symbol") ?? "").trim().toUpperCase();
  const side: Side | null = map.side === SIDE_ALL_BUY ? "BUY" : map.side === SIDE_ALL_SELL ? "SELL" : parseSide(get("side"));
  const qtyRaw = parseNumber(get("qty"));
  const gross = parseNumber(get("gross"));
  const fee = Math.abs(parseNumber(get("fee")) ?? 0);
  const fx = parseNumber(get("fx"));
  const orderId = String(get("orderId") ?? "").trim();
  const dateVal = get("date");
  const timeVal = get("time");
  const when = parseDateTime(timeVal != null && timeVal !== "" && !(dateVal instanceof Date) ? `${dateVal} ${timeVal}` : dateVal, order, zone);

  if (!symbol && qtyRaw == null) return { line, skip: "แถวว่าง" };
  if (/^(รวม|total|grand total)$/i.test(symbol)) return { line, skip: "แถวสรุปยอด" };
  if (qtyRaw === 0) return { line, skip: "ไม่มีการจับคู่ (จำนวน 0)" };

  // ราคาต่อหุ้นในไฟล์มักปัดเป็น 2 ตำแหน่ง — ถ้ามีมูลค่ารวม ให้คิดราคาจริงจาก มูลค่า ÷ จำนวน (แม่นกว่าสำหรับหุ้นเศษส่วน)
  let price = parseNumber(get("price"));
  if (gross != null && gross !== 0 && qtyRaw) price = round6(Math.abs(gross) / Math.abs(qtyRaw));

  const errs: string[] = [];
  if (!symbol) errs.push("ไม่มีชื่อหุ้น");
  if (!side) errs.push(`อ่านซื้อ/ขายไม่ออก (“${get("side") ?? ""}”)`);
  if (qtyRaw == null) errs.push("จำนวนไม่ถูกต้อง");
  if (price == null || price < 0) errs.push("ราคาไม่ถูกต้อง");
  if (!when) errs.push(`อ่านวันที่ไม่ออก (“${dateVal ?? ""}”)`);
  if (errs.length) return { line, error: errs.join(", ") };

  const qty = Math.abs(qtyRaw!);
  const base = orderId ? `${broker}|order:${orderId}|${side}` : [broker, symbol, side, qty, price, when].join("|");
  const n = (seen.get(base) ?? 0) + 1;
  seen.set(base, n);
  // Dime: ไฟล์มีแต่วันที่ แต่เลขที่คำสั่ง 6 หลักเป็นตัวนับที่เรียงตามเวลา (วนกลับที่ 1,000,000) → ใช้เรียงไม้ภายในวันเดียวกัน
  const dimeSeq = broker === "dime" && /^[0-9]{6}$/.test(orderId) && isDateOnlyTime(when!);
  return {
    line,
    trade: {
      ...(dimeSeq ? { seq: Number(orderId), seq_cycle: 1_000_000 } : {}),
      symbol,
      side: side!,
      qty,
      price_usd: price!,
      fee_usd: fee,
      executed_at: when!,
      broker: brokerLabel,
      fx_rate: fx != null && fx > 0 ? fx : null,
      external_key: `${base}|${n}`,
    },
  };
}

/** ตารางหนึ่งตารางในไฟล์ (ชีตของ Excel หรือทั้งไฟล์ CSV) */
export interface Table {
  sheet: string; // "" สำหรับ CSV
  headers: string[];
  rows: Record<string, unknown>[];
}

/** ตาราง + การจับคู่คอลัมน์ที่เดาได้ + จะนำเข้าหรือไม่ */
export interface PlannedTable extends Table {
  map: Mapping;
  include: boolean;
}

const missingFields = (map: Mapping) => REQUIRED.filter((f) => !map[f]);

/**
 * เดาการจับคู่คอลัมน์ของทุกตาราง และเลือกว่าจะนำเข้าตารางไหน:
 * ทุกตารางที่จับคู่ช่องบังคับได้ครบ (เช่น ชีตรายการซื้อ + ชีตรายการขาย) — ชีตสรุปจะไม่ถูกเลือก
 * ถ้าไม่มีตารางไหนครบ จะเลือกตารางที่ใกล้เคียงที่สุดไว้ให้ผู้ใช้จับคู่คอลัมน์เอง
 */
export function planTables(tables: Table[], fileName = ""): PlannedTable[] {
  const planned = tables.map((t) => {
    const map = guessMapping(t.headers, t.sheet, fileName);
    return { ...t, map, include: missingFields(map).length === 0 };
  });
  if (planned.length && !planned.some((t) => t.include)) {
    const best = planned.reduce((a, b) => (missingFields(b.map).length < missingFields(a.map).length ? b : a));
    best.include = true;
  }
  return planned;
}

/** อ่าน Excel ทุกชีตที่มีข้อมูล */
export async function parseWorkbook(data: ArrayBuffer): Promise<Table[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(data, { cellDates: true });
  return wb.SheetNames.map((sheet) => {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheet], { defval: "", raw: true });
    return { sheet, headers: rows.length ? Object.keys(rows[0]) : [], rows };
  }).filter((t) => t.headers.length > 0);
}

export async function parseCsv(text: string): Promise<Table[]> {
  const Papa = (await import("papaparse")).default;
  const res = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), { header: true, skipEmptyLines: "greedy" });
  const headers = res.meta.fields ?? [];
  return headers.length ? [{ sheet: "", headers, rows: res.data }] : [];
}

/** อ่านไฟล์ CSV / Excel ที่ผู้ใช้เลือก */
export async function readFile(file: File): Promise<Table[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseWorkbook(await file.arrayBuffer());
  return parseCsv(await file.text());
}
