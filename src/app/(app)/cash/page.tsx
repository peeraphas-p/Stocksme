"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Banknote, Coins, Pencil, PiggyBank, Plus, Trash2, Wallet } from "lucide-react";
import { TickerLogo } from "@/components/Ticker";
import { ErrorBox, Note, PageHeader, Segmented, Sheet, Stat, SkeletonBar } from "@/components/ui";
import { dividendsBySymbol, signedUsd, summarizeCash } from "@/lib/cash";
import { deleteCash, saveCash, useCash } from "@/lib/data";
import { money, tone } from "@/lib/format";
import { useApp } from "@/lib/useApp";
import { CASH_KINDS, type CashKind, type CashMovement } from "@/lib/types";

const LABEL = Object.fromEntries(CASH_KINDS.map((k) => [k.kind, k.label])) as Record<CashKind, string>;
const NEEDS_THB: CashKind[] = ["DEPOSIT", "WITHDRAW"];
const NEEDS_SYMBOL: CashKind[] = ["DIVIDEND", "TAX"];

function CashForm({ entry, onDone }: { entry?: CashMovement; onDone: () => void }) {
  const [kind, setKind] = useState<CashKind>(entry?.kind ?? "DEPOSIT");
  const [date, setDate] = useState(entry?.occurred_on ?? new Date().toLocaleDateString("en-CA"));
  const [usd, setUsd] = useState(entry ? String(entry.amount_usd) : "");
  const [thb, setThb] = useState(entry?.amount_thb != null ? String(entry.amount_thb) : "");
  const [symbol, setSymbol] = useState(entry?.symbol ?? "");
  const [broker, setBroker] = useState(entry?.broker ?? "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rate = Number(usd) > 0 && Number(thb) > 0 ? Number(thb) / Number(usd) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await saveCash(
        {
          kind,
          occurred_on: date,
          amount_usd: usd,
          amount_thb: NEEDS_THB.includes(kind) && thb !== "" ? thb : null,
          symbol: NEEDS_SYMBOL.includes(kind) ? symbol || null : null,
          broker: broker || null,
          note: note || null,
        },
        entry?.id,
      );
      onDone();
    } catch (e) {
      const m = String((e as { message?: string }).message ?? e);
      setErr(m.includes("cash_movements") ? "ฐานข้อมูลยังไม่มีตารางเงินเข้า-ออก — ต้องรัน migration ล่าสุดใน Supabase ก่อน" : m);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="field">
        <span>ประเภท</span>
        <div className="grid grid-cols-3 gap-1.5">
          {CASH_KINDS.map((k) => (
            <button key={k.kind} type="button" onClick={() => setKind(k.kind)} className={`chip justify-center ${kind === k.kind ? "chip-on" : ""}`}>
              {k.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="field">
          <span>วันที่</span>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>จำนวนเงิน (USD)</span>
          <input type="number" inputMode="decimal" step="any" min="0" required value={usd} onChange={(e) => setUsd(e.target.value)} />
        </label>
        {NEEDS_THB.includes(kind) && (
          <label className="field col-span-2">
            <span>จำนวนเงินบาทจริง (ถ้ามี){rate ? ` · อัตรา ${rate.toFixed(4)} ฿/$` : ""}</span>
            <input type="number" inputMode="decimal" step="any" min="0" value={thb} onChange={(e) => setThb(e.target.value)} placeholder="เช่น ยอดที่โอนจากธนาคาร" />
          </label>
        )}
        {NEEDS_SYMBOL.includes(kind) && (
          <label className="field">
            <span>หุ้น</span>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="MSFT" autoCapitalize="characters" />
          </label>
        )}
        <label className="field">
          <span>โบรกเกอร์</span>
          <select value={broker} onChange={(e) => setBroker(e.target.value)}>
            <option value="">—</option>
            <option>Dime!</option>
            <option>Webull</option>
            <option>Liberator</option>
            <option>อื่นๆ</option>
          </select>
        </label>
        <label className="field col-span-2">
          <span>โน้ต</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      {err && <p className="text-sm text-loss">{err}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "กำลังบันทึก…" : entry ? "บันทึกการแก้ไข" : "เพิ่มรายการ"}
      </button>
    </form>
  );
}

export default function CashPage() {
  const app = useApp();
  const cash = useCash();
  const [editing, setEditing] = useState<CashMovement | "new" | null>(null);
  const [filter, setFilter] = useState<"all" | "money" | "income">("all");

  const s = useMemo(() => summarizeCash(cash.data, app.trades), [cash.data, app.trades]);
  const divs = useMemo(() => dividendsBySymbol(cash.data), [cash.data]);
  const realized = app.pnl.closed.reduce((sum, l) => sum + l.pnlUsd, 0);
  const totalReturn = realized + s.incomeNetUsd;
  const rows = cash.data.filter((m) => filter === "all" || (filter === "money" ? NEEDS_THB.includes(m.kind) : !NEEDS_THB.includes(m.kind)));
  const missingTable = cash.error?.includes("cash_movements");

  async function remove(m: CashMovement) {
    if (!confirm(`ลบรายการ${LABEL[m.kind]} ${money(Number(m.amount_usd), "USD")}?`)) return;
    await deleteCash(m.id);
    cash.reload();
  }

  return (
    <>
      <PageHeader eyebrow="ฝาก ถอน ปันผล และดอกเบี้ย" title="บัญชีเงิน">
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          <Plus size={15} aria-hidden="true" />
          เพิ่มรายการ
        </button>
      </PageHeader>

      {missingTable ? (
        <Note icon={Banknote} tone="loss">
          ฐานข้อมูลยังไม่มีตารางเงินเข้า-ออก ผู้ดูแลเว็บต้องรันไฟล์ <code>supabase/migrations/20261116000002_accounts_cash_risk.sql</code> ใน Supabase SQL Editor ก่อน
        </Note>
      ) : (
        <ErrorBox error={cash.error} />
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat
          icon={PiggyBank}
          label="เงินฝากสุทธิ"
          value={money(s.netDepositUsd, "USD")}
          sub={s.netDepositThb == null ? "ใส่ยอดบาทในรายการฝาก/ถอนเพื่อดูเป็นบาท" : `เป็นเงินบาท ${money(s.netDepositThb, "THB")}`}
        />
        <Stat icon={Coins} label="ปันผล + ดอกเบี้ยสุทธิ" value={money(s.incomeNetUsd, "USD", { sign: true })} className={tone(s.incomeNetUsd)} sub={`ปันผล ${money(s.dividendsUsd, "USD")} · ภาษี ${money(s.taxUsd, "USD")}`} />
        <Stat
          icon={Wallet}
          label="ผลตอบแทนรวม"
          value={money(totalReturn, "USD", { sign: true })}
          className={tone(totalReturn)}
          sub={`กำไรจากการเทรด ${money(realized, "USD", { sign: true })} + รายได้สุทธิ`}
        />
        <Stat
          icon={Banknote}
          label="เงินสดคงเหลือ (ประมาณ)"
          value={money(s.cashUsd, "USD")}
          className={s.cashUsd < 0 ? "text-loss" : ""}
          sub={s.cashUsd < 0 ? "ติดลบ: น่าจะยังบันทึกเงินฝากไม่ครบ" : "ฝากสุทธิ + รายได้ − ซื้อ + ขาย"}
        />
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="card p-0 overflow-hidden">
          <div className="panel-title px-5 pt-5">
            <h2>รายการ</h2>
            <Segmented
              label="กรอง"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "ทั้งหมด" },
                { value: "money", label: "ฝาก/ถอน" },
                { value: "income", label: "ปันผล/อื่นๆ" },
              ]}
            />
          </div>
          {cash.loading ? (
            <div className="space-y-3 px-5 pb-6">
              {[0, 1, 2].map((i) => (
                <SkeletonBar key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-5 pb-8 text-center text-[13px] text-muted">ยังไม่มีรายการ — เริ่มจากบันทึกเงินที่โอนเข้าโบรก</div>
          ) : (
            <div>
              {rows.map((m) => {
                const v = signedUsd(m);
                return (
                  <div key={m.id} className="flex items-center gap-3 border-t border-border px-5 py-3 text-[13px]">
                    <span className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] ${v >= 0 ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss"}`}>
                      {m.symbol ? <TickerLogo symbol={m.symbol} size={22} /> : v >= 0 ? <ArrowDownLeft size={17} aria-hidden="true" /> : <ArrowUpRight size={17} aria-hidden="true" />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <strong className="truncate font-medium">
                        {LABEL[m.kind]}
                        {m.symbol ? ` · ${m.symbol}` : ""}
                      </strong>
                      <span className="truncate text-[11px] text-muted">
                        {new Date(m.occurred_on + "T00:00:00").toLocaleDateString("th-TH", { dateStyle: "medium" })}
                        {m.broker ? ` · ${m.broker}` : ""}
                        {m.note ? ` · ${m.note}` : ""}
                      </span>
                    </span>
                    <span className="text-right">
                      <strong className={`block font-medium whitespace-nowrap ${tone(v)}`}>{money(v, "USD", { sign: true })}</strong>
                      {m.amount_thb != null && <span className="text-[11px] text-muted">{money(Number(m.amount_thb), "THB")}</span>}
                    </span>
                    <span className="flex shrink-0">
                      <button className="icon-btn h-8 w-8 text-muted" onClick={() => setEditing(m)} aria-label="แก้ไข" title="แก้ไข">
                        <Pencil size={14} />
                      </button>
                      <button className="icon-btn h-8 w-8 text-muted hover:text-loss" onClick={() => remove(m)} aria-label="ลบ" title="ลบ">
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card">
          <div className="panel-title">
            <h2>ปันผลสุทธิตามหุ้น</h2>
            <span className="text-[11px]">หลังหักภาษี</span>
          </div>
          {divs.length === 0 ? (
            <div className="py-6 text-center text-[13px] text-muted">ยังไม่มีปันผล</div>
          ) : (
            <div className="space-y-2.5">
              {divs.map((d) => (
                <div key={d.symbol} className="flex items-center gap-2 text-[13px]">
                  <TickerLogo symbol={d.symbol} size={22} />
                  <span className="font-medium">{d.symbol}</span>
                  <strong className={`ml-auto font-medium ${tone(d.net)}`}>{money(d.net, "USD", { sign: true })}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "เพิ่มรายการเงิน" : "แก้ไขรายการเงิน"}>
        {editing !== null && (
          <CashForm
            key={editing === "new" ? "new" : editing.id}
            entry={editing === "new" ? undefined : editing}
            onDone={() => {
              setEditing(null);
              cash.reload();
            }}
          />
        )}
      </Sheet>
    </>
  );
}
