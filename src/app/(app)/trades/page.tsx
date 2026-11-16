"use client";

import { useMemo, useState } from "react";
import TradeForm from "@/components/TradeForm";
import { Briefcase, CalendarClock, Pencil, Plus, Search, Trash2, TriangleAlert } from "lucide-react";
import { Ticker } from "@/components/Ticker";
import { CurrencyToggle, Empty, ErrorBox, Note, PageHeader, Segmented, Sheet } from "@/components/ui";
import { deleteTrade } from "@/lib/data";
import { holding, money, price, qty, tone, tradeTime } from "@/lib/format";
import { parseOption } from "@/lib/options";
import { useApp } from "@/lib/useApp";
import type { Trade } from "@/lib/types";

type Tab = "all" | "closed" | "open";

export default function TradesPage() {
  const app = useApp();
  const { currency, pnl } = app;
  const [tab, setTab] = useState<Tab>("closed");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Trade | "new" | null>(null);
  const closeSheet = () => setEditing(null);

  const query = q.trim().toUpperCase();
  const match = (s: string) => !query || s.includes(query);

  const all = useMemo(() => [...app.trades].reverse().filter((t) => match(t.symbol)), [app.trades, query]); // eslint-disable-line react-hooks/exhaustive-deps
  const closed = pnl.closed.filter((l) => match(l.symbol));
  const open = pnl.open.filter((o) => match(o.symbol));

  async function remove(t: Trade) {
    if (!confirm(`ลบรายการ ${t.side === "BUY" ? "ซื้อ" : "ขาย"} ${t.symbol} ${qty(t.qty)} หุ้น?`)) return;
    await deleteTrade(t.id);
    app.reload();
  }

  return (
    <>
      <PageHeader eyebrow="ทุกการซื้อขายและไม้ที่ปิดแล้ว" title="รายการซื้อขาย">
        <CurrencyToggle value={currency} onChange={app.setCurrency} />
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          <Plus size={15} aria-hidden="true" />
          เพิ่มรายการ
        </button>
      </PageHeader>
      <ErrorBox error={app.error} />
      {pnl.warnings.length > 0 && (
        <Note icon={TriangleAlert} tone="loss">
          <div className="space-y-1">
            {pnl.warnings.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
        </Note>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="มุมมอง"
          value={tab}
          onChange={setTab}
          options={[
            { value: "closed", label: `ปิดแล้ว (${closed.length})` },
            { value: "open", label: `ถืออยู่ (${open.length})` },
            { value: "all", label: `ทั้งหมด (${all.length})` },
          ]}
        />
        <label className="relative">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input className="input w-44 !py-1.5 pl-8" placeholder="ค้นหาหุ้น" aria-label="ค้นหาหุ้น" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {app.loading ? (
        <Empty>กำลังโหลด…</Empty>
      ) : tab === "closed" ? (
        closed.length === 0 ? (
          <Empty title={query ? "ไม่พบหุ้นที่ค้นหา" : "ยังไม่มีไม้ที่ปิด"}>{query ? "ลองพิมพ์ชื่อหุ้นอื่น" : "เพิ่มรายการซื้อและขาย หรือนำเข้าไฟล์จากโบรก"}</Empty>
        ) : (
          <div className="card p-0 overflow-x-auto">
            <table className="data w-full text-[13px]">
              <thead>
                <tr>
                  <th className="p-3">หุ้น</th>
                  <th className="p-3">ขายเมื่อ</th>
                  <th className="p-3 text-right">จำนวน</th>
                  <th className="p-3 text-right hidden sm:table-cell">ซื้อ → ขาย</th>
                  <th className="p-3 text-right hidden md:table-cell">ถือ</th>
                  <th className="p-3 hidden md:table-cell">กลยุทธ์</th>
                  <th className="p-3 text-right">กำไร/ขาดทุน</th>
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
                          sub={l.expired ? <span className="text-loss">หมดอายุโดยไม่มีมูลค่า</span> : undefined}
                        />
                      </td>
                      <td className="p-3 text-muted whitespace-nowrap">{tradeTime(l.sellAt)}</td>
                      <td className="p-3 text-right">{qty(l.qty)}</td>
                      <td className="p-3 text-right hidden sm:table-cell whitespace-nowrap">
                        {price(l.buyPrice)} → {l.expired ? "หมดอายุ" : price(l.sellPrice)}
                      </td>
                      <td className="p-3 text-right hidden md:table-cell text-muted">{holding(l.holdingMinutes)}</td>
                      <td className="p-3 hidden md:table-cell text-muted">{l.strategyTag ?? "—"}</td>
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
          <Empty icon={Briefcase} title="ไม่มีหุ้นที่ถืออยู่" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((o) => {
              const opt = parseOption(o.symbol);
              return (
                <div key={o.symbol} className="card">
                  <div className="flex items-start justify-between gap-2">
                    <Ticker symbol={o.symbol} size={34} className="text-[15px]" />
                    <span className="text-muted text-xs whitespace-nowrap pt-1">
                      {qty(o.qty)} {opt ? "สัญญา" : "หุ้น"}
                    </span>
                  </div>
                  <div className="big-number mt-3 text-[22px]">{money(currency === "USD" ? o.costUsd : o.costThb, currency)}</div>
                  <div className="mt-1 text-xs text-muted">ทุนรวม · เฉลี่ย {price(o.avgCostUsd)} ต่อ{opt ? "สัญญา" : "หุ้น"}</div>
                  <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-[11px] text-muted">
                    <CalendarClock size={13} aria-hidden="true" />
                    ซื้อครั้งแรก {tradeTime(o.firstBuyAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : all.length === 0 ? (
        <Empty title={query ? "ไม่พบหุ้นที่ค้นหา" : "ยังไม่มีรายการ"} />
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="data w-full text-[13px]">
            <thead>
              <tr>
                <th className="p-3">วันเวลา</th>
                <th className="p-3">หุ้น</th>
                <th className="p-3 text-right">จำนวน</th>
                <th className="p-3 text-right">ราคา</th>
                <th className="p-3 text-right hidden sm:table-cell">ค่าธรรมเนียม</th>
                <th className="p-3 text-right hidden md:table-cell">฿/$</th>
                <th className="p-3 hidden lg:table-cell">โน้ต</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {all.map((t) => (
                <tr key={t.id}>
                  <td className="p-3 text-muted whitespace-nowrap">{tradeTime(t.executed_at)}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="flex items-center gap-2.5">
                      <Ticker symbol={t.symbol} size={26} />
                      <span className={`tag ${t.side === "BUY" ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss"}`}>{t.side === "BUY" ? "ซื้อ" : "ขาย"}</span>
                    </span>
                  </td>
                  <td className="p-3 text-right">{qty(t.qty)}</td>
                  <td className="p-3 text-right">{price(t.price_usd)}</td>
                  <td className="p-3 text-right hidden sm:table-cell text-muted">{price(t.fee_usd)}</td>
                  <td className="p-3 text-right hidden md:table-cell text-muted">{t.fx_rate ? Number(t.fx_rate).toFixed(2) : "—"}</td>
                  <td className="p-3 hidden lg:table-cell text-muted max-w-60 truncate">{t.note}</td>
                  <td className="p-1.5 text-right whitespace-nowrap">
                    <button className="icon-btn inline-grid h-8 w-8 text-muted" onClick={() => setEditing(t)} aria-label={`แก้ไข ${t.symbol}`} title="แก้ไข">
                      <Pencil size={14} />
                    </button>
                    <button className="icon-btn inline-grid h-8 w-8 text-muted hover:text-loss" onClick={() => remove(t)} aria-label={`ลบ ${t.symbol}`} title="ลบ">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={editing !== null} onClose={closeSheet} title={editing === "new" ? "เพิ่มรายการ" : "แก้ไขรายการ"}>
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
