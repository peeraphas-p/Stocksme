"use client";

import { useMemo, useState } from "react";
import { CircleCheck, FileSpreadsheet, History, Info, Undo2, Upload } from "lucide-react";
import { Ticker } from "@/components/Ticker";
import { Empty, ErrorBox, Note, PageHeader } from "@/components/ui";
import { deleteBatch, importTrades, useBatches } from "@/lib/data";
import { price, qty } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import type { Messages } from "@/i18n/messages/th";
import { fetchFxRates, usMarketDay } from "@/lib/fx";
import {
  BROKERS,
  FIELDS,
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
  type IssueCode,
  type Mapping,
  type ParsedRow,
  type PlannedTable,
  type Zone,
} from "@/lib/importers";

type ImportMsgs = Messages["import"];
const FIELD_KEY = {
  symbol: "fieldSymbol",
  side: "fieldSide",
  qty: "fieldQty",
  price: "fieldPrice",
  gross: "fieldGross",
  fee: "fieldFee",
  fx: "fieldFx",
  date: "fieldDate",
  time: "fieldTime",
  orderId: "fieldOrderId",
  status: "fieldStatus",
} as const satisfies Record<Field, keyof ImportMsgs>;
const ISSUE_KEY = { noSymbol: "errNoSymbol", side: "errSide", qty: "errQty", price: "errPrice", date: "errDate" } as const satisfies Record<IssueCode, keyof ImportMsgs>;
const HELP_KEY = { webull: "helpWebull", dime: "helpDime", liberator: "helpLiberator", generic: "helpGeneric" } as const satisfies Record<BrokerId, keyof ImportMsgs>;

export default function ImportPage() {
  const batches = useBatches();
  const { m, t: fill, fmt } = useI18n();
  const x = m.import;
  const fieldLabel = (f: Field) => x[FIELD_KEY[f]];
  const sheetLabel = (t: { sheet: string }) => t.sheet || x.file;
  const issueText = (p: ParsedRow) => (p.issues ?? []).map((i) => fill(x[ISSUE_KEY[i.code]], { v: i.value ?? "" })).join(", ");
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
      if (!planned.length) throw new Error(x.noHeaders);
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
      return { missing, parsed, good: parsed.filter((p) => p.trade), bad: parsed.filter((p) => p.issues?.length), skipped: parsed.filter((p) => p.skip) };
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
      setDone(fill(x.done, { n: res.inserted }) + (res.skipped ? fill(x.doneSkipped, { n: res.skipped }) : ""));
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
    if (!confirm(fill(x.confirmUndo, { label }))) return;
    await deleteBatch(id);
    batches.reload();
  }

  return (
    <>
      <PageHeader eyebrow={x.eyebrow} title={x.title} />

      <div className="card space-y-4">
        <div className="flex flex-wrap gap-2">
          {BROKERS.map((b) => (
            <button key={b.id} className={`chip ${broker === b.id ? "chip-on" : ""}`} onClick={() => pickBroker(b.id)}>
              {b.id === "generic" ? x.brokerGeneric : b.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">{x[HELP_KEY[broker]]}</p>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[14px] border border-dashed border-border px-4 py-8 text-center transition-colors hover:bg-[var(--hover)]">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-bg">
            <Upload size={19} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <span className="text-[13px] font-medium">{file ? file.name : x.chooseFile}</span>
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
              <div className="text-xs text-muted">{x.sheets}</div>
              <div className="flex flex-wrap gap-2">
                {tables.map((t, i) => {
                  const r = results[i];
                  return (
                    <div key={t.sheet} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${i === active ? "border-accent" : "border-border"}`}>
                      <input type="checkbox" checked={t.include} onChange={(e) => patchTable(i, { include: e.target.checked })} aria-label={fill(x.includeSheet, { s: t.sheet })} />
                      <button className="cursor-pointer text-left" onClick={() => setActive(i)}>
                        <span className="font-medium">{sheetLabel(t)}</span>
                        <span className="ml-2 text-xs text-muted">
                          {!t.include ? fill(x.sheetRowsSkipped, { n: t.rows.length }) : r.missing.length ? x.needsMapping : fill(x.itemsN, { n: r.good.length })}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-sm font-semibold tracking-tight">
            {x.mapColumns}
            {tables.length > 1 ? fill(x.mapSheet, { s: sheetLabel(cur) }) : ""} {fill(x.rowsN, { n: cur.rows.length })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FIELDS.map((f) => (
              <label key={f} className="field">
                <span>
                  {fieldLabel(f)}
                  {REQUIRED.includes(f) && <b className="text-loss"> *</b>}
                </span>
                <select value={cur.map[f] ?? ""} onChange={(e) => patchTable(active, { map: { ...cur.map, [f]: e.target.value || undefined } as Mapping })}>
                  <option value="">{m.common.notUsed}</option>
                  {f === "side" && (
                    <>
                      <option value={SIDE_ALL_BUY}>{x.sheetAllBuy}</option>
                      <option value={SIDE_ALL_SELL}>{x.sheetAllSell}</option>
                    </>
                  )}
                  {cur.headers.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </label>
            ))}
            <label className="field">
              <span>{x.dateFormat}</span>
              <select value={order} onChange={(e) => setOrder(e.target.value as DateOrder)}>
                <option value="auto">{m.common.auto}</option>
                <option value="MDY">{x.dateMDY}</option>
                <option value="DMY">{x.dateDMY}</option>
                <option value="YMD">{x.dateYMD}</option>
              </select>
            </label>
            <label className="field">
              <span>{x.timezone}</span>
              <select value={zone} onChange={(e) => setZone(e.target.value as Zone)}>
                <option value="America/New_York">{x.tzNewYork}</option>
                <option value="Asia/Bangkok">{x.tzBangkok}</option>
                <option value="UTC">UTC</option>
              </select>
            </label>
          </div>

          {cur.include && curRes.missing.length > 0 && (
            <p className="text-sm text-loss">
              {fill(x.missingColumns, { s: sheetLabel(cur), cols: curRes.missing.map(fieldLabel).join(", ") })}
            </p>
          )}

          {/* ตัวอย่างของชีตที่กำลังดู */}
          {curRes.good.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted text-left">
                  <tr>
                    <th className="py-1">{dateOnly ? x.colTradeDay : x.colLocalTime}</th>
                    <th className="py-1">{m.common.stock}</th>
                    <th className="py-1">{x.colSide}</th>
                    <th className="py-1 text-right">{m.common.qty}</th>
                    <th className="py-1 text-right">{m.common.price}</th>
                    <th className="py-1 text-right">{m.common.fee}</th>
                    <th className="py-1 text-right">{m.common.fx}</th>
                  </tr>
                </thead>
                <tbody>
                  {curRes.good.slice(0, 6).map(({ trade: t, line }) => (
                    <tr key={line} className="border-t border-border">
                      <td className="py-1 whitespace-nowrap">{fmt.tradeTime(t!.executed_at)}</td>
                      <td className="py-1"><Ticker symbol={t!.symbol} size={22} /></td>
                      <td className={`py-1 ${t!.side === "BUY" ? "text-gain" : "text-loss"}`}>{t!.side === "BUY" ? m.common.buy : m.common.sell}</td>
                      <td className="py-1 text-right">{qty(t!.qty)}</td>
                      <td className="py-1 text-right">{price(t!.price_usd)}</td>
                      <td className="py-1 text-right">{price(t!.fee_usd)}</td>
                      <td className="py-1 text-right text-muted">{t!.fx_rate ? Number(t!.fx_rate).toFixed(4) : m.common.auto}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {curRes.good.length > 6 && <div className="text-xs text-muted mt-1">{fill(x.moreInSheet, { n: curRes.good.length - 6 })}</div>}
            </div>
          )}

          {/* สรุปรวมทุกชีตที่เลือก */}
          <div className="border-t border-border pt-4 space-y-3">
            {included.length === 0 ? (
              <p className="text-sm text-loss">{x.noSheet}</p>
            ) : blocked.length > 0 ? (
              <p className="text-sm text-loss">{fill(x.blocked, { sheets: blocked.map((b) => `“${sheetLabel(b.t)}”`).join(", ") })}</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="flex items-center gap-1.5 text-gain">
                    <CircleCheck size={15} aria-hidden="true" />
                    {fill(x.ready, { n: good.length, b: buys, s: sells })}
                  </span>
                  {skipped.length > 0 && <span className="text-muted">{fill(x.skipped, { n: skipped.length })}</span>}
                  {bad.length > 0 && <span className="text-loss">{fill(x.unreadable, { n: bad.length })}</span>}
                </div>
                {bad.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-xl bg-loss-soft p-3 text-xs text-loss space-y-0.5">
                    {bad.slice(0, 50).map((b) => (
                      <div key={`${b.sheet}:${b.line}`}>
                        {b.sheet ? `${b.sheet} · ` : ""}
                        {fill(x.rowError, { line: b.line, msg: issueText(b) })}
                      </div>
                    ))}
                  </div>
                )}
                {good.length > 0 && sells === 0 && (
                  <p className="flex items-start gap-2.5 rounded-[12px] bg-bg p-3 text-[13px] text-muted">
                    <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{x.onlyBuys}</span>
                  </p>
                )}
                {good.length > 0 && buys === 0 && (
                  <p className="flex items-start gap-2.5 rounded-[12px] bg-bg p-3 text-[13px] text-muted">
                    <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{x.onlySells}</span>
                  </p>
                )}
                {dateOnly && <p className="text-xs text-muted">{x.dateOnly}</p>}
                <button className="btn btn-primary w-full sm:w-auto" disabled={busy || good.length === 0} onClick={commit}>
                  {busy ? x.importing : fill(x.importN, { n: good.length })}
                </button>
                <p className="text-xs text-muted">{x.footnote}</p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="flex items-center gap-2 px-1 text-sm font-semibold tracking-tight">
          <History size={15} aria-hidden="true" />
          {x.history}
        </h2>
        {batches.data.length === 0 ? (
          <Empty icon={History} title={x.noHistory} />
        ) : (
          <div className="card p-0 overflow-hidden">
            {batches.data.map((b) => (
              <div key={b.id} className="flex items-center gap-3 border-b border-border p-3 last:border-0 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {b.broker} · {b.filename}
                  </div>
                  <div className="text-xs text-muted">
                    {fill(x.historyLine, { d: fmt.dateTime(b.created_at), n: b.row_count })}
                  </div>
                </div>
                <button className="btn-ghost hover:!text-loss" onClick={() => undo(b.id, b.filename ?? b.broker)}>
                  <Undo2 size={14} aria-hidden="true" />
                  {x.undo}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
