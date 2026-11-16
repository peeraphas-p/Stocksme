import { NextResponse } from "next/server";

// ราคาล่าสุดของหุ้น US (ใช้คิดกำไร/ขาดทุนของหุ้นที่ยังถืออยู่)
// GET /api/prices?symbols=NVDA,NBIS → { prices: { NVDA: { price, prevClose, time, currency } }, source }
// ดึงจากฝั่ง server แล้วแคช 5 นาที — ส่งออกไปเฉพาะชื่อหุ้น ไม่มีข้อมูลผู้ใช้
// แหล่งข้อมูล: Yahoo Finance chart endpoint (ไม่ใช่ API ทางการ อาจล่าช้าหรือเปลี่ยนได้; ถ้าล้มเหลว หน้าเว็บจะซ่อนราคาล่าสุด)

const MAX = 60;
const SYMBOL = /^[A-Z][A-Z0-9.\-]{0,9}$/;

export interface Quote {
  price: number;
  prevClose: number | null;
  time: string; // ISO
  currency: string;
}

async function quote(symbol: string): Promise<Quote | null> {
  const yahoo = symbol.replace(".", "-"); // BRK.B → BRK-B
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?range=1d&interval=1d`, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; Stocksme/1.0)" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const meta = (await res.json())?.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice);
    if (!Number.isFinite(price) || price <= 0) return null;
    const prev = Number(meta?.chartPreviousClose ?? meta?.previousClose);
    return {
      price,
      prevClose: Number.isFinite(prev) && prev > 0 ? prev : null,
      time: new Date(Number(meta?.regularMarketTime) * 1000 || Date.now()).toISOString(),
      currency: String(meta?.currency ?? "USD"),
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("symbols") ?? "";
  const symbols = [...new Set(raw.split(",").map((s) => s.trim().toUpperCase()).filter((s) => SYMBOL.test(s)))].slice(0, MAX);
  if (symbols.length === 0) return NextResponse.json({ prices: {}, source: "Yahoo Finance" });

  const results = await Promise.all(symbols.map(async (s) => [s, await quote(s)] as const));
  const prices = Object.fromEntries(results.filter(([, q]) => q && q.currency === "USD"));
  return NextResponse.json({ prices, source: "Yahoo Finance" }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
}
