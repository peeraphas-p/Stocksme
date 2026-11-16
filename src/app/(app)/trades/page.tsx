"use client";

import { useMemo, useState } from "react";
import TradeForm from "@/components/TradeForm";
import { CurrencyToggle, Empty, ErrorBox, PageHeader, Segmented, Sheet } from "@/components/ui";
import { deleteTrade } from "@/lib/data";
import { holding, money, price, qty, tone, tradeTime } from "@/lib/format";
import { usMarketDay } from "@/lib/fx";
import { zonedToIso } from "@/lib/importers";
import { parseOption } from "@/lib/options";
import type { OpenPosition } from "@/lib/pnl";
import { useApp } from "@/lib/useApp";
import type { NewTrade, Trade } from "@/lib/types";

type Tab = "all" | "closed" | "open";

export default function TradesPage() {
  const app = useApp();
  const { currency, pnl } = app;
  const [tab, setTab] = useState<Tab>("closed");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Trade | "new" | null>(null);
  const [preset, setPreset] = useState<Partial<NewTrade> | undefined>();
  const today = usMarketDay(new Date().toISOString());

  const closeSheet = () => {
    setEditing(null);
    setPreset(undefined);
  };

  /** เปิดฟอร์มขายที่ $0 ณ วันหมดอายุ สำหรับออปชันที่หมดอายุโดยไม่มีมูลค่า */
  function closeExpired(o: OpenPosition, expiry: string) {
    const [y, m, d] = expiry.split("-").map(Number);
    setPreset({
      symbol: o.symbol,
      side: "SELL",
      qty: o.qty,
      price_usd: 0,
      fee_usd: 0,
      executed_at: zonedToIso(y, m, d, 16, 0, 0, "America/New_York"),
      note: "ออปชันหมดอายุโดยไม่มีมูลค่า",
    });
    setEditing("new");
  }

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
      <PageHeader title="รายการซื้อขาย">
        <CurrencyToggle value={currency} onChange={app.setCurrency} />
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          + เพิ่ม
        </button>
      </PageHeader>
      <ErrorBox error={app.error} />
      {pnl.warnings.length > 0 && (
        <div className="card text-sm text-loss space-y-1">
          {pnl.warnings.map((w) => (
            <div key={w}>⚠️ {w}</div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "closed", label: `ปิดแล้ว (${closed.length})` },
            { value: "open", label: `ถืออยู่ (${open.length})` },
            { value: "all", label: `ทั้งหมด (${all.length})` },
          ]}
        />
        <input className="input max-w-40" placeholder="ค้นหาหุ้น" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {app.loading ? (
        <Empty>กำลังโหลด…</Empty>
      ) : tab === "closed" ? (
        closed.length === 0 ? (
          <Empty>ยังไม่มีไม้ที่ปิด — เพิ่มรายการซื้อและขาย หรือนำเข้าไฟล์จากโบรก</Empty>
        ) : (
          <div className="card p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted text-left">
                <tr className="border-b border-border">
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
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="p-3 font-bold">{l.symbol}</td>
                      <td className="p-3 text-muted whitespace-nowrap">{tradeTime(l.sellAt)}</td>
                      <td className="p-3 text-right">{qty(l.qty)}</td>
                      <td className="p-3 text-right hidden sm:table-cell whitespace-nowrap">
                        {price(l.buyPrice)} → {price(l.sellPrice)}
                      </td>
                      <td className="p-3 text-right hidden md:table-cell text-muted">{holding(l.holdingMinutes)}</td>
                      <td className="p-3 hidden md:table-cell text-muted">{l.strategyTag ?? "—"}</td>
                      <td className={`p-3 text-right font-bold whitespace-nowrap ${tone(v)}`}>
                        {money(v, currency, { sign: true })}
                        <div className="text-xs font-normal">{cost ? ((v / cost) * 100).toFixed(2) + "%" : ""}</div>
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
          <Empty>ไม่มีหุ้นที่ถืออยู่</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((o) => {
              const opt = parseOption(o.symbol);
              const expired = opt != null && opt.expiry < today;
              return (
                <div key={o.symbol} className="card">
                  <div className="flex justify-between gap-2">
                    <span className="text-lg font-bold break-all">{opt ? `${opt.underlying} ${opt.type} $${opt.strike}` : o.symbol}</span>
                    <span className="text-muted text-sm whitespace-nowrap">
                      {qty(o.qty)} {opt ? "สัญญา" : "หุ้น"}
                    </span>
                  </div>
                  {opt && (
                    <div className="text-xs text-muted">
                      ออปชัน · หมดอายุ {new Date(opt.expiry + "T00:00:00").toLocaleDateString("th-TH", { dateStyle: "medium" })}
                    </div>
                  )}
                  <div className="mt-2 text-sm text-muted">ต้นทุนเฉลี่ย {price(o.avgCostUsd)}</div>
                  <div className="text-sm">ทุนรวม {money(currency === "USD" ? o.costUsd : o.costThb, currency)}</div>
                  <div className="text-xs text-muted mt-1">ซื้อครั้งแรก {tradeTime(o.firstBuyAt)}</div>
                  {expired && (
                    <div className="mt-3 rounded-xl bg-loss-soft p-3 text-xs space-y-2">
                      <div>ออปชันนี้หมดอายุแล้วแต่ยังไม่มีรายการขาย ถ้าหมดอายุโดยไม่มีมูลค่า ให้บันทึกขายที่ $0 เพื่อนับเป็นขาดทุน</div>
                      <button className="btn" onClick={() => closeExpired(o, opt.expiry)}>
                        บันทึกหมดอายุที่ $0
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : all.length === 0 ? (
        <Empty>ยังไม่มีรายการ</Empty>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted text-left">
              <tr className="border-b border-border">
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
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="p-3 text-muted whitespace-nowrap">{tradeTime(t.executed_at)}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`mr-2 rounded px-1.5 py-0.5 text-xs font-bold ${t.side === "BUY" ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss"}`}>
                      {t.side === "BUY" ? "ซื้อ" : "ขาย"}
                    </span>
                    <b>{t.symbol}</b>
                  </td>
                  <td className="p-3 text-right">{qty(t.qty)}</td>
                  <td className="p-3 text-right">{price(t.price_usd)}</td>
                  <td className="p-3 text-right hidden sm:table-cell text-muted">{price(t.fee_usd)}</td>
                  <td className="p-3 text-right hidden md:table-cell text-muted">{t.fx_rate ? Number(t.fx_rate).toFixed(2) : "—"}</td>
                  <td className="p-3 hidden lg:table-cell text-muted max-w-60 truncate">{t.note}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button className="text-accent mr-3 cursor-pointer" onClick={() => setEditing(t)}>
                      แก้
                    </button>
                    <button className="text-loss cursor-pointer" onClick={() => remove(t)}>
                      ลบ
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
            preset={editing === "new" ? preset : undefined}
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
