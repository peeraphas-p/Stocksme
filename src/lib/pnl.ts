import Decimal from "decimal.js";
import { DATE_ONLY_NY_HOUR, zonedToIso } from "./importers";
import { parseOption } from "./options";
import type { Trade } from "./types";

/** ไม้ที่ปิดแล้ว: ส่วนของการซื้อหนึ่งครั้งที่จับคู่กับการขายหนึ่งครั้ง (FIFO) */
export interface ClosedLot {
  symbol: string;
  qty: number;
  buyTradeId: string;
  sellTradeId: string;
  buyAt: string;
  sellAt: string;
  buyPrice: number;
  sellPrice: number;
  /** ทุนรวมค่าธรรมเนียมซื้อ (USD) */
  costUsd: number;
  /** รายรับหลังหักค่าธรรมเนียมขาย (USD) */
  proceedsUsd: number;
  feesUsd: number;
  pnlUsd: number;
  costThb: number;
  proceedsThb: number;
  pnlThb: number;
  holdingMinutes: number;
  strategyTag: string | null;
  emotion: string | null;
  /** ความเสี่ยงที่วางแผนไว้ (USD) = (ราคาซื้อ − stop) × จำนวน — null ถ้าไม่ได้ตั้ง stop ไว้ต่ำกว่าราคาซื้อ */
  riskUsd: number | null;
  /** กำไร/ขาดทุนเป็นกี่เท่าของความเสี่ยงที่วางไว้ (R-multiple) */
  rMultiple: number | null;
  /** ออปชันที่หมดอายุโดยไม่มีรายการขาย — ปิดให้อัตโนมัติที่ $0 ณ วันหมดอายุ */
  expired?: boolean;
}

export interface OpenPosition {
  symbol: string;
  qty: number;
  avgCostUsd: number;
  costUsd: number;
  costThb: number;
  firstBuyAt: string;
}

export interface OversellWarning {
  symbol: string;
  /** จำนวนหุ้นที่ขายเกิน */
  qty: string;
  /** เวลาของรายการขาย (ISO) */
  at: string;
}

export interface PnlResult {
  closed: ClosedLot[];
  open: OpenPosition[];
  /** ขายเกินจำนวนที่ถืออยู่ (ข้อมูลซื้อหาย หรือ short) — หน้าเว็บแปลงเป็นข้อความตามภาษา */
  warnings: OversellWarning[];
}

interface Lot {
  stop: Decimal | null;
  tradeId: string;
  at: string;
  price: Decimal;
  qty: Decimal; // remaining
  costPerShare: Decimal; // incl. buy fee
  fx: Decimal;
  strategyTag: string | null;
  emotion: string | null;
}

const D = (v: number | string | null | undefined) => new Decimal(v == null || v === "" ? 0 : String(v));

/**
 * เศษหุ้นจากการปัดทศนิยมของโบรก (เช่น ซื้อ 0.1490528 แต่ขาย 0.1490529)
 * น้อยกว่านี้ไม่นับเป็นหุ้นที่ถืออยู่ และไม่นับเป็นการขายเกิน
 */
const DUST = new Decimal("0.000001");

const timeOf = (t: Trade) => new Date(t.executed_at).getTime();
const num = (v: number | string | null | undefined) => (v == null || v === "" ? null : Number(v));
const buysFirst = (list: Trade[]) => [...list.filter((t) => t.side === "BUY"), ...list.filter((t) => t.side === "SELL")];

/**
 * เรียงรายการที่มีเวลาเดียวกันเป๊ะ (เช่น ไฟล์ที่มีแต่วันที่) ด้วยเลขลำดับ `seq`
 * - ถ้า `seq_cycle` มีค่า แปลว่า seq เป็นตัวนับที่วนกลับไป 0 ได้ (เช่น เลขที่คำสั่ง 6 หลักของ Dime)
 *   จึงเริ่มนับหลัง "ช่องว่างที่ใหญ่ที่สุด" ของกลุ่ม ซึ่งคือช่วงที่ไม่ได้เทรด
 * - รายการที่ไม่มี seq: ซื้อไว้หน้าสุด ขายไว้ท้ายสุด
 */
function orderSameTime(group: Trade[]): Trade[] {
  if (group.length < 2) return group;
  const keyed = group.filter((t) => num(t.seq) != null);
  if (keyed.length === 0) return buysFirst(group);
  const unkeyed = group.filter((t) => num(t.seq) == null);

  const cycle = num(keyed.find((t) => num(t.seq_cycle))?.seq_cycle);
  let start = 0;
  if (cycle) {
    const ids = [...new Set(keyed.map((t) => ((num(t.seq)! % cycle) + cycle) % cycle))].sort((a, b) => a - b);
    let widest = -1;
    ids.forEach((id, i) => {
      const next = ids[(i + 1) % ids.length];
      const gap = (next - id + cycle) % cycle;
      if (ids.length > 1 && gap > widest) [widest, start] = [gap, next];
    });
  }
  const key = (t: Trade) => (cycle ? (((num(t.seq)! - start) % cycle) + cycle) % cycle : num(t.seq)!);
  const ordered = [...keyed].sort((a, b) => key(a) - key(b) || (a.side === b.side ? 0 : a.side === "BUY" ? -1 : 1));
  return [...unkeyed.filter((t) => t.side === "BUY"), ...ordered, ...unkeyed.filter((t) => t.side === "SELL")];
}

/** เรียงรายการตามเวลา; รายการที่เวลาเดียวกันเรียงตามเลขลำดับ (ถ้ามี) ไม่อย่างนั้นซื้อก่อนขาย */
export function orderTrades(trades: Trade[]): Trade[] {
  return groupsByTime(trades).flatMap(orderSameTime);
}

function groupsByTime(trades: Trade[]): Trade[][] {
  const sorted = [...trades].sort((a, b) => timeOf(a) - timeOf(b));
  const groups: Trade[][] = [];
  for (const t of sorted) {
    const last = groups[groups.length - 1];
    if (last && timeOf(last[0]) === timeOf(t)) last.push(t);
    else groups.push([t]);
  }
  return groups;
}

/** ความเสี่ยงต่อไม้ตามแผน: ถ้าโดน stop จะเสีย (ราคาซื้อ − stop) × จำนวน */
function riskOf(lot: Lot, qty: Decimal, pnl: Decimal): { riskUsd: number | null; rMultiple: number | null } {
  if (!lot.stop) return { riskUsd: null, rMultiple: null };
  const risk = lot.price.minus(lot.stop).times(qty);
  if (risk.lte(0)) return { riskUsd: null, rMultiple: null };
  return { riskUsd: risk.toNumber(), rMultiple: pnl.div(risk).toNumber() };
}

/** วันที่ (YYYY-MM-DD) ตามเวลานิวยอร์ก */
const nyDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);

/**
 * จับคู่ซื้อ-ขายแบบ FIFO แยกตามหุ้น
 * @param fallbackFx อัตรา THB/USD ที่ใช้เมื่อรายการไม่มี fx_rate
 * @param asOf วันที่ใช้ตัดสินว่าออปชันหมดอายุแล้วหรือยัง (ค่าเริ่มต้น: ตอนนี้)
 */
export function computePnl(trades: Trade[], fallbackFx = 35, asOf: Date = new Date()): PnlResult {
  const books = new Map<string, Lot[]>();
  const closed: ClosedLot[] = [];
  const warnings: OversellWarning[] = [];
  const symbolOf = (t: Trade) => t.symbol.trim().toUpperCase();
  const held = (symbol: string) => (books.get(symbol) ?? []).reduce((s, l) => s.plus(l.qty), new Decimal(0));

  function apply(tr: Trade) {
    const symbol = symbolOf(tr);
    const qty = D(tr.qty);
    const price = D(tr.price_usd);
    const fee = D(tr.fee_usd);
    const fx = tr.fx_rate != null && tr.fx_rate !== "" ? D(tr.fx_rate) : new Decimal(fallbackFx);
    if (qty.lte(0)) return;
    const book = books.get(symbol) ?? [];
    books.set(symbol, book);

    if (tr.side === "BUY") {
      book.push({
        tradeId: tr.id,
        at: tr.executed_at,
        price,
        qty,
        costPerShare: price.plus(fee.div(qty)),
        stop: tr.stop_price != null && tr.stop_price !== "" && D(tr.stop_price).lt(price) ? D(tr.stop_price) : null,
        fx,
        strategyTag: tr.strategy_tag ?? null,
        emotion: tr.emotion ?? null,
      });
      return;
    }

    // SELL
    const sellFeePerShare = fee.div(qty);
    let remaining = qty;
    while (remaining.gt(DUST) && book.length > 0) {
      const lot = book[0];
      const take = Decimal.min(lot.qty, remaining);
      const cost = lot.costPerShare.times(take);
      const proceeds = price.minus(sellFeePerShare).times(take);
      const buyFee = lot.costPerShare.minus(lot.price).times(take);
      const sellFee = sellFeePerShare.times(take);
      const costThb = cost.times(lot.fx);
      const proceedsThb = proceeds.times(fx);
      closed.push({
        symbol,
        qty: take.toNumber(),
        buyTradeId: lot.tradeId,
        sellTradeId: tr.id,
        buyAt: lot.at,
        sellAt: tr.executed_at,
        buyPrice: lot.price.toNumber(),
        sellPrice: price.toNumber(),
        costUsd: cost.toNumber(),
        proceedsUsd: proceeds.toNumber(),
        feesUsd: buyFee.plus(sellFee).toNumber(),
        pnlUsd: proceeds.minus(cost).toNumber(),
        costThb: costThb.toNumber(),
        proceedsThb: proceedsThb.toNumber(),
        pnlThb: proceedsThb.minus(costThb).toNumber(),
        holdingMinutes: Math.round((new Date(tr.executed_at).getTime() - new Date(lot.at).getTime()) / 60000),
        strategyTag: lot.strategyTag ?? tr.strategy_tag ?? null,
        ...riskOf(lot, take, proceeds.minus(cost)),
        emotion: lot.emotion ?? tr.emotion ?? null,
      });
      lot.qty = lot.qty.minus(take);
      remaining = remaining.minus(take);
      if (lot.qty.lte(DUST)) book.shift();
    }
    if (remaining.gt(DUST)) {
      warnings.push({ symbol, qty: remaining.toString(), at: tr.executed_at });
    }
  }

  for (const group of groupsByTime(trades)) {
    // แต่ละหุ้นมีสมุดของตัวเอง จึงประมวลผลทีละหุ้นภายในกลุ่มเวลาเดียวกันได้
    const bySymbol = new Map<string, Trade[]>();
    for (const tr of orderSameTime(group)) {
      const s = symbolOf(tr);
      bySymbol.set(s, [...(bySymbol.get(s) ?? []), tr]);
    }
    for (const [symbol, list] of bySymbol) {
      // ถ้าเรียงตามเลขลำดับแล้วกลายเป็นขายหุ้นที่ยังไม่ได้ซื้อ แปลว่าลำดับนั้นเชื่อไม่ได้ → ให้ซื้อก่อนขาย
      let balance = held(symbol);
      const oversells = list.some((tr) => {
        balance = tr.side === "BUY" ? balance.plus(D(tr.qty)) : balance.minus(D(tr.qty));
        return balance.lt(DUST.neg());
      });
      for (const tr of oversells ? buysFirst(list) : list) apply(tr);
    }
  }

  // ออปชันที่เลยวันหมดอายุแล้วแต่ยังเหลืออยู่ = หมดอายุโดยไม่มีมูลค่า → ปิดที่ $0 ณ วันหมดอายุ
  // (ลงเวลาแบบ "มีแต่วันที่" เพื่อให้แสดงเป็นวันหมดอายุทั้งเวลา US และเวลาไทย)
  // (ถ้าใช้สิทธิ์หรือขายไปแล้ว รายการขายในไฟล์จะปิดล็อตไปก่อนถึงตรงนี้)
  const today = nyDay(asOf);
  for (const [symbol, book] of books) {
    const opt = parseOption(symbol);
    if (!opt || opt.expiry >= today) continue;
    const [y, m, d] = opt.expiry.split("-").map(Number);
    const at = zonedToIso(y, m, d, DATE_ONLY_NY_HOUR, 0, 0, "America/New_York");
    for (const lot of book) {
      if (lot.qty.lte(DUST)) continue;
      const cost = lot.costPerShare.times(lot.qty);
      closed.push({
        symbol,
        qty: lot.qty.toNumber(),
        buyTradeId: lot.tradeId,
        sellTradeId: `expired:${symbol}:${lot.tradeId}`,
        buyAt: lot.at,
        sellAt: at,
        buyPrice: lot.price.toNumber(),
        sellPrice: 0,
        costUsd: cost.toNumber(),
        proceedsUsd: 0,
        feesUsd: lot.costPerShare.minus(lot.price).times(lot.qty).toNumber(),
        pnlUsd: cost.neg().toNumber(),
        costThb: cost.times(lot.fx).toNumber(),
        proceedsThb: 0,
        pnlThb: cost.times(lot.fx).neg().toNumber(),
        holdingMinutes: Math.round((new Date(at).getTime() - new Date(lot.at).getTime()) / 60000),
        strategyTag: lot.strategyTag,
        emotion: lot.emotion,
        expired: true,
        ...riskOf(lot, lot.qty, cost.neg()),
      });
    }
    book.length = 0;
  }

  const open: OpenPosition[] = [];
  for (const [symbol, book] of books) {
    if (book.length === 0) continue;
    let qty = new Decimal(0);
    let cost = new Decimal(0);
    let costThb = new Decimal(0);
    for (const lot of book) {
      qty = qty.plus(lot.qty);
      const c = lot.costPerShare.times(lot.qty);
      cost = cost.plus(c);
      costThb = costThb.plus(c.times(lot.fx));
    }
    if (qty.lte(DUST)) continue;
    open.push({
      symbol,
      qty: qty.toNumber(),
      avgCostUsd: cost.div(qty).toNumber(),
      costUsd: cost.toNumber(),
      costThb: costThb.toNumber(),
      firstBuyAt: book[0].at,
    });
  }
  open.sort((a, b) => b.costUsd - a.costUsd);
  // ล่าสุดก่อน; ไม้ที่ขายเวลาเดียวกันคงลำดับ "ขายทีหลังอยู่บน"
  closed.reverse().sort((a, b) => new Date(b.sellAt).getTime() - new Date(a.sellAt).getTime());

  return { closed, open, warnings };
}
