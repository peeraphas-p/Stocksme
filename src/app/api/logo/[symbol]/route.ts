import { NextResponse } from "next/server";

// โลโก้หุ้น: ดึงจากฝั่ง server แล้วแคชไว้ — เบราว์เซอร์ของผู้ใช้จึงไม่ต้องส่งรายชื่อหุ้นที่ถือไปให้เว็บโลโก้โดยตรง
// แหล่งแรก Parqet (ไอคอนสี่เหลี่ยมมีพื้นหลัง เข้ากับทั้งธีมสว่าง/มืด), สำรอง Financial Modeling Prep
// ไม่พบ → 404 แล้วหน้าเว็บจะแสดงตัวอักษรย่อแทน

const SOURCES = [
  (s: string) => `https://assets.parqet.com/logos/symbol/${encodeURIComponent(s)}?format=png&size=128`,
  (s: string) => `https://financialmodelingprep.com/image-stock/${encodeURIComponent(s)}.png`,
];
const DAY = 60 * 60 * 24;

export async function GET(_req: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const symbol = (await params).symbol.toUpperCase();
  if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(symbol)) return new NextResponse(null, { status: 400 });

  for (const src of SOURCES) {
    try {
      const res = await fetch(src(symbol), { next: { revalidate: 30 * DAY } });
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.startsWith("image/")) continue;
      const body = await res.arrayBuffer();
      if (body.byteLength < 100) continue;
      return new NextResponse(body, {
        headers: { "content-type": type, "cache-control": `public, max-age=${7 * DAY}, stale-while-revalidate=${30 * DAY}` },
      });
    } catch {
      // ลองแหล่งถัดไป
    }
  }
  return new NextResponse(null, { status: 404, headers: { "cache-control": `public, max-age=${DAY}` } });
}
