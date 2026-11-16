"use client";

import { useState } from "react";
import { parseOption } from "@/lib/options";

/** ชื่อที่อ่านง่าย: ออปชัน AMZN250919C00247500 → "AMZN Call $247.5" */
export function tickerLabel(symbol: string) {
  const o = parseOption(symbol);
  return o ? `${o.underlying} ${o.type} $${o.strike}` : symbol;
}

const failed = new Set<string>(); // ไม่ต้องขอโลโก้ที่ไม่มีซ้ำในหน้าเดียวกัน

/** โลโก้หุ้น; ถ้าไม่มีโลโก้จะแสดงตัวอักษรย่อบนพื้นสีที่คงที่ต่อหุ้น */
export function TickerLogo({ symbol, size = 28 }: { symbol: string; size?: number }) {
  const base = parseOption(symbol)?.underlying ?? symbol.toUpperCase();
  const [broken, setBroken] = useState(() => failed.has(base));
  const radius = Math.round(size * 0.3);

  if (broken) {
    let h = 0;
    for (const c of base) h = (h * 31 + c.charCodeAt(0)) % 360;
    return (
      <span
        aria-hidden="true"
        className="grid shrink-0 place-items-center font-semibold"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          fontSize: Math.max(9, size * 0.36),
          background: `color-mix(in srgb, hsl(${h} 45% 50%) 22%, var(--panel))`,
          color: `color-mix(in srgb, hsl(${h} 45% 35%) 70%, var(--fg))`,
        }}
      >
        {base.slice(0, base.length > 3 ? 2 : 3)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- โลโก้เล็กจาก /api/logo ที่แคชไว้แล้ว
    <img
      src={`/api/logo/${encodeURIComponent(base)}`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => {
        failed.add(base);
        setBroken(true);
      }}
      className="shrink-0 bg-white object-contain"
      style={{ width: size, height: size, borderRadius: radius, boxShadow: "0 0 0 1px var(--border)" }}
    />
  );
}

/** โลโก้ + ชื่อหุ้น (+ รายละเอียดออปชัน) */
export function Ticker({ symbol, size = 28, sub, className = "" }: { symbol: string; size?: number; sub?: React.ReactNode; className?: string }) {
  const o = parseOption(symbol);
  return (
    <span className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <TickerLogo symbol={symbol} size={size} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-medium">{o ? o.underlying : symbol}</span>
        {(o || sub) && (
          <span className="truncate text-[11px] font-normal text-muted">
            {o ? `${o.type} $${o.strike} · ${new Date(o.expiry + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}` : null}
            {o && sub ? " · " : null}
            {sub}
          </span>
        )}
      </span>
    </span>
  );
}
