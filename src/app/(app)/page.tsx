"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DailyBars, EquityChart } from "@/components/Charts";
import PnlCalendar from "@/components/PnlCalendar";
import { CurrencyToggle, Empty, ErrorBox, PageHeader, Segmented, Stat } from "@/components/ui";
import { money, pct, tone } from "@/lib/format";
import { dailyPnl, equityCurve, filterByPeriod, groupPnl, localDay, roundTrips, summarize, type Period } from "@/lib/stats";
import { useApp } from "@/lib/useApp";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "วันนี้" },
  { value: "week", label: "สัปดาห์" },
  { value: "month", label: "เดือน" },
  { value: "year", label: "ปี" },
  { value: "all", label: "ทั้งหมด" },
];

export default function Dashboard() {
  const app = useApp();
  const { currency, pnl } = app;
  const [period, setPeriod] = useState<Period>("month");

  const lots = useMemo(() => filterByPeriod(pnl.closed, period), [pnl.closed, period]);
  const s = useMemo(() => summarize(lots, currency), [lots, currency]);
  const curve = useMemo(() => equityCurve(lots, currency), [lots, currency]);
  const symbols = useMemo(() => groupPnl(lots, currency, (l) => l.symbol), [lots, currency]);
  const allDaily = useMemo(() => dailyPnl(pnl.closed, currency), [pnl.closed, currency]);
  const allCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of roundTrips(pnl.closed, currency)) {
      const k = localDay(r.sellAt);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [pnl.closed, currency]);

  const openCost = pnl.open.reduce((sum, o) => sum + (currency === "USD" ? o.costUsd : o.costThb), 0);
  const ratio = s.avgLoss !== 0 ? s.avgWin / Math.abs(s.avgLoss) : null;
  const feesShown = currency === "USD" ? s.feesUsd : s.feesUsd * app.latestFx;

  if (!app.loading && app.trades.length === 0) {
    return (
      <>
        <PageHeader title="ภาพรวม" />
        <ErrorBox error={app.error} />
        <Empty>
          ยังไม่มีข้อมูล — เริ่มจาก{" "}
          <Link href="/trades" className="text-accent underline">
            เพิ่มรายการ
          </Link>{" "}
          หรือ{" "}
          <Link href="/import" className="text-accent underline">
            นำเข้าไฟล์จากโบรก
          </Link>
        </Empty>
      </>
    );
  }

  return (
    <>
      <PageHeader title="ภาพรวม">
        <CurrencyToggle value={currency} onChange={app.setCurrency} />
      </PageHeader>
      <div className="overflow-x-auto -mx-4 px-4">
        <Segmented value={period} onChange={setPeriod} options={PERIODS} />
      </div>
      <ErrorBox error={app.error} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="card col-span-2 lg:col-span-1">
          <div className="text-xs text-muted">กำไร/ขาดทุนสุทธิ</div>
          <div className={`mt-1 text-3xl font-bold ${tone(s.net)}`}>{money(s.net, currency, { sign: true })}</div>
          <div className="text-xs text-muted mt-0.5">หักค่าธรรมเนียมแล้ว · {s.trades} เทรด</div>
        </div>
        <Stat label="Win rate" value={pct(s.winRate)} sub={`ชนะ ${s.wins} · แพ้ ${s.losses}`} />
        <Stat label="Profit factor" value={s.profitFactor == null ? "—" : s.profitFactor.toFixed(2)} sub="กำไรรวม ÷ ขาดทุนรวม" />
        <Stat
          label="ไม้กำไรเฉลี่ย / ไม้ขาดทุนเฉลี่ย"
          value={ratio == null ? "—" : ratio.toFixed(2)}
          sub={
            <>
              <span className="text-gain">{money(s.avgWin, currency, { sign: true })}</span> /{" "}
              <span className="text-loss">{money(s.avgLoss, currency, { sign: true })}</span>
            </>
          }
        />
        <Stat label="ค่าธรรมเนียมที่จ่าย" value={money(feesShown, currency)} sub={`ถืออยู่ ${pnl.open.length} ตัว · ทุน ${money(openCost, currency, { compact: true })}`} />
      </div>

      {pnl.warnings.length > 0 && (
        <Link href="/trades" className="card block text-sm text-loss">
          ⚠️ มี {pnl.warnings.length} รายการที่ขายเกินจำนวนที่ถือ — ตัวเลขอาจไม่ครบ (ดูรายละเอียด)
        </Link>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="card">
          <div className="mb-2 text-sm font-bold">กำไรสะสม</div>
          {curve.length ? <EquityChart data={curve} currency={currency} /> : <div className="py-16 text-center text-sm text-muted">ไม่มีไม้ที่ปิดในช่วงนี้</div>}
        </div>
        <div className="card">
          <div className="mb-2 text-sm font-bold">กำไร/ขาดทุนรายวัน</div>
          {curve.length ? <DailyBars data={curve} currency={currency} /> : <div className="py-16 text-center text-sm text-muted">ไม่มีไม้ที่ปิดในช่วงนี้</div>}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
        <PnlCalendar daily={allDaily} counts={allCounts} currency={currency} />
        <div className="card">
          <div className="mb-2 text-sm font-bold">ผลตามหุ้น</div>
          {symbols.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">—</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted text-left">
                <tr>
                  <th className="py-1">หุ้น</th>
                  <th className="py-1 text-right">เทรด</th>
                  <th className="py-1 text-right">Win</th>
                  <th className="py-1 text-right">สุทธิ</th>
                </tr>
              </thead>
              <tbody>
                {[...symbols.slice(0, 5), ...(symbols.length > 10 ? [null] : []), ...symbols.slice(Math.max(5, symbols.length - 5))].map((g, i) =>
                  g ? (
                    <tr key={g.key} className="border-t border-border">
                      <td className="py-1.5 font-bold">{g.key}</td>
                      <td className="py-1.5 text-right text-muted">{g.count}</td>
                      <td className="py-1.5 text-right text-muted">{pct(g.wins / g.count)}</td>
                      <td className={`py-1.5 text-right font-bold ${tone(g.pnl)}`}>{money(g.pnl, currency, { sign: true })}</td>
                    </tr>
                  ) : (
                    <tr key={"gap" + i}>
                      <td colSpan={4} className="py-1 text-center text-muted">⋯</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
