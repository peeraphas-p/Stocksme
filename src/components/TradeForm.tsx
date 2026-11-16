"use client";

import { useEffect, useState } from "react";
import { insertTrade, updateTrade } from "@/lib/data";
import { fetchFxRates, usMarketDay } from "@/lib/fx";
import { EMOTIONS, type NewTrade, type Side, type Trade } from "@/lib/types";
import { useI18n } from "@/i18n/client";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

/**
 * @param trade  รายการที่กำลังแก้ไข (บันทึกทับ)
 * @param preset ค่าเริ่มต้นสำหรับรายการใหม่ (เช่น ปิดออปชันที่หมดอายุที่ราคา $0)
 */
export default function TradeForm({
  trade,
  preset,
  strategyTags,
  onDone,
}: {
  trade?: Trade;
  preset?: Partial<NewTrade>;
  strategyTags: string[];
  onDone: () => void;
}) {
  const { m, t } = useI18n();
  const init: Partial<NewTrade> | undefined = trade ?? preset;
  const [side, setSide] = useState<Side>(init?.side ?? "BUY");
  const [symbol, setSymbol] = useState(init?.symbol ?? "");
  const [qty, setQty] = useState(init?.qty != null ? String(init.qty) : "");
  const [price, setPrice] = useState(init?.price_usd != null ? String(init.price_usd) : "");
  const [fee, setFee] = useState(init?.fee_usd != null ? String(init.fee_usd) : "0");
  const [at, setAt] = useState(toLocalInput(init?.executed_at ?? new Date().toISOString()));
  const [fx, setFx] = useState(init?.fx_rate != null ? String(init.fx_rate) : "");
  const [fxTouched, setFxTouched] = useState(init?.fx_rate != null);
  const [tag, setTag] = useState(init?.strategy_tag ?? "");
  const [emotion, setEmotion] = useState(init?.emotion ?? "");
  const [note, setNote] = useState(init?.note ?? "");
  const [broker, setBroker] = useState(init?.broker ?? "");
  const [stop, setStop] = useState(init?.stop_price != null ? String(init.stop_price) : "");
  const [target, setTarget] = useState(init?.target_price != null ? String(init.target_price) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // เติมอัตราแลกเปลี่ยนอัตโนมัติตามวันที่
  useEffect(() => {
    if (fxTouched || !at) return;
    const day = usMarketDay(new Date(at).toISOString());
    let cancelled = false;
    fetchFxRates([day]).then(({ rates, latest }) => {
      const r = rates[day] ?? latest;
      if (!cancelled && r) setFx(String(r));
    });
    return () => {
      cancelled = true;
    };
  }, [at, fxTouched]);

  const total = Number(qty) * Number(price);
  // แผนความเสี่ยง: เสียต่อหุ้นถ้าโดน stop / ได้ต่อหุ้นถ้าถึงเป้า
  const p = Number(price);
  const riskPer = stop !== "" && p > 0 ? p - Number(stop) : null;
  const rewardPer = target !== "" && p > 0 ? Number(target) - p : null;
  const riskTotal = riskPer != null && riskPer > 0 && Number(qty) > 0 ? riskPer * Number(qty) : null;
  const rr = riskPer != null && riskPer > 0 && rewardPer != null && rewardPer > 0 ? rewardPer / riskPer : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const row = {
      symbol,
      side,
      qty,
      price_usd: price,
      fee_usd: fee || "0",
      executed_at: new Date(at).toISOString(),
      fx_rate: fx === "" ? null : fx,
      strategy_tag: tag || null,
      emotion: emotion || null,
      note: note || null,
      broker: broker || null,
      // ส่งช่องแผนความเสี่ยงเฉพาะเมื่อมีค่า (หรือกำลังล้างค่าเดิม) — ฐานข้อมูลที่ยังไม่ได้รัน migration 2 จะได้ไม่พัง
      ...(side === "BUY" && (stop !== "" || trade?.stop_price != null) ? { stop_price: stop === "" ? null : stop } : {}),
      ...(side === "BUY" && (target !== "" || trade?.target_price != null) ? { target_price: target === "" ? null : target } : {}),
    };
    try {
      if (trade) await updateTrade(trade.id, row);
      else await insertTrade(row);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String((e as { message?: string }).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {(["BUY", "SELL"] as const).map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => setSide(s)}
            className={`btn ${side === s ? (s === "BUY" ? "bg-gain text-white border-transparent" : "bg-loss text-white border-transparent") : ""}`}
          >
            {s === "BUY" ? m.common.buy : m.common.sell}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="field col-span-2">
          <span>{m.form.symbol}</span>
          <input required value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="NVDA" autoCapitalize="characters" />
        </label>
        <label className="field">
          <span>{m.form.qty}</span>
          <input required inputMode="decimal" type="number" step="any" min="0" value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
        <label className="field">
          <span>{m.form.price}</span>
          <input required inputMode="decimal" type="number" step="any" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="field">
          <span>{m.form.fee}</span>
          <input inputMode="decimal" type="number" step="any" min="0" value={fee} onChange={(e) => setFee(e.target.value)} />
        </label>
        {side === "BUY" && (
          <>
            <label className="field">
              <span>{m.form.stop}</span>
              <input inputMode="decimal" type="number" step="any" min="0" value={stop} onChange={(e) => setStop(e.target.value)} placeholder={m.common.optional} />
            </label>
            <label className="field">
              <span>{m.form.target}</span>
              <input inputMode="decimal" type="number" step="any" min="0" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={m.common.optional} />
            </label>
            {(riskTotal != null || (riskPer != null && riskPer <= 0)) && (
              <p className={`col-span-2 -mt-1 text-xs ${riskPer != null && riskPer <= 0 ? "text-loss" : "text-muted"}`}>
                {riskPer != null && riskPer <= 0
                  ? m.form.stopAbove
                  : t(m.form.risk, { v: "$" + riskTotal!.toLocaleString("en-US", { maximumFractionDigits: 2 }) }) +
                    (rr != null ? t(m.form.reward, { rr: rr.toFixed(2), r1: rr.toFixed(1) }) : "")}
              </p>
            )}
          </>
        )}
        <label className="field">
          <span>{m.form.fx}</span>
          <input
            inputMode="decimal"
            type="number"
            step="any"
            min="0"
            value={fx}
            onChange={(e) => {
              setFx(e.target.value);
              setFxTouched(true);
            }}
            placeholder={m.common.auto}
          />
        </label>
        <label className="field col-span-2">
          <span>{m.common.datetime}</span>
          <input required type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
        </label>
        <label className="field">
          <span>{m.common.strategy}</span>
          <select value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">—</option>
            {[...new Set([...strategyTags, ...(tag ? [tag] : [])])].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{m.form.emotion}</span>
          <select value={emotion} onChange={(e) => setEmotion(e.target.value)}>
            <option value="">—</option>
            {EMOTIONS.map((e) => (
              <option key={e} value={e}>
                {m.emotions[e]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{m.common.broker}</span>
          <select value={broker} onChange={(e) => setBroker(e.target.value)}>
            <option value="">—</option>
            <option>Webull</option>
            <option>Dime!</option>
            <option>Liberator</option>
            <option value="อื่นๆ">{m.common.other}</option>
          </select>
        </label>
        <div className="field">
          <span>{m.form.value}</span>
          <div className="py-2 font-medium">{Number.isFinite(total) ? "$" + total.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}</div>
        </div>
        <label className="field col-span-2">
          <span>{m.form.note}</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      {err && <p className="text-sm text-loss">{err}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? m.common.saving : trade ? m.common.saveEdit : m.common.addItem}
      </button>
    </form>
  );
}
