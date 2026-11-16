import Decimal from "decimal.js";
import { CASH_KINDS, type CashKind, type CashMovement, type Trade } from "./types";

const D = (v: number | string | null | undefined) => new Decimal(v == null || v === "" ? 0 : String(v));
const SIGN = Object.fromEntries(CASH_KINDS.map((k) => [k.kind, k.sign])) as Record<CashKind, 1 | -1>;

export interface CashSummary {
  /** ฝาก − ถอน (USD) */
  netDepositUsd: number;
  /** ฝาก − ถอน เป็นบาท — null ถ้ามีรายการฝาก/ถอนที่ไม่ได้ใส่ยอดบาท */
  netDepositThb: number | null;
  dividendsUsd: number;
  taxUsd: number;
  interestUsd: number;
  otherFeesUsd: number;
  /** ปันผล − ภาษี + ดอกเบี้ย − ค่าธรรมเนียมอื่น */
  incomeNetUsd: number;
  /** เงินที่จ่ายซื้อหุ้นทั้งหมด (รวมค่าธรรมเนียม) */
  boughtUsd: number;
  /** เงินที่ได้จากการขายทั้งหมด (หลังหักค่าธรรมเนียม) */
  soldUsd: number;
  /** เงินสดคงเหลือโดยประมาณ = ฝากสุทธิ + รายได้สุทธิ − ซื้อ + ขาย */
  cashUsd: number;
  counts: Record<CashKind, number>;
}

export function summarizeCash(moves: CashMovement[], trades: Trade[]): CashSummary {
  const by = (k: CashKind) => moves.filter((m) => m.kind === k).reduce((s, m) => s.plus(D(m.amount_usd)), new Decimal(0));
  const deposits = by("DEPOSIT");
  const withdrawals = by("WITHDRAW");
  const dividends = by("DIVIDEND");
  const tax = by("TAX");
  const interest = by("INTEREST");
  const fees = by("FEE");

  const depositMoves = moves.filter((m) => m.kind === "DEPOSIT" || m.kind === "WITHDRAW");
  const allThb = depositMoves.every((m) => m.amount_thb != null && m.amount_thb !== "");
  const netThb = depositMoves.reduce((s, m) => s.plus(D(m.amount_thb).times(SIGN[m.kind])), new Decimal(0));

  let bought = new Decimal(0);
  let sold = new Decimal(0);
  for (const t of trades) {
    const gross = D(t.qty).times(D(t.price_usd));
    if (t.side === "BUY") bought = bought.plus(gross).plus(D(t.fee_usd));
    else sold = sold.plus(gross).minus(D(t.fee_usd));
  }

  const income = dividends.minus(tax).plus(interest).minus(fees);
  const netDeposit = deposits.minus(withdrawals);
  const counts = Object.fromEntries(CASH_KINDS.map((k) => [k.kind, moves.filter((m) => m.kind === k.kind).length])) as Record<CashKind, number>;

  return {
    netDepositUsd: netDeposit.toNumber(),
    netDepositThb: depositMoves.length && allThb ? netThb.toNumber() : depositMoves.length ? null : 0,
    dividendsUsd: dividends.toNumber(),
    taxUsd: tax.toNumber(),
    interestUsd: interest.toNumber(),
    otherFeesUsd: fees.toNumber(),
    incomeNetUsd: income.toNumber(),
    boughtUsd: bought.toNumber(),
    soldUsd: sold.toNumber(),
    cashUsd: netDeposit.plus(income).minus(bought).plus(sold).toNumber(),
    counts,
  };
}

/** ยอดที่มีเครื่องหมาย (+ เข้าบัญชี, − ออกจากบัญชี) */
export const signedUsd = (m: CashMovement) => D(m.amount_usd).times(SIGN[m.kind]).toNumber();

/** ปันผลสุทธิ (ปันผล − ภาษีที่ระบุหุ้น) แยกตามหุ้น */
export function dividendsBySymbol(moves: CashMovement[]) {
  const m = new Map<string, number>();
  for (const x of moves) {
    if ((x.kind !== "DIVIDEND" && x.kind !== "TAX") || !x.symbol) continue;
    m.set(x.symbol, (m.get(x.symbol) ?? 0) + signedUsd(x));
  }
  return [...m.entries()].map(([symbol, net]) => ({ symbol, net })).sort((a, b) => b.net - a.net);
}
