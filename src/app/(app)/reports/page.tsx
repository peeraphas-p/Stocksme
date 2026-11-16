"use client";

import { useMemo, useState } from "react";
import { ChartNoAxesCombined, Download, Info, Target } from "lucide-react";
import { CurrencyToggle, Empty, PageHeader, Segmented, Skeleton } from "@/components/ui";
import { money, pct, tone } from "@/lib/format";
import { isDateOnlyTime } from "@/lib/importers";
import type { ClosedLot } from "@/lib/pnl";
import { filterByPeriod, groupPnl, NONE_KEY, rBucket, rSummary, yearCsv, yearlySummary, type Period } from "@/lib/stats";
import { useApp } from "@/lib/useApp";
import type { Currency } from "@/lib/types";
import { useI18n } from "@/i18n/client";
import { emotionLabel, type I18n } from "@/i18n/core";

const UNKNOWN_HOUR = "zz"; // เรียงไว้ท้ายสุด

const nyParts = (iso: string) => {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", hour12: false }).formatToParts(new Date(iso));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.find((x) => x.type === "weekday")!.value);
  const hour = Number(p.find((x) => x.type === "hour")!.value) % 24;
  return { wd, hour };
};

/** ชั่วโมงที่เข้า; รายการจากไฟล์ที่มีแต่วันที่ไม่มีเวลาจริง จึงแยกไว้ต่างหาก */
function entryHour(l: ClosedLot) {
  if (isDateOnlyTime(l.buyAt)) return UNKNOWN_HOUR;
  const h = nyParts(l.buyAt).hour;
  return `${String(h).padStart(2, "0")}:00–${String(h + 1).padStart(2, "0")}:00`;
}

/** กลุ่มระยะเวลาถือ "0"–"6" (ชื่อกลุ่มอยู่ใน m.reports.hold0–hold6) */
function holdBucket(l: ClosedLot) {
  const min = l.holdingMinutes;
  // ทั้งสองขามีแต่วันที่: นับเป็นจำนวนวัน (ไม่รู้ว่าถือกี่นาที)
  if (isDateOnlyTime(l.buyAt) && isDateOnlyTime(l.sellAt)) {
    const days = Math.round(min / 1440);
    if (days <= 0) return "0";
    return days < 7 ? "5" : "6";
  }
  if (min < 5) return "1";
  if (min < 30) return "2";
  if (min < 120) return "3";
  if (min < 60 * 24) return "4";
  if (min < 60 * 24 * 7) return "5";
  return "6";
}

type Report = { id: string; title: string; hint?: string; key: (l: ClosedLot) => string | null; label?: (k: string) => string; sort?: "key" };

function reports({ m, fmt }: I18n): Report[] {
  const r = m.reports;
  return [
    { id: "strategy", title: r.byStrategy, key: (l) => l.strategyTag },
    { id: "emotion", title: r.byEmotion, hint: r.byEmotionHint, key: (l) => l.emotion, label: (k) => emotionLabel(m, k) },
    { id: "weekday", title: r.byWeekday, key: (l) => String(nyParts(l.buyAt).wd), label: (k) => fmt.weekdayLong(Number(k)), sort: "key" },
    { id: "hour", title: r.byHour, key: entryHour, label: (k) => (k === UNKNOWN_HOUR ? r.unknownTime : k), sort: "key" },
    { id: "hold", title: r.byHolding, key: holdBucket, label: (k) => r[`hold${k}` as `hold${0 | 1 | 2 | 3 | 4 | 5 | 6}`], sort: "key" },
    { id: "r", title: r.byR, hint: r.byRHint, key: (l) => rBucket(l.rMultiple), label: (k) => r[`r${k}` as `r${1 | 2 | 3 | 4 | 5 | 6}`], sort: "key" },
  ];
}

function GroupCard({ report, lots, currency }: { report: Report; lots: ClosedLot[]; currency: Currency }) {
  const { m, t } = useI18n();
  const { title, hint, key: keyFn } = report;
  const sortByKey = report.sort === "key";
  const rows = useMemo(() => {
    const g = groupPnl(lots, currency, keyFn);
    return sortByKey ? g.sort((a, b) => a.key.localeCompare(b.key)) : g;
  }, [lots, currency, keyFn, sortByKey]);
  const max = Math.max(1e-9, ...rows.map((r) => Math.abs(r.pnl)));
  const label = (k: string) => (k === NONE_KEY ? m.common.unspecified : report.label ? report.label(k) : k);

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
                  {t(m.common.winLine, { n: r.count, p: pct(r.wins / r.count) })}
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
  const i18n = useI18n();
  const { m } = i18n;
  const [period, setPeriod] = useState<Period>("all");
  const lots = useMemo(() => filterByPeriod(app.pnl.closed, period), [app.pnl.closed, period]);
  const cards = useMemo(() => reports(i18n), [i18n]);

  return (
    <>
      <PageHeader eyebrow={m.reports.eyebrow} title={m.reports.title}>
        <CurrencyToggle value={app.currency} onChange={app.setCurrency} />
      </PageHeader>
      <Segmented
        label={m.periods.label}
        value={period}
        onChange={setPeriod}
        options={[
          { value: "month", label: m.periods.thisMonth },
          { value: "year", label: m.periods.thisYear },
          { value: "all", label: m.periods.allTime },
        ]}
      />
      {app.loading ? (
        <Skeleton cards={2} rows={5} className="lg:!grid-cols-2" />
      ) : lots.length === 0 ? (
        <Empty icon={ChartNoAxesCombined} title={m.reports.empty} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <DisciplineCard lots={lots} />
          {cards.map((r) => (
            <GroupCard key={r.id} report={r} lots={lots} currency={app.currency} />
          ))}
        </div>
      )}
      {!app.loading && app.pnl.closed.length > 0 && <YearlyReport lots={app.pnl.closed} />}
    </>
  );
}

/** วินัยตามแผน: เทียบผลกับความเสี่ยงที่ตั้งไว้ตอนซื้อ */
function DisciplineCard({ lots }: { lots: ClosedLot[] }) {
  const s = useMemo(() => rSummary(lots), [lots]);
  const { m, t } = useI18n();
  const r = m.reports;
  const trades = (n: number) => t(m.common.tradesN, { n });
  return (
    <div className="card">
      <div className="panel-title">
        <h2>{r.discipline}</h2>
        <Target size={16} strokeWidth={1.7} className="opacity-70" aria-hidden="true" />
      </div>
      {s.planned === 0 ? (
        <p className="text-[13px] text-muted">
          {r.disciplineEmpty}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
          {[
            [r.avgR, s.avgR == null ? "—" : `${s.avgR > 0 ? "+" : ""}${s.avgR.toFixed(2)}R`, s.avgR],
            [r.planned, t(r.plannedOf, { a: s.planned, b: s.total }), null],
            [r.overLoss, trades(s.overLoss), s.overLoss ? -1 : null],
            [r.bigWins, trades(s.bigWins), s.bigWins ? 1 : null],
          ].map(([k, v, sign]) => (
            <div key={String(k)}>
              <div className="text-[11px] text-muted">{k}</div>
              <div className={`big-number text-lg ${typeof sign === "number" ? tone(sign) : ""}`}>{v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** สรุปรายปี (USD/THB) + ดาวน์โหลด CSV ต่อปี */
function YearlyReport({ lots }: { lots: ClosedLot[] }) {
  const rows = useMemo(() => yearlySummary(lots), [lots]);
  const { lang, m, t } = useI18n();
  const r = m.reports;
  function download(year: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + yearCsv(lots, year)], { type: "text/csv;charset=utf-8" }));
    a.download = `stocksme-closed-trades-${year}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  return (
    <section className="card p-0 overflow-hidden">
      <div className="panel-title px-5 pt-5">
        <h2>{r.yearly}</h2>
        <span className="text-[11px]">{r.yearlySub}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="data w-full text-[13px]">
          <thead>
            <tr>
              <th className="p-3">{r.colYear}</th>
              <th className="p-3 text-right">{r.colTrades}</th>
              <th className="p-3 text-right hidden sm:table-cell">{r.colWinLoss}</th>
              <th className="p-3 text-right hidden md:table-cell">{r.colFees}</th>
              <th className="p-3 text-right">{r.colNetUsd}</th>
              <th className="p-3 text-right">{r.colNetThb}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((y) => (
              <tr key={y.year}>
                <td className="p-3 font-medium whitespace-nowrap">
                  {lang === "th" ? (
                    <>
                      {Number(y.year) + 543} <span className="text-[11px] font-normal text-muted">({y.year})</span>
                    </>
                  ) : (
                    y.year
                  )}
                </td>
                <td className="p-3 text-right text-muted">{y.trades}</td>
                <td className="p-3 text-right hidden sm:table-cell whitespace-nowrap">
                  <span className="text-gain">{money(y.grossWinUsd, "USD", { sign: true })}</span> / <span className="text-loss">{money(y.grossLossUsd, "USD", { sign: true })}</span>
                </td>
                <td className="p-3 text-right hidden md:table-cell text-muted">{money(y.feesUsd, "USD")}</td>
                <td className={`p-3 text-right font-medium whitespace-nowrap ${tone(y.netUsd)}`}>{money(y.netUsd, "USD", { sign: true })}</td>
                <td className={`p-3 text-right font-medium whitespace-nowrap ${tone(y.netThb)}`}>{money(y.netThb, "THB", { sign: true })}</td>
                <td className="p-1.5 text-right">
                  <button className="btn-ghost" onClick={() => download(y.year)} title={t(r.downloadYear, { y: y.year })} aria-label={t(r.downloadYear, { y: y.year })}>
                    <Download size={14} aria-hidden="true" />
                    CSV
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex items-start gap-2 border-t border-border px-5 py-3 text-[11px] text-muted">
        <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        {r.taxNote}
      </p>
    </section>
  );
}
