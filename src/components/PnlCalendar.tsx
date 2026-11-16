"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { localDay } from "@/lib/stats";
import type { Currency } from "@/lib/types";

const WEEK = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

/** ปฏิทินกำไรขาดทุนรายวัน (ตามวันที่ขาย, เวลาเครื่อง) */
export default function PnlCalendar({
  daily,
  counts,
  currency,
}: {
  daily: Map<string, number>;
  counts: Map<string, number>;
  currency: Currency;
}) {
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const y = month.getFullYear();
  const m = month.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(y, m, i + 1))];
  while (cells.length % 7) cells.push(null);

  let monthNet = 0;
  let tradingDays = 0;
  for (const d of cells) {
    if (!d) continue;
    const v = daily.get(localDay(d));
    if (v !== undefined) {
      monthNet += v;
      tradingDays++;
    }
  }
  const today = localDay(new Date());

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button className="btn px-3" onClick={() => setMonth(new Date(y, m - 1, 1))} aria-label="เดือนก่อน">
          ‹
        </button>
        <div className="text-center">
          <div className="font-bold">{month.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}</div>
          <div className="text-xs text-muted">
            สุทธิ <b className={monthNet > 0 ? "text-gain" : monthNet < 0 ? "text-loss" : ""}>{money(monthNet, currency, { sign: true })}</b> · เทรด {tradingDays} วัน
          </div>
        </div>
        <button className="btn px-3" onClick={() => setMonth(new Date(y, m + 1, 1))} aria-label="เดือนถัดไป">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted mb-1">
        {WEEK.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = localDay(d);
          const v = daily.get(key);
          const n = counts.get(key) ?? 0;
          const bg = v === undefined ? "bg-bg" : v > 0 ? "bg-gain-soft" : v < 0 ? "bg-loss-soft" : "bg-bg";
          return (
            <div
              key={i}
              title={v !== undefined ? `${key}: ${money(v, currency, { sign: true })} (${n} เทรด)` : key}
              className={`min-h-14 sm:min-h-16 rounded-lg p-1 text-left ${bg} ${key === today ? "ring-2 ring-accent" : ""}`}
            >
              <div className="text-[10px] text-muted">{d.getDate()}</div>
              {v !== undefined && (
                <>
                  <div className={`sm:hidden text-[9px] font-bold leading-tight whitespace-nowrap overflow-hidden ${v > 0 ? "text-gain" : v < 0 ? "text-loss" : ""}`}>
                    {money(v, currency, { sign: true, compact: true, digits: 0 })}
                  </div>
                  <div className={`hidden sm:block text-xs font-bold leading-tight whitespace-nowrap ${v > 0 ? "text-gain" : v < 0 ? "text-loss" : ""}`}>
                    {money(v, currency, { sign: true, compact: true })}
                  </div>
                  <div className="hidden sm:block text-[10px] text-muted">{n} เทรด</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
