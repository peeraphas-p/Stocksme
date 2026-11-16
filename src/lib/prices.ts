"use client";

import { useEffect, useMemo, useState } from "react";
import { parseOption } from "./options";
import type { OpenPosition } from "./pnl";

export interface Quote {
  price: number;
  prevClose: number | null;
  time: string;
  currency: string;
}

export interface Valued extends OpenPosition {
  quote: Quote | null;
  marketUsd: number | null;
  unrealizedUsd: number | null;
  unrealizedThb: number | null;
  unrealizedPct: number | null;
  dayChangeUsd: number | null;
}

/** มูลค่าตลาดและกำไร/ขาดทุนที่ยังไม่ได้ขาย; THB ใช้อัตราล่าสุดเทียบกับทุนบาทตอนซื้อ */
export function valuePositions(open: OpenPosition[], prices: Record<string, Quote>, fxNow: number): Valued[] {
  return open.map((o) => {
    const q = parseOption(o.symbol) ? null : (prices[o.symbol] ?? null);
    if (!q) return { ...o, quote: null, marketUsd: null, unrealizedUsd: null, unrealizedThb: null, unrealizedPct: null, dayChangeUsd: null };
    const market = o.qty * q.price;
    return {
      ...o,
      quote: q,
      marketUsd: market,
      unrealizedUsd: market - o.costUsd,
      unrealizedThb: market * fxNow - o.costThb,
      unrealizedPct: o.costUsd > 0 ? (market - o.costUsd) / o.costUsd : null,
      dayChangeUsd: q.prevClose != null ? o.qty * (q.price - q.prevClose) : null,
    };
  });
}

export function totals(v: Valued[]) {
  const priced = v.filter((x) => x.marketUsd != null);
  return {
    priced: priced.length,
    total: v.length,
    marketUsd: priced.reduce((s, x) => s + x.marketUsd!, 0),
    unrealizedUsd: priced.reduce((s, x) => s + x.unrealizedUsd!, 0),
    unrealizedThb: priced.reduce((s, x) => s + x.unrealizedThb!, 0),
    dayChangeUsd: priced.reduce((s, x) => s + (x.dayChangeUsd ?? 0), 0),
    asOf: priced.reduce<string | null>((latest, x) => (!latest || x.quote!.time > latest ? x.quote!.time : latest), null),
  };
}

/** ดึงราคาล่าสุดของหุ้นที่ถืออยู่ (ข้ามออปชัน) ทุก 5 นาที */
export function usePrices(symbols: string[]) {
  const key = useMemo(() => [...new Set(symbols.filter((s) => !parseOption(s)))].sort().join(","), [symbols]);
  const [prices, setPrices] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!key) return;
    let stop = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/prices?symbols=${encodeURIComponent(key)}`);
        const j = res.ok ? await res.json() : null;
        if (!stop) {
          setPrices(j?.prices ?? {});
          setFailed(!j);
        }
      } catch {
        if (!stop) setFailed(true);
      } finally {
        if (!stop) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [key]);

  return { prices, loading, failed };
}
