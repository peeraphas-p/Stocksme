export interface OptionInfo {
  underlying: string;
  /** วันหมดอายุ YYYY-MM-DD */
  expiry: string;
  type: "Call" | "Put";
  strike: number;
}

/** อ่านสัญลักษณ์ออปชันแบบ OCC เช่น AMZN250919C00247500 → AMZN Call $247.5 หมดอายุ 2025-09-19 */
export function parseOption(symbol: string): OptionInfo | null {
  const m = symbol.trim().toUpperCase().match(/^([A-Z]{1,6})(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/);
  if (!m) return null;
  const [mo, d] = [Number(m[3]), Number(m[4])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { underlying: m[1], expiry: `20${m[2]}-${m[3]}-${m[4]}`, type: m[5] === "C" ? "Call" : "Put", strike: Number(m[6]) / 1000 };
}
