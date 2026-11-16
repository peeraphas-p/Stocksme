"use client";

import { useMemo, useState } from "react";
import { CircleCheck, FileSpreadsheet, History, Info, Undo2, Upload } from "lucide-react";
import { Empty, ErrorBox, Note, PageHeader } from "@/components/ui";
import { deleteBatch, importTrades, useBatches } from "@/lib/data";
import { dateTime, price, qty, tradeTime } from "@/lib/format";
import { fetchFxRates, usMarketDay } from "@/lib/fx";
import {
  BROKERS,
  FIELD_LABELS,
  REQUIRED,
  SIDE_ALL_BUY,
  SIDE_ALL_SELL,
  isDateOnlyTime,
  planTables,
  readFile,
  toTrades,
  type BrokerId,
  type DateOrder,
  type Field,
  type Mapping,
  type ParsedRow,
  type PlannedTable,
  type Zone,
} from "@/lib/importers";

const sheetLabel = (t: { sheet: string }) => t.sheet || "ไฟล์";

export default function ImportPage() {
  const batches = useBatches();
  const [broker, setBroker] = useState<BrokerId>("dime");
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0); // เปลี่ยนค่าเพื่อล้างช่องเลือกไฟล์หลังนำเข้าเสร็จ
  const [tables, setTables] = useState<PlannedTable[]>([]);
  const [active, setActive] = useState(0);
  const [order, setOrder] = useState<DateOrder>("auto");
  const [zone, setZone] = useState<Zone>("Asia/Bangkok");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const info = BROKERS.find((b) => b.id === broker)!;

  function pickBroker(id: BrokerId) {
    const b = BROKERS.find((x) => x.id === id)!;
    setBroker(id);
    setOrder(b.order);
    setZone(b.zone);
  }

  async function onFile(f: File | undefined) {
    setErr(null);
    setDone(null);
    if (!f) return;
    try {
      const planned = planTables(await readFile(f), f.name);
      if (!planned.length) throw new Error("ไม่พบหัวคอลัมน์ในไฟล์");
      setFile(f);
      setTables(planned);
      setActive(Math.max(0, planned.findIndex((t) => t.include)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  const patchTable = (i: number, patch: Partial<PlannedTable>) => setTables((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  // อ่านทุกชีตที่เลือก; ใช้ตัวนับ key ร่วมกันเพื่อไม่ให้รายการที่หน้าตาเหมือนกันชนกันข้ามชีต
  const results = useMemo(() => {
    const seen = new Map<string, number>();
    return tables.map((t) => {
      const missing = REQUIRED.filter((f) => !t.map[f]);
      const parsed: ParsedRow[] = t.include && missing.length === 0 ? toTrades(t.rows, t.map, broker, order, zone, { sheet: t.sheet, seen }) : [];
      return { missing, parsed, good: parsed.filter((p) => p.trade), bad: parsed.filter((p) => p.error), skipped: parsed.filter((p) => p.skip) };
    });
  }, [tables, broker, order, zone]);

  const included = tables.map((t, i) => ({ t, r: results[i], i })).filter((x) => x.t.include);
  const blocked = included.filter((x) => x.r.missing.length > 0);
  const good = included.flatMap((x) => x.r.good);
  const bad = included.flatMap((x) => x.r.bad);
  const skipped = included.flatMap((x) => x.r.skipped);
  const buys = good.filter((p) => p.trade!.side === "BUY").length;
  const sells = good.length - buys;
  const dateOnly = good.length > 0 && good.every((p) => isDateOnlyTime(p.trade!.executed_at));

  const cur = tables[active];
  const curRes = results[active];

  async function commit() {
    setBusy(true);
    setErr(null);
    try {
      const trades = good.map((p) => ({ ...p.trade! }));
      // ใช้อัตรา ฿/$ จากไฟล์ถ้ามี; ดึงจากอินเทอร์เน็ตเฉพาะรายการที่ไม่มี
      const missingFx = trades.filter((t) => t.fx_rate == null);
      if (missingFx.length) {
        const { rates } = await fetchFxRates(missingFx.map((t) => usMarketDay(t.executed_at)));
        for (const t of missingFx) t.fx_rate = rates[usMarketDay(t.executed_at)] ?? null;
      }
      const res = await importTrades(info.label, file?.name ?? "", trades);
      setDone(`นำเข้าแล้ว ${res.inserted} รายการ${res.skipped ? ` · ข้าม ${res.skipped} รายการที่เคยนำเข้าแล้ว` : ""}`);
      setFile(null);
      setTables([]);
      setInputKey((k) => k + 1);
      batches.reload();
    } catch (e) {
      setErr(String((e as { message?: string }).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function undo(id: string, label: string) {
    if (!confirm(`ลบการนำเข้า "${label}" และรายการทั้งหมดที่มาจากไฟล์นี้?`)) return;
    await deleteBatch(id);
    batches.reload();
  }

  return (
    <>
      <PageHeader eyebrow="CSV หรือ Excel จากแอปโบรก" title="นำเข้า" />

      <div className="card space-y-4">
        <div className="flex flex-wrap gap-2">
          {BROKERS.map((b) => (
            <button key={b.id} className={`chip ${broker === b.id ? "chip-on" : ""}`} onClick={() => pickBroker(b.id)}>
              {b.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">{info.help}</p>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[14px] border border-dashed border-border px-4 py-8 text-center transition-colors hover:bg-[var(--hover)]">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-bg">
            <Upload size={19} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <span className="text-[13px] font-medium">{file ? file.name : "เลือกไฟล์ CSV หรือ Excel"}</span>
          <span className="text-[11px] text-muted">.csv · .xlsx · .xls</span>
          <input key={inputKey} type="file" accept=".csv,.xlsx,.xls,text/csv" onChange={(e) => onFile(e.target.files?.[0])} className="sr-only" />
        </label>
      </div>

      <ErrorBox error={err} />
      {done && (
        <Note icon={CircleCheck} tone="gain">
          {done}
        </Note>
      )}

      {cur && (
        <div className="card space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <FileSpreadsheet size={16} aria-hidden="true" />
            {file?.name}
          </h2>

          {/* ชีตในไฟล์: ติ๊กเพื่อนำเข้า, กดชื่อเพื่อดู/แก้การจับคู่คอลัมน์ */}
          {tables.length > 1 && (
            <div className="space-y-1">
              <div className="text-xs text-muted">ชีตในไฟล์ — ติ๊กชีตที่จะนำเข้า</div>
              <div className="flex flex-wrap gap-2">
                {tables.map((t, i) => {
                  const r = results[i];
                  return (
                    <div key={t.sheet} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${i === active ? "border-accent" : "border-border"}`}>
                      <input type="checkbox" checked={t.include} onChange={(e) => patchTable(i, { include: e.target.checked })} aria-label={`นำเข้าชีต ${t.sheet}`} />
                      <button className="cursor-pointer text-left" onClick={() => setActive(i)}>
                        <span className="font-medium">{sheetLabel(t)}</span>
                        <span className="ml-2 text-xs text-muted">
                          {!t.include ? `${t.rows.length} แถว · ไม่นำเข้า` : r.missing.length ? "ต้องจับคู่คอลัมน์" : `${r.good.length} รายการ`}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-sm font-semibold tracking-tight">
            จับคู่คอลัมน์{tables.length > 1 ? ` — ชีต “${sheetLabel(cur)}”` : ""} ({cur.rows.length} แถว)
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(FIELD_LABELS) as Field[]).map((f) => (
              <label key={f} className="field">
                <span>
                  {FIELD_LABELS[f]}
                  {REQUIRED.includes(f) && <b className="text-loss"> *</b>}
                </span>
                <select value={cur.map[f] ?? ""} onChange={(e) => patchTable(active, { map: { ...cur.map, [f]: e.target.value || undefined } as Mapping })}>
                  <option value="">— ไม่ใช้ —</option>
                  {f === "side" && (
                    <>
                      <option value={SIDE_ALL_BUY}>ทั้งชีตเป็นรายการซื้อ</option>
                      <option value={SIDE_ALL_SELL}>ทั้งชีตเป็นรายการขาย</option>
                    </>
                  )}
                  {cur.headers.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </label>
            ))}
            <label className="field">
              <span>รูปแบบวันที่</span>
              <select value={order} onChange={(e) => setOrder(e.target.value as DateOrder)}>
                <option value="auto">อัตโนมัติ</option>
                <option value="MDY">เดือน/วัน/ปี (US)</option>
                <option value="DMY">วัน/เดือน/ปี (ไทย)</option>
                <option value="YMD">ปี-เดือน-วัน</option>
              </select>
            </label>
            <label className="field">
              <span>เวลาในไฟล์เป็นเวลา</span>
              <select value={zone} onChange={(e) => setZone(e.target.value as Zone)}>
                <option value="America/New_York">นิวยอร์ก (US)</option>
                <option value="Asia/Bangkok">ประเทศไทย</option>
                <option value="UTC">UTC</option>
              </select>
            </label>
          </div>

          {cur.include && curRes.missing.length > 0 && (
            <p className="text-sm text-loss">
              ชีต “{sheetLabel(cur)}” ยังไม่ได้เลือกคอลัมน์: {curRes.missing.map((f) => FIELD_LABELS[f]).join(", ")}
            </p>
          )}

          {/* ตัวอย่างของชีตที่กำลังดู */}
          {curRes.good.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted text-left">
                  <tr>
                    <th className="py-1">{dateOnly ? "วันที่ซื้อขาย (US)" : "วันเวลา (เวลาเครื่องนี้)"}</th>
                    <th className="py-1">หุ้น</th>
                    <th className="py-1">ฝั่ง</th>
                    <th className="py-1 text-right">จำนวน</th>
                    <th className="py-1 text-right">ราคา</th>
                    <th className="py-1 text-right">ค่าธรรมเนียม</th>
                    <th className="py-1 text-right">฿/$</th>
                  </tr>
                </thead>
                <tbody>
                  {curRes.good.slice(0, 6).map(({ trade: t, line }) => (
                    <tr key={line} className="border-t border-border">
                      <td className="py-1 whitespace-nowrap">{tradeTime(t!.executed_at)}</td>
                      <td className="py-1 font-medium">{t!.symbol}</td>
                      <td className={`py-1 ${t!.side === "BUY" ? "text-gain" : "text-loss"}`}>{t!.side === "BUY" ? "ซื้อ" : "ขาย"}</td>
                      <td className="py-1 text-right">{qty(t!.qty)}</td>
                      <td className="py-1 text-right">{price(t!.price_usd)}</td>
                      <td className="py-1 text-right">{price(t!.fee_usd)}</td>
                      <td className="py-1 text-right text-muted">{t!.fx_rate ? Number(t!.fx_rate).toFixed(4) : "อัตโนมัติ"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {curRes.good.length > 6 && <div className="text-xs text-muted mt-1">…และอีก {curRes.good.length - 6} รายการในชีตนี้</div>}
            </div>
          )}

          {/* สรุปรวมทุกชีตที่เลือก */}
          <div className="border-t border-border pt-4 space-y-3">
            {included.length === 0 ? (
              <p className="text-sm text-loss">ยังไม่ได้เลือกชีตที่จะนำเข้า</p>
            ) : blocked.length > 0 ? (
              <p className="text-sm text-loss">ต้องจับคู่คอลัมน์ให้ครบก่อน: {blocked.map((x) => `“${sheetLabel(x.t)}”`).join(", ")} (หรือเอาติ๊กออกถ้าไม่ต้องการนำเข้า)</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="flex items-center gap-1.5 text-gain">
                    <CircleCheck size={15} aria-hidden="true" />
                    พร้อมนำเข้า {good.length} รายการ (ซื้อ {buys} · ขาย {sells})
                  </span>
                  {skipped.length > 0 && <span className="text-muted">ข้าม {skipped.length} (ยกเลิก/ว่าง/แถวสรุป)</span>}
                  {bad.length > 0 && <span className="text-loss">อ่านไม่ได้ {bad.length}</span>}
                </div>
                {bad.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-xl bg-loss-soft p-3 text-xs text-loss space-y-0.5">
                    {bad.slice(0, 50).map((b) => (
                      <div key={`${b.sheet}:${b.line}`}>
                        {b.sheet ? `${b.sheet} ` : ""}แถว {b.line}: {b.error}
                      </div>
                    ))}
                  </div>
                )}
                {good.length > 0 && sells === 0 && (
                  <p className="flex items-start gap-2.5 rounded-[12px] bg-bg p-3 text-[13px] text-muted">
                    <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                    มีแต่<b>รายการซื้อ</b> — หุ้นจะขึ้นเป็น “ถืออยู่” จนกว่าจะนำเข้ารายการขายด้วย แล้วกำไร/ขาดทุนจะคำนวณให้เอง</span>
                  </p>
                )}
                {good.length > 0 && buys === 0 && (
                  <p className="flex items-start gap-2.5 rounded-[12px] bg-bg p-3 text-[13px] text-muted">
                    <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                    มีแต่<b>รายการขาย</b> — ต้องมีรายการซื้อของหุ้นเหล่านี้ด้วย ไม่อย่างนั้นจะขึ้นเตือนว่าขายเกินจำนวนที่ถือ</span>
                  </p>
                )}
                {dateOnly && <p className="text-xs text-muted">ไฟล์นี้มีแต่วันที่ ไม่มีเวลา — รายงานตามชั่วโมงจะไม่นับรายการเหล่านี้ และไม้ที่ซื้อขายวันเดียวกันจะแสดงเป็น “วันเดียวกัน”</p>}
                <button className="btn btn-primary w-full sm:w-auto" disabled={busy || good.length === 0} onClick={commit}>
                  {busy ? "กำลังนำเข้า…" : `นำเข้า ${good.length} รายการ`}
                </button>
                <p className="text-xs text-muted">รายการที่เคยนำเข้าแล้วจะถูกข้ามอัตโนมัติ · รายการที่ไฟล์ไม่มีอัตรา ฿/$ จะดึงตามวันที่ให้</p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="flex items-center gap-2 px-1 text-sm font-semibold tracking-tight">
          <History size={15} aria-hidden="true" />
          ประวัติการนำเข้า
        </h2>
        {batches.data.length === 0 ? (
          <Empty icon={History} title="ยังไม่เคยนำเข้า" />
        ) : (
          <div className="card p-0 overflow-hidden">
            {batches.data.map((b) => (
              <div key={b.id} className="flex items-center gap-3 border-b border-border p-3 last:border-0 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {b.broker} · {b.filename}
                  </div>
                  <div className="text-xs text-muted">
                    {dateTime(b.created_at)} · {b.row_count} รายการ
                  </div>
                </div>
                <button className="btn-ghost hover:!text-loss" onClick={() => undo(b.id, b.filename ?? b.broker)}>
                  <Undo2 size={14} aria-hidden="true" />
                  ย้อนกลับ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
