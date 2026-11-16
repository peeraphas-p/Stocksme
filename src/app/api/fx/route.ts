import { NextResponse } from "next/server";

// อัตรา THB ต่อ 1 USD รายวัน จาก Frankfurter (ข้อมูล ECB, ฟรี ไม่ต้องใช้ key)
// GET /api/fx?from=2026-01-01&to=2026-01-31  → { rates: { "2026-01-02": 35.12, ... }, latest: 35.4 }
// วันหยุด/เสาร์อาทิตย์ จะเติมด้วยอัตราของวันทำการก่อนหน้า

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const SOURCES = [
  (from: string, to: string) => `https://api.frankfurter.dev/v1/${from}..${to}?base=USD&symbols=THB`,
  (from: string, to: string) => `https://api.frankfurter.app/${from}..${to}?from=USD&to=THB`,
];

function addDays(day: string, n: number) {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? today;
  const from = searchParams.get("from") ?? to;
  if (!ISO.test(from) || !ISO.test(to) || from > to) {
    return NextResponse.json({ error: "bad date range" }, { status: 400 });
  }
  // ถอยไป 7 วัน เผื่อวันแรกเป็นวันหยุด
  const start = addDays(from, -7);

  for (const src of SOURCES) {
    try {
      const res = await fetch(src(start, to), { next: { revalidate: 60 * 60 * 6 } });
      if (!res.ok) continue;
      const data = (await res.json()) as { rates: Record<string, { THB: number }> };
      const known = Object.entries(data.rates)
        .map(([d, r]) => [d, r.THB] as const)
        .sort(([a], [b]) => a.localeCompare(b));
      if (known.length === 0) continue;

      const rates: Record<string, number> = {};
      let last = known[0][1];
      let i = 0;
      for (let day = start; day <= to; day = addDays(day, 1)) {
        while (i < known.length && known[i][0] <= day) last = known[i++][1];
        if (day >= from) rates[day] = last;
      }
      return NextResponse.json({ rates, latest: known[known.length - 1][1] });
    } catch {
      // ลองแหล่งถัดไป
    }
  }
  return NextResponse.json({ error: "fx source unavailable" }, { status: 502 });
}
