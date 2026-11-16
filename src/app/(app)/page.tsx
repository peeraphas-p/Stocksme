"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Briefcase, Coins, Percent, Scale, TrendingUp, TriangleAlert, Upload, Wallet } from "lucide-react";
import { DailyBars, EquityChart } from "@/components/Charts";
import PnlCalendar from "@/components/PnlCalendar";
import { Ticker, TickerLogo, tickerLabel } from "@/components/Ticker";
import { CurrencyToggle, Empty, ErrorBox, PageHeader, Segmented, Stat } from "@/components/ui";
import { money, pct, tone, tradeTime } from "@/lib/format";
import { dailyPnl, equityCurve, filterByPeriod, groupPnl, localDay, roundTrips, summarize, type Period } from "@/lib/stats";
import { totals, usePrices, valuePositions } from "@/lib/prices";
import { useApp } from "@/lib/useApp";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "วันนี้" },
  { value: "week", label: "สัปดาห์" },
  { value: "month", label: "เดือน" },
  { value: "year", label: "ปี" },
  { value: "all", label: "ทั้งหมด" },
];
const PERIOD_TEXT: Record<Period, string> = { today: "วันนี้", week: "สัปดาห์นี้", month: "เดือนนี้", year: "ปีนี้", all: "ทั้งหมด" };

export default function Dashboard() {
  const app = useApp();
  const { currency, pnl } = app;
  const [period, setPeriod] = useState<Period>("month");

  const lots = useMemo(() => filterByPeriod(pnl.closed, period), [pnl.closed, period]);
  const s = useMemo(() => summarize(lots, currency), [lots, currency]);
  const curve = useMemo(() => equityCurve(lots, currency), [lots, currency]);
  const symbols = useMemo(() => groupPnl(lots, currency, (l) => l.symbol), [lots, currency]);
  const recent = useMemo(() => roundTrips(lots, currency).sort((a, b) => b.sellAt.localeCompare(a.sellAt)).slice(0, 5), [lots, currency]);
  const allDaily = useMemo(() => dailyPnl(pnl.closed, currency), [pnl.closed, currency]);
  const allCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of roundTrips(pnl.closed, currency)) {
      const k = localDay(r.sellAt);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [pnl.closed, currency]);

  const cost = lots.reduce((sum, l) => sum + (currency === "USD" ? l.costUsd : l.costThb), 0);
  const quotes = usePrices(pnl.open.map((o) => o.symbol));
  const live = useMemo(() => totals(valuePositions(pnl.open, quotes.prices, app.latestFx)), [pnl.open, quotes.prices, app.latestFx]);
  const openCost = pnl.open.reduce((sum, o) => sum + (currency === "USD" ? o.costUsd : o.costThb), 0);
  const grossWin = s.avgWin * s.wins;
  const grossLoss = s.avgLoss * s.losses;
  const ratio = s.avgLoss !== 0 ? s.avgWin / Math.abs(s.avgLoss) : null;
  const feesShown = currency === "USD" ? s.feesUsd : s.feesUsd * app.latestFx;
  const today = new Date().toLocaleDateString("th-TH", { month: "long", year: "numeric" });

  if (!app.loading && app.trades.length === 0) {
    return (
      <>
        <PageHeader eyebrow="พื้นที่เทรดส่วนตัวของคุณ" title="ภาพรวม" />
        <ErrorBox error={app.error} />
        <Empty icon={Upload} title="ยังไม่มีข้อมูล">
          เริ่มจาก{" "}
          <Link href="/import" className="text-accent underline underline-offset-2">
            นำเข้าไฟล์จากโบรก
          </Link>{" "}
          หรือ{" "}
          <Link href="/trades" className="text-accent underline underline-offset-2">
            เพิ่มรายการเอง
          </Link>
        </Empty>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow={today} title="ภาพรวม">
        <Segmented label="ช่วงเวลา" value={period} onChange={setPeriod} options={PERIODS} />
        <CurrencyToggle value={currency} onChange={app.setCurrency} />
      </PageHeader>
      <ErrorBox error={app.error} />

      {pnl.warnings.length > 0 && (
        <Link href="/trades" className="card flex items-center gap-2.5 text-[13px] text-loss">
          <TriangleAlert size={16} className="shrink-0" aria-hidden="true" />
          มี {pnl.warnings.length} รายการที่ขายเกินจำนวนที่ถือ ตัวเลขอาจไม่ครบ
          <ArrowRight size={14} className="ml-auto shrink-0" aria-hidden="true" />
        </Link>
      )}

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[0.82fr_1.5fr]">
        <section className="card flex flex-col">
          <div className="panel-title">
            <span>กำไร/ขาดทุนสุทธิ · {PERIOD_TEXT[period]}</span>
            <Wallet size={17} strokeWidth={1.7} className="opacity-70" aria-hidden="true" />
          </div>
          <strong className={`big-number text-[38px] whitespace-nowrap sm:text-[42px] ${tone(s.net)}`}>{money(s.net, currency, { sign: true })}</strong>
          <p className="mt-2.5 text-[11px] text-muted">
            {cost > 0 && <span className={`tag mr-1.5 ${s.net >= 0 ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss"}`}>{(s.net >= 0 ? "+" : "") + ((s.net / cost) * 100).toFixed(2)}%</span>}
            ของทุนที่ใช้ · หักค่าธรรมเนียมแล้ว · {s.trades} เทรด
          </p>
          <Link href="/trades" className="mt-auto flex items-center gap-2.5 pt-8">
            <span className="grid h-9 w-9 place-items-center rounded-[10px]" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)" }}>
              <Briefcase size={18} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <span className="flex flex-col">
              <strong className="text-xs font-medium">ถืออยู่ {pnl.open.length} ตัว</strong>
              <span className="text-[11px] text-muted">
                {live.priced > 0 ? (
                  <>
                    มูลค่า {money(currency === "USD" ? live.marketUsd : live.marketUsd * app.latestFx, currency)} ·{" "}
                    <span className={tone(live.unrealizedUsd)}>{money(currency === "USD" ? live.unrealizedUsd : live.unrealizedThb, currency, { sign: true })} ยังไม่ได้ขาย</span>
                  </>
                ) : (
                  <>ทุน {money(openCost, currency)}</>
                )}
              </span>
            </span>
            <span className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-bg">
              <ArrowUpRight size={18} aria-hidden="true" />
            </span>
          </Link>
        </section>

        <section className="card">
          <div className="panel-title">
            <h2>กำไรสะสม</h2>
          </div>
          <div className="mb-4 flex gap-8">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[11px] text-muted">
                <i className="dot bg-gain" />
                ไม้กำไรรวม
              </span>
              <strong className="big-number text-xl">{money(grossWin, currency)}</strong>
            </div>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[11px] text-muted">
                <i className="dot bg-loss" />
                ไม้ขาดทุนรวม
              </span>
              <strong className="big-number text-xl">{money(Math.abs(grossLoss), currency)}</strong>
            </div>
          </div>
          {curve.length ? <EquityChart data={curve} currency={currency} /> : <div className="py-14 text-center text-[13px] text-muted">ไม่มีไม้ที่ปิดในช่วงนี้</div>}
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat icon={Percent} label="Win rate" value={pct(s.winRate)} sub={`ชนะ ${s.wins} · แพ้ ${s.losses}`} />
        <Stat icon={Scale} label="Profit factor" value={s.profitFactor == null ? "—" : s.profitFactor.toFixed(2)} sub="กำไรรวม ÷ ขาดทุนรวม" />
        <Stat
          icon={TrendingUp}
          label="กำไรเฉลี่ย ÷ ขาดทุนเฉลี่ย"
          value={ratio == null ? "—" : ratio.toFixed(2)}
          sub={
            <>
              <span className="text-gain">{money(s.avgWin, currency, { sign: true })}</span> / <span className="text-loss">{money(s.avgLoss, currency, { sign: true })}</span>
            </>
          }
        />
        <Stat icon={Coins} label="ค่าธรรมเนียมที่จ่าย" value={money(feesShown, currency)} sub={`ไม้ที่ปิด${PERIOD_TEXT[period] === "ทั้งหมด" ? "ทั้งหมด" : PERIOD_TEXT[period]}`} />
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="card">
          <div className="panel-title">
            <h2>ไม้ล่าสุด</h2>
            <Link href="/trades" className="btn-ghost">
              ดูทั้งหมด <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-muted">ไม่มีไม้ที่ปิดในช่วงนี้</div>
          ) : (
            <div>
              {recent.map((r) => (
                <div key={r.sellTradeId} className="flex items-center gap-3 border-t border-border py-2.5 first:border-0 first:pt-0 last:pb-0">
                  <Ticker symbol={r.symbol} size={34} className="flex-1 text-[13px]" sub={r.sellTradeId.startsWith("expired:") ? "หมดอายุ " + tradeTime(r.sellAt) : "ขาย " + tradeTime(r.sellAt)} />
                  <strong className={`flex items-center gap-1 text-[13px] font-medium whitespace-nowrap ${tone(r.pnl)}`}>
                    {r.pnl >= 0 ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownRight size={14} aria-hidden="true" />}
                    {money(r.pnl, currency, { sign: true })}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="panel-title">
            <h2>ผลตามหุ้น</h2>
            <span className="text-[11px]">{symbols.length} ตัว</span>
          </div>
          {symbols.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-muted">—</div>
          ) : (
            <SymbolBars rows={symbols} currency={currency} />
          )}
        </section>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[3fr_2fr]">
        <PnlCalendar daily={allDaily} counts={allCounts} currency={currency} />
        <section className="card">
          <div className="panel-title">
            <h2>กำไร/ขาดทุนรายวัน</h2>
            <span className="text-[11px]">{PERIOD_TEXT[period]}</span>
          </div>
          {curve.length ? <DailyBars data={curve} currency={currency} /> : <div className="py-14 text-center text-[13px] text-muted">ไม่มีไม้ที่ปิดในช่วงนี้</div>}
        </section>
      </div>
    </>
  );
}

/** 5 ตัวที่ดีที่สุด และ 5 ตัวที่แย่ที่สุด เป็นแถบยาวตามขนาดกำไร/ขาดทุน */
function SymbolBars({ rows, currency }: { rows: ReturnType<typeof groupPnl>; currency: "USD" | "THB" }) {
  const shown = rows.length > 10 ? [...rows.slice(0, 5), null, ...rows.slice(-5)] : rows;
  const max = Math.max(1e-9, ...rows.map((r) => Math.abs(r.pnl)));
  return (
    <div className="space-y-3">
      {shown.map((g, i) =>
        g ? (
          <div key={g.key}>
            <div className="flex items-center gap-2 text-xs">
              <TickerLogo symbol={g.key} size={20} />
              <strong className="font-medium">{tickerLabel(g.key)}</strong>
              <span className="text-[11px] text-muted">
                {g.count} เทรด · win {pct(g.wins / g.count)}
              </span>
              <strong className={`ml-auto font-medium ${tone(g.pnl)}`}>{money(g.pnl, currency, { sign: true })}</strong>
            </div>
            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-[var(--border)]">
              <i className={`block h-full rounded-full ${g.pnl >= 0 ? "bg-gain" : "bg-loss"}`} style={{ width: `${(Math.abs(g.pnl) / max) * 100}%` }} />
            </span>
          </div>
        ) : (
          <div key={"gap" + i} className="text-center text-[11px] text-muted">
            ⋯
          </div>
        ),
      )}
    </div>
  );
}
