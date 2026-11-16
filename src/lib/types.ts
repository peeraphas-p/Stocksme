export type Side = "BUY" | "SELL";
export type Currency = "USD" | "THB";

export interface Trade {
  id: string;
  symbol: string;
  side: Side;
  qty: number | string;
  price_usd: number | string;
  fee_usd: number | string;
  executed_at: string; // ISO timestamp
  broker?: string | null;
  fx_rate?: number | string | null;
  strategy_tag?: string | null;
  emotion?: string | null;
  note?: string | null;
  import_batch_id?: string | null;
  external_key?: string | null;
  /** ราคาตัดขาดทุน / เป้าหมาย ที่วางไว้ตอนซื้อ (ใช้คิด R-multiple) */
  stop_price?: number | string | null;
  target_price?: number | string | null;
  /** เลขลำดับสำหรับเรียงรายการที่เวลาเดียวกันเป๊ะ (เช่น เลขที่คำสั่งในไฟล์ที่มีแต่วันที่) */
  seq?: number | string | null;
  /** ถ้ามีค่า: seq เป็นตัวนับที่วนกลับไป 0 เมื่อถึงค่านี้ (Dime = 1,000,000) */
  seq_cycle?: number | string | null;
}

export type NewTrade = Omit<Trade, "id">;

export interface JournalEntry {
  id: string;
  entry_date: string;
  symbol: string | null;
  strategy_tag: string | null;
  emotion: string | null;
  plan: string | null;
  result: string | null;
  lesson: string | null;
  rating: number | null;
}

export interface ImportBatch {
  id: string;
  broker: string;
  filename: string | null;
  row_count: number;
  created_at: string;
}

export interface Profile {
  default_currency: Currency;
  strategy_tags: string[];
}

export const EMOTIONS = ["มั่นใจ", "ตามแผน", "FOMO", "กลัว", "โลภ", "แก้แค้นตลาด", "เบื่อ/เทรดเล่น"] as const;

export type CashKind = "DEPOSIT" | "WITHDRAW" | "DIVIDEND" | "TAX" | "INTEREST" | "FEE";

/** เงินเข้า-ออกบัญชีโบรก (ไม่ใช่การซื้อขายหุ้น) — amount_usd เป็นบวกเสมอ ทิศทางดูจาก kind */
export interface CashMovement {
  id: string;
  kind: CashKind;
  occurred_on: string; // YYYY-MM-DD
  amount_usd: number | string;
  amount_thb: number | string | null;
  symbol: string | null;
  broker: string | null;
  note: string | null;
}

export const CASH_KINDS: { kind: CashKind; label: string; sign: 1 | -1 }[] = [
  { kind: "DEPOSIT", label: "ฝากเงิน", sign: 1 },
  { kind: "WITHDRAW", label: "ถอนเงิน", sign: -1 },
  { kind: "DIVIDEND", label: "ปันผล", sign: 1 },
  { kind: "TAX", label: "ภาษีหัก ณ ที่จ่าย", sign: -1 },
  { kind: "INTEREST", label: "ดอกเบี้ย", sign: 1 },
  { kind: "FEE", label: "ค่าธรรมเนียมอื่น", sign: -1 },
];
