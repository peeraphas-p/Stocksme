// สรุปบัญชีของผู้ใช้เป็นข้อความสั้นๆ ให้ผู้ช่วย AI ใช้ตอบคำถาม (ส่งไปเฉพาะตอนผู้ใช้ถาม)
// ใช้หัวข้อภาษาอังกฤษเสมอ — โมเดลตอบตามภาษาที่ผู้ใช้เลือกเอง
import type { CashSummary } from "./cash";
import type { ClosedLot, OpenPosition } from "./pnl";
import type { Valued } from "./prices";
import { groupPnl, NONE_KEY, roundTrips, rSummary, summarize, yearlySummary } from "./stats";
import type { JournalEntry } from "./types";

export interface AiContextInput {
  now: Date;
  closed: ClosedLot[];
  open: (OpenPosition | Valued)[];
  latestFx: number;
  cash?: { summary: CashSummary; dividends: { symbol: string; net: number }[] } | null;
  journal?: JournalEntry[];
  strategyTags?: string[];
}

const usd = (v: number) => `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const thb = (v: number) => `${v < 0 ? "-" : ""}฿${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const day = (iso: string) => iso.slice(0, 10);
const NY_WEEKDAY = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" });
const clip = (s: string | null | undefined, n: number) => (s ? (s.length > n ? s.slice(0, n) + "…" : s).replace(/\s+/g, " ") : "");

function holdBucket(min: number) {
  if (min <= 0) return "same day (date only)";
  if (min < 30) return "under 30 min";
  if (min < 60 * 24) return "30 min to 1 day";
  if (min < 60 * 24 * 7) return "1 to 7 days";
  return "over 7 days";
}

function statsLine(label: string, lots: ClosedLot[]) {
  const u = summarize(lots, "USD");
  if (u.trades === 0) return `${label}: no closed trades`;
  const t = summarize(lots, "THB");
  return (
    `${label}: net ${usd(u.net)} (${thb(t.net)}), ${u.trades} trades, win rate ${pct(u.winRate)} (${u.wins}W/${u.losses}L), ` +
    `avg win ${usd(u.avgWin)}, avg loss ${usd(u.avgLoss)}, profit factor ${u.profitFactor == null ? "n/a" : u.profitFactor.toFixed(2)}, ` +
    `best ${usd(u.best)}, worst ${usd(u.worst)}, fees ${usd(u.feesUsd)}`
  );
}

function groupLines(lots: ClosedLot[], key: (l: ClosedLot) => string | null, limit = 40) {
  const rows = groupPnl(lots, "USD", key);
  const shown = rows.slice(0, limit).map((g) => `- ${g.key === NONE_KEY ? "(not set)" : g.key}: ${usd(g.pnl)}, ${g.count} trades, ${g.wins} wins`);
  if (rows.length > limit) shown.push(`- …and ${rows.length - limit} more`);
  return shown.length ? shown : ["- none"];
}

export function buildAiContext(i: AiContextInput): string {
  const { now, closed } = i;
  const since = (d: Date) => closed.filter((l) => new Date(l.sellAt) >= d);
  const y = now.getFullYear();
  const m = now.getMonth();
  const out: string[] = [];

  out.push(`Today: ${now.toISOString().slice(0, 10)}. Latest exchange rate: ${i.latestFx.toFixed(2)} THB per USD.`);
  out.push(`Closed trades recorded: ${roundTrips(closed, "USD").length}${closed.length ? `, from ${day(closed.reduce((a, l) => (l.sellAt < a ? l.sellAt : a), closed[0].sellAt))} to ${day(closed.reduce((a, l) => (l.sellAt > a ? l.sellAt : a), closed[0].sellAt))}` : ""}.`);

  out.push("", "## Realized results (net of fees)");
  out.push(statsLine("All time", closed));
  out.push(statsLine("This year", since(new Date(y, 0, 1))));
  out.push(statsLine("This month", since(new Date(y, m, 1))));
  out.push(statsLine("Last 30 days", since(new Date(now.getTime() - 30 * 86400000))));

  out.push("", "## By month (last 12 months, sell date)");
  for (let k = 11; k >= 0; k--) {
    const start = new Date(y, m - k, 1);
    const end = new Date(y, m - k + 1, 1);
    const lots = closed.filter((l) => {
      const d = new Date(l.sellAt);
      return d >= start && d < end;
    });
    const s = summarize(lots, "USD");
    if (s.trades) out.push(`- ${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}: ${usd(s.net)}, ${s.trades} trades, win rate ${pct(s.winRate)}`);
  }

  out.push("", "## By year (USD and THB)");
  for (const r of yearlySummary(closed)) out.push(`- ${r.year}: ${usd(r.netUsd)} (${thb(r.netThb)}), ${r.trades} trades, fees ${usd(r.feesUsd)}`);

  out.push("", "## By stock (all time, best first)");
  out.push(...groupLines(closed, (l) => l.symbol, 60));
  out.push("", "## By strategy");
  out.push(...groupLines(closed, (l) => l.strategyTag));
  if (i.strategyTags?.length) out.push(`Strategies the user defined: ${i.strategyTags.join(", ")}`);
  out.push("", "## By emotion when trading");
  out.push(...groupLines(closed, (l) => l.emotion));
  out.push("", "## By weekday of entry (New York time)");
  out.push(...groupLines(closed, (l) => NY_WEEKDAY.format(new Date(l.buyAt))));
  out.push("", "## By holding time");
  out.push(...groupLines(closed, (l) => holdBucket(l.holdingMinutes)));

  const r = rSummary(closed);
  out.push("", "## Risk plan (stop-loss set at purchase)");
  out.push(
    r.planned
      ? `${r.planned} of ${r.total} trades had a stop. Average R ${r.avgR == null ? "n/a" : r.avgR.toFixed(2)}, ${r.overLoss} lost more than planned, ${r.bigWins} made 2R or more.`
      : "No trades have a stop-loss recorded.",
  );

  out.push("", "## Recent closed trades (newest first)");
  const recent = roundTrips(closed, "USD").sort((a, b) => b.sellAt.localeCompare(a.sellAt)).slice(0, 25);
  out.push(...(recent.length ? recent.map((t) => `- ${day(t.sellAt)} ${t.symbol}: ${usd(t.pnl)}`) : ["- none"]));

  out.push("", "## Open positions");
  if (!i.open.length) out.push("- none");
  for (const o of i.open.slice(0, 40)) {
    const v = o as Valued;
    const live = v.marketUsd != null ? `, market value ${usd(v.marketUsd)}, unrealized ${usd(v.unrealizedUsd ?? 0)}${v.unrealizedPct != null ? ` (${pct(v.unrealizedPct)})` : ""}` : ", no live price";
    out.push(`- ${o.symbol}: ${+o.qty.toFixed(6)} units, avg cost ${usd(o.avgCostUsd)}, cost ${usd(o.costUsd)} (${thb(o.costThb)})${live}, first bought ${day(o.firstBuyAt)}`);
  }

  if (i.cash) {
    const c = i.cash.summary;
    out.push("", "## Cash account");
    out.push(
      `Net deposits ${usd(c.netDepositUsd)}${c.netDepositThb == null ? "" : ` (${thb(c.netDepositThb)})`}, dividends ${usd(c.dividendsUsd)}, withholding tax ${usd(c.taxUsd)}, ` +
        `interest ${usd(c.interestUsd)}, other fees ${usd(c.otherFeesUsd)}, net income ${usd(c.incomeNetUsd)}, estimated cash left ${usd(c.cashUsd)}`,
    );
    if (i.cash.dividends.length) out.push(`Net dividends by stock: ${i.cash.dividends.slice(0, 30).map((d) => `${d.symbol} ${usd(d.net)}`).join(", ")}`);
  }

  if (i.journal?.length) {
    out.push("", "## Recent journal entries (the user's own notes)");
    for (const j of i.journal.slice(0, 10)) {
      const parts = [
        j.symbol && `stock ${j.symbol}`,
        j.strategy_tag && `strategy ${j.strategy_tag}`,
        j.emotion && `emotion ${j.emotion}`,
        j.rating && `discipline ${j.rating}/5`,
        j.plan && `plan: ${clip(j.plan, 200)}`,
        j.result && `result: ${clip(j.result, 200)}`,
        j.lesson && `lesson: ${clip(j.lesson, 200)}`,
      ].filter(Boolean);
      out.push(`- ${j.entry_date}: ${parts.join("; ")}`);
    }
  }

  return out.join("\n");
}
