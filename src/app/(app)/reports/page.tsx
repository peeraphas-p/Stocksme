"use client";

import { useMemo, useState } from "react";
import { ChartNoAxesCombined } from "lucide-react";
import { CurrencyToggle, Empty, PageHeader, Segmented } from "@/components/ui";
import { money, pct, tone } from "@/lib/format";
import { isDateOnlyTime } from "@/lib/importers";
import type { ClosedLot } from "@/lib/pnl";
import { filterByPeriod, groupPnl, type Period } from "@/lib/stats";
import { useApp } from "@/lib/useApp";
import type { Currency } from "@/lib/types";

const WEEKDAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];

const nyParts = (iso: string) => {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", hour12: false }).formatToParts(new Date(iso));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.find((x) => x.type === "weekday")!.value);
  const hour = Number(p.find((x) => x.type === "hour")!.value) % 24;
  return { wd, hour };
};

/** ชั่วโมงที่เข้า; รายการจากไฟล์ที่มีแต่วันที่ไม่มีเวลาจริง จึงแยกไว้ต่างหาก */
function entryHour(l: ClosedLot) {
  if (isDateOnlyTime(l.buyAt)) return "ไม่ทราบเวลา";
  const h = nyParts(l.buyAt).hour;
  return `${String(h).padStart(2, "0")}:00–${String(h + 1).padStart(2, "0")}:00`;
}

function holdBucket(l: ClosedLot) {
  const min = l.holdingMinutes;
  // ทั้งสองขามีแต่วันที่: นับเป็นจำนวนวัน (ไม่รู้ว่าถือกี่นาที)
  if (isDateOnlyTime(l.buyAt) && isDateOnlyTime(l.sellAt)) {
    const days = Math.round(min / 1440);
    if (days <= 0) return "0. วันเดียวกัน";
    return days < 7 ? "5. 1–7 วัน" : "6. มากกว่า 1 สัปดาห์";
  }
  if (min < 5) return "1. < 5 นาที";
  if (min < 30) return "2. 5–30 นาที";
  if (min < 120) return "3. 30 นาที–2 ชม.";
  if (min < 60 * 24) return "4. ภายในวัน (2 ชม.+)";
  if (min < 60 * 24 * 7) return "5. 1–7 วัน";
  return "6. มากกว่า 1 สัปดาห์";
}

const REPORTS: { title: string; hint?: string; key: (l: ClosedLot) => string | null; sort?: "key" }[] = [
  { title: "ตามกลยุทธ์ (Playbook)", key: (l) => l.strategyTag },
  { title: "ตามอารมณ์ตอนเทรด", hint: "อารมณ์ไหนพาเจ๊ง", key: (l) => l.emotion },
  { title: "ตามวันที่เข้า (เวลา US)", key: (l) => `${nyParts(l.buyAt).wd}. ${WEEKDAYS[nyParts(l.buyAt).wd]}`, sort: "key" },
  { title: "ตามชั่วโมงที่เข้า (เวลานิวยอร์ก)", key: entryHour, sort: "key" },
  { title: "ตามระยะเวลาถือ", key: holdBucket, sort: "key" },
];

function GroupCard({ title, hint, lots, currency, keyFn, sortByKey }: { title: string; hint?: string; lots: ClosedLot[]; currency: Currency; keyFn: (l: ClosedLot) => string | null; sortByKey?: boolean }) {
  const rows = useMemo(() => {
    const g = groupPnl(lots, currency, keyFn);
    return sortByKey ? g.sort((a, b) => a.key.localeCompare(b.key)) : g;
  }, [lots, currency, keyFn, sortByKey]);
  const max = Math.max(1e-9, ...rows.map((r) => Math.abs(r.pnl)));
  const label = (k: string) => (sortByKey ? k.replace(/^\d+\.\s*/, "") : k);

  return (
    <div className="card">
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted">—</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-2 text-sm">
              <div className="truncate" title={label(r.key)}>
                {label(r.key)}
                <div className="text-[11px] text-muted">
                  {r.count} เทรด · win {pct(r.wins / r.count)}
                </div>
              </div>
              <div className="relative h-3">
                <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                <div
                  className={`absolute inset-y-0 rounded ${r.pnl >= 0 ? "left-1/2 bg-gain" : "right-1/2 bg-loss"}`}
                  style={{ width: `${(Math.abs(r.pnl) / max) * 50}%` }}
                />
              </div>
              <div className={`text-right text-[13px] font-medium whitespace-nowrap ${tone(r.pnl)}`}>{money(r.pnl, currency, { sign: true, compact: true })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const app = useApp();
  const [period, setPeriod] = useState<Period>("all");
  const lots = useMemo(() => filterByPeriod(app.pnl.closed, period), [app.pnl.closed, period]);

  return (
    <>
      <PageHeader eyebrow="อะไรทำเงิน อะไรทำให้เสียเงิน" title="รายงาน">
        <CurrencyToggle value={app.currency} onChange={app.setCurrency} />
      </PageHeader>
      <Segmented
        value={period}
        onChange={setPeriod}
        options={[
          { value: "month", label: "เดือนนี้" },
          { value: "year", label: "ปีนี้" },
          { value: "all", label: "ทั้งหมด" },
        ]}
      />
      {app.loading ? (
        <Empty>กำลังโหลด…</Empty>
      ) : lots.length === 0 ? (
        <Empty icon={ChartNoAxesCombined} title="ยังไม่มีไม้ที่ปิดในช่วงนี้" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {REPORTS.map((r) => (
            <GroupCard key={r.title} title={r.title} hint={r.hint} lots={lots} currency={app.currency} keyFn={r.key} sortByKey={r.sort === "key"} />
          ))}
        </div>
      )}
    </>
  );
}
