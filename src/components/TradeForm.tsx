"use client";

import { useEffect, useState } from "react";
import { insertTrade, updateTrade } from "@/lib/data";
import { fetchFxRates, usMarketDay } from "@/lib/fx";
import { EMOTIONS, type NewTrade, type Side, type Trade } from "@/lib/types";

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
            {s === "BUY" ? "ซื้อ" : "ขาย"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="field col-span-2">
          <span>หุ้น (Symbol)</span>
          <input required value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="NVDA" autoCapitalize="characters" />
        </label>
        <label className="field">
          <span>จำนวนหุ้น</span>
          <input required inputMode="decimal" type="number" step="any" min="0" value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
        <label className="field">
          <span>ราคา (USD)</span>
          <input required inputMode="decimal" type="number" step="any" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="field">
          <span>ค่าธรรมเนียม (USD)</span>
          <input inputMode="decimal" type="number" step="any" min="0" value={fee} onChange={(e) => setFee(e.target.value)} />
        </label>
        <label className="field">
          <span>อัตรา ฿/$</span>
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
            placeholder="อัตโนมัติ"
          />
        </label>
        <label className="field col-span-2">
          <span>วันเวลา</span>
          <input required type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
        </label>
        <label className="field">
          <span>กลยุทธ์</span>
          <select value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">—</option>
            {[...new Set([...strategyTags, ...(tag ? [tag] : [])])].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>อารมณ์ตอนเทรด</span>
          <select value={emotion} onChange={(e) => setEmotion(e.target.value)}>
            <option value="">—</option>
            {EMOTIONS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>โบรกเกอร์</span>
          <select value={broker} onChange={(e) => setBroker(e.target.value)}>
            <option value="">—</option>
            <option>Webull</option>
            <option>Dime!</option>
            <option>Liberator</option>
            <option>อื่นๆ</option>
          </select>
        </label>
        <div className="field">
          <span>มูลค่า</span>
          <div className="py-2 font-medium">{Number.isFinite(total) ? "$" + total.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}</div>
        </div>
        <label className="field col-span-2">
          <span>โน้ต / เหตุผล</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      {err && <p className="text-sm text-loss">{err}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "กำลังบันทึก…" : trade ? "บันทึกการแก้ไข" : "เพิ่มรายการ"}
      </button>
    </form>
  );
}
