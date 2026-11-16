/** ดึงอัตรา THB/USD สำหรับหลายวัน (key = YYYY-MM-DD) ผ่าน /api/fx */
export async function fetchFxRates(days: string[]): Promise<{ rates: Record<string, number>; latest: number | null }> {
  if (days.length === 0) return latestOnly();
  const sorted = [...new Set(days)].sort();
  const today = new Date().toISOString().slice(0, 10);
  const to = sorted[sorted.length - 1] > today ? today : sorted[sorted.length - 1];
  try {
    const res = await fetch(`/api/fx?from=${sorted[0] > to ? to : sorted[0]}&to=${to}`);
    if (!res.ok) return { rates: {}, latest: null };
    return await res.json();
  } catch {
    return { rates: {}, latest: null };
  }
}

async function latestOnly() {
  try {
    const res = await fetch(`/api/fx`);
    if (!res.ok) return { rates: {}, latest: null };
    return await res.json();
  } catch {
    return { rates: {}, latest: null };
  }
}

/** วันที่ (ตามเวลานิวยอร์ก) ของรายการ — ใช้เลือกอัตราแลกเปลี่ยน */
export function usMarketDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(iso));
}
