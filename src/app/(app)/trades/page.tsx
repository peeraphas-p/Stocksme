"use client";

import { useMemo, useState } from "react";
import TradeForm from "@/components/TradeForm";
import { Briefcase, CalendarClock, Pencil, Plus, Search, Trash2, TriangleAlert } from "lucide-react";
import { Ticker } from "@/components/Ticker";
import { CurrencyToggle, Empty, ErrorBox, Note, PageHeader, Segmented, Sheet, Skeleton } from "@/components/ui";
import { deleteTrade } from "@/lib/data";
import { money, price, qty, tone } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { parseOption } from "@/lib/options";
import { usePrices, valuePositions } from "@/lib/prices";
import { useApp } from "@/lib/useApp";
import type { Trade } from "@/lib/types";

type Tab = "all" | "closed" | "open";

export default function TradesPage() {
  const app = useApp();
  const { currency, pnl } = app;
  const { m, t: fill, fmt } = useI18n();
  const x = m.trades;
  const [tab, setTab] = useState<Tab>("closed");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Trade | "new" | null>(null);
  const closeSheet = () => setEditing(null);

  const query = q.trim().toUpperCase();
  const match = (s: string) => !query || s.includes(query);

  const all = useMemo(() => [...app.trades].reverse().filter((t) => match(t.symbol)), [app.trades, query]); // eslint-disable-line react-hooks/exhaustive-deps
  const closed = pnl.closed.filter((l) => match(l.symbol));
  const quotes = usePrices(pnl.open.map((o) => o.symbol));
  const valued = useMemo(() => valuePositions(pnl.open, quotes.prices, app.latestFx), [pnl.open, quotes.prices, app.latestFx]);
  const open = valued.filter((o) => match(o.symbol));

  async function remove(t: Trade) {
    if (!confirm(fill(x.confirmDelete, { side: t.side === "BUY" ? m.common.buy : m.common.sell, symbol: t.symbol, qty: qty(t.qty) }))) return;
    await deleteTrade(t.id);
    app.reload();
  }

  return (
    <>
      <PageHeader eyebrow={x.eyebrow} title={x.title}>
        <CurrencyToggle value={currency} onChange={app.setCurrency} />
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          <Plus size={15} aria-hidden="true" />
          {m.common.addItem}
        </button>
      </PageHeader>
      <ErrorBox error={app.error} />
      {pnl.warnings.length > 0 && (
        <Note icon={TriangleAlert} tone="loss">
          <div className="space-y-1">
            {pnl.warnings.map((w) => (
              <div key={w.symbol + w.at}>{fill(x.oversell, { symbol: w.symbol, qty: qty(w.qty), date: fmt.tradeTime(w.at) })}</div>
            ))}
          </div>
        </Note>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label={x.view}
          value={tab}
          onChange={setTab}
          options={[
            { value: "closed", label: fill(x.tabClosed, { n: closed.length }) },
            { value: "open", label: fill(x.tabOpen, { n: open.length }) },
            { value: "all", label: fill(x.tabAll, { n: all.length }) },
          ]}
        />
        <label className="relative">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input className="input w-44 !py-1.5 pl-8" placeholder={x.search} aria-label={x.search} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {app.loading ? (
        <Skeleton rows={7} />
      ) : tab === "closed" ? (
        closed.length === 0 ? (
          <Empty title={query ? x.notFound : x.noClosed}>{query ? x.tryOther : x.noClosedHint}</Empty>
        ) : (
          <div className="card p-0 overflow-x-auto">
            <table className="data w-full text-[13px]">
              <thead>
                <tr>
                  <th className="p-3">{m.common.stock}</th>
                  <th className="p-3">{x.colSoldAt}</th>
                  <th className="p-3 text-right">{m.common.qty}</th>
                  <th className="p-3 text-right hidden sm:table-cell">{x.colBuySell}</th>
                  <th className="p-3 text-right hidden md:table-cell">{x.colHeld}</th>
                  <th className="p-3 hidden md:table-cell">{m.common.strategy}</th>
                  <th className="p-3 text-right hidden lg:table-cell" title={x.colRTitle}>R</th>
                  <th className="p-3 text-right">{x.colPnl}</th>
                </tr>
              </thead>
              <tbody>
                {closed.map((l, i) => {
                  const v = currency === "USD" ? l.pnlUsd : l.pnlThb;
                  const cost = currency === "USD" ? l.costUsd : l.costThb;
                  return (
                    <tr key={i}>
                      <td className="p-3">
                        <Ticker
                          symbol={l.symbol}
                          sub={l.expired ? <span className="text-loss">{x.expiredWorthless}</span> : undefined}
                        />
                      </td>
                      <td className="p-3 text-muted whitespace-nowrap">{fmt.tradeTime(l.sellAt)}</td>
                      <td className="p-3 text-right">{qty(l.qty)}</td>
                      <td className="p-3 text-right hidden sm:table-cell whitespace-nowrap">
                        {price(l.buyPrice)} → {l.expired ? x.expired : price(l.sellPrice)}
                      </td>
                      <td className="p-3 text-right hidden md:table-cell text-muted">{fmt.holding(l.holdingMinutes)}</td>
                      <td className="p-3 hidden md:table-cell text-muted">{l.strategyTag ?? "—"}</td>
                      <td className={`p-3 text-right hidden lg:table-cell whitespace-nowrap ${l.rMultiple == null ? "text-muted" : tone(l.rMultiple)}`}>
                        {l.rMultiple == null ? "—" : `${l.rMultiple > 0 ? "+" : ""}${l.rMultiple.toFixed(1)}R`}
                      </td>
                      <td className={`p-3 text-right font-medium whitespace-nowrap ${tone(v)}`}>
                        {money(v, currency, { sign: true })}
                        <div className="text-[11px] font-normal opacity-80">{cost ? ((v / cost) * 100).toFixed(2) + "%" : ""}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : tab === "open" ? (
        open.length === 0 ? (
          <Empty icon={Briefcase} title={x.noOpen} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((o) => {
              const opt = parseOption(o.symbol);
              return (
                <div key={o.symbol} className="card">
                  <div className="flex items-start justify-between gap-2">
                    <Ticker symbol={o.symbol} size={34} className="text-[15px]" />
                    <span className="text-muted text-xs whitespace-nowrap pt-1">
                      {qty(o.qty)} {opt ? m.common.contracts : m.common.shares}
                    </span>
                  </div>
                  {o.marketUsd != null ? (
                    <>
                      <div className="big-number mt-3 text-[22px]">{money(currency === "USD" ? o.marketUsd : o.marketUsd * app.latestFx, currency)}</div>
                      <div className={`mt-1 text-xs font-medium ${tone(o.unrealizedUsd!)}`}>
                        {money(currency === "USD" ? o.unrealizedUsd! : o.unrealizedThb!, currency, { sign: true })}
                        {o.unrealizedPct != null && ` (${o.unrealizedPct >= 0 ? "+" : ""}${(o.unrealizedPct * 100).toFixed(2)}%)`}
                        <span className="font-normal text-muted"> {m.common.unrealized}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted">
                        <span>
                          {x.latestPrice} <b className="font-medium text-fg">{price(o.quote!.price)}</b>
                          {o.dayChangeUsd != null && <span className={tone(o.dayChangeUsd)}> {o.dayChangeUsd >= 0 ? "▲" : "▼"}</span>}
                        </span>
                        <span>
                          {fill(x.costAvg, { c: money(currency === "USD" ? o.costUsd : o.costThb, currency), a: price(o.avgCostUsd) })}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="big-number mt-3 text-[22px]">{money(currency === "USD" ? o.costUsd : o.costThb, currency)}</div>
                      <div className="mt-1 text-xs text-muted">
                        {fill(x.costTotalAvg, { a: price(o.avgCostUsd), unit: opt ? m.common.contracts : m.common.shares })}
                        {!opt && " · " + (quotes.loading ? x.loadingPrice : x.noPrice)}
                      </div>
                    </>
                  )}
                  <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-[11px] text-muted">
                    <CalendarClock size={13} aria-hidden="true" />
                    {fill(x.firstBuy, { d: fmt.tradeTime(o.firstBuyAt) })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : all.length === 0 ? (
        <Empty title={query ? x.notFound : x.noTrades} />
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="data w-full text-[13px]">
            <thead>
              <tr>
                <th className="p-3">{m.common.datetime}</th>
                <th className="p-3">{m.common.stock}</th>
                <th className="p-3 text-right">{m.common.qty}</th>
                <th className="p-3 text-right">{m.common.price}</th>
                <th className="p-3 text-right hidden sm:table-cell">{m.common.fee}</th>
                <th className="p-3 text-right hidden md:table-cell">{m.common.fx}</th>
                <th className="p-3 hidden lg:table-cell">{m.common.note}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {all.map((t) => (
                <tr key={t.id}>
                  <td className="p-3 text-muted whitespace-nowrap">{fmt.tradeTime(t.executed_at)}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="flex items-center gap-2.5">
                      <Ticker symbol={t.symbol} size={26} />
                      <span className={`tag ${t.side === "BUY" ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss"}`}>{t.side === "BUY" ? m.common.buy : m.common.sell}</span>
                    </span>
                  </td>
                  <td className="p-3 text-right">{qty(t.qty)}</td>
                  <td className="p-3 text-right">{price(t.price_usd)}</td>
                  <td className="p-3 text-right hidden sm:table-cell text-muted">{price(t.fee_usd)}</td>
                  <td className="p-3 text-right hidden md:table-cell text-muted">{t.fx_rate ? Number(t.fx_rate).toFixed(2) : "—"}</td>
                  <td className="p-3 hidden lg:table-cell text-muted max-w-60 truncate">{t.note}</td>
                  <td className="p-1.5 text-right whitespace-nowrap">
                    <button className="icon-btn inline-grid h-8 w-8 text-muted" onClick={() => setEditing(t)} aria-label={fill(x.editAria, { s: t.symbol })} title={m.common.edit}>
                      <Pencil size={14} />
                    </button>
                    <button className="icon-btn inline-grid h-8 w-8 text-muted hover:text-loss" onClick={() => remove(t)} aria-label={fill(x.deleteAria, { s: t.symbol })} title={m.common.delete}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={editing !== null} onClose={closeSheet} title={editing === "new" ? x.addTitle : x.editTitle}>
        {editing !== null && (
          <TradeForm
            key={editing === "new" ? "new" : editing.id}
            trade={editing === "new" ? undefined : editing}
            strategyTags={app.profile.strategy_tags}
            onDone={() => {
              closeSheet();
              app.reload();
            }}
          />
        )}
      </Sheet>
    </>
  );
}
