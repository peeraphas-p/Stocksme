"use client";

import { useMemo, useState } from "react";
import { Empty, ErrorBox, PageHeader, Sheet } from "@/components/ui";
import { deleteJournal, saveJournal, useJournal } from "@/lib/data";
import { money, tone } from "@/lib/format";
import { dailyPnl } from "@/lib/stats";
import { useApp } from "@/lib/useApp";
import { EMOTIONS, type JournalEntry } from "@/lib/types";

const today = () => new Date().toLocaleDateString("en-CA");

function JournalForm({ entry, tags, onDone }: { entry?: JournalEntry; tags: string[]; onDone: () => void }) {
  const [f, setF] = useState<Omit<JournalEntry, "id">>({
    entry_date: entry?.entry_date ?? today(),
    symbol: entry?.symbol ?? "",
    strategy_tag: entry?.strategy_tag ?? "",
    emotion: entry?.emotion ?? "",
    plan: entry?.plan ?? "",
    result: entry?.result ?? "",
    lesson: entry?.lesson ?? "",
    rating: entry?.rating ?? null,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveJournal(
        {
          ...f,
          symbol: f.symbol?.trim().toUpperCase() || null,
          strategy_tag: f.strategy_tag || null,
          emotion: f.emotion || null,
          plan: f.plan || null,
          result: f.result || null,
          lesson: f.lesson || null,
        },
        entry?.id,
      );
      onDone();
    } catch (e) {
      setErr(String((e as { message?: string }).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="field">
          <span>วันที่</span>
          <input type="date" required value={f.entry_date} onChange={(e) => set("entry_date", e.target.value)} />
        </label>
        <label className="field">
          <span>หุ้น (ถ้ามี)</span>
          <input value={f.symbol ?? ""} onChange={(e) => set("symbol", e.target.value.toUpperCase())} />
        </label>
        <label className="field">
          <span>กลยุทธ์</span>
          <select value={f.strategy_tag ?? ""} onChange={(e) => set("strategy_tag", e.target.value)}>
            <option value="">—</option>
            {tags.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>อารมณ์</span>
          <select value={f.emotion ?? ""} onChange={(e) => set("emotion", e.target.value)}>
            <option value="">—</option>
            {EMOTIONS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>แผน / เหตุผลที่เข้า</span>
        <textarea rows={3} value={f.plan ?? ""} onChange={(e) => set("plan", e.target.value)} />
      </label>
      <label className="field">
        <span>เกิดอะไรขึ้น / เหตุผลที่ออก</span>
        <textarea rows={3} value={f.result ?? ""} onChange={(e) => set("result", e.target.value)} />
      </label>
      <label className="field">
        <span>บทเรียน</span>
        <textarea rows={2} value={f.lesson ?? ""} onChange={(e) => set("lesson", e.target.value)} />
      </label>
      <div className="field">
        <span>ให้คะแนนวินัยตัวเอง</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => set("rating", f.rating === n ? null : n)}
              className={`text-2xl cursor-pointer ${f.rating && n <= f.rating ? "" : "opacity-25 grayscale"}`}
              aria-label={`${n} ดาว`}
            >
              ⭐
            </button>
          ))}
        </div>
      </div>
      {err && <p className="text-sm text-loss">{err}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "กำลังบันทึก…" : "บันทึก"}
      </button>
    </form>
  );
}

export default function JournalPage() {
  const app = useApp();
  const journal = useJournal();
  const [editing, setEditing] = useState<JournalEntry | "new" | null>(null);
  const daily = useMemo(() => dailyPnl(app.pnl.closed, app.currency), [app.pnl.closed, app.currency]);

  async function remove(e: JournalEntry) {
    if (!confirm("ลบบันทึกนี้?")) return;
    await deleteJournal(e.id);
    journal.reload();
  }

  return (
    <>
      <PageHeader title="สมุดบันทึกการเทรด">
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          + เขียนบันทึก
        </button>
      </PageHeader>
      <ErrorBox error={journal.error} />
      {journal.loading ? (
        <Empty>กำลังโหลด…</Empty>
      ) : journal.data.length === 0 ? (
        <Empty>จดเหตุผลที่เข้า-ออก อารมณ์ และบทเรียนในแต่ละวัน เพื่อเห็นว่าอะไรทำให้กำไรหรือขาดทุน</Empty>
      ) : (
        <div className="space-y-3">
          {journal.data.map((e) => {
            const dayPnl = daily.get(e.entry_date);
            return (
              <article key={e.id} className="card space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <b>{new Date(e.entry_date + "T00:00:00").toLocaleDateString("th-TH", { dateStyle: "full" })}</b>
                  {e.symbol && <span className="chip">{e.symbol}</span>}
                  {e.strategy_tag && <span className="chip">{e.strategy_tag}</span>}
                  {e.emotion && <span className="chip">{e.emotion}</span>}
                  {e.rating && <span className="text-sm">{"⭐".repeat(e.rating)}</span>}
                  {dayPnl !== undefined && (
                    <span className={`ml-auto text-sm font-bold ${tone(dayPnl)}`}>วันนั้น {money(dayPnl, app.currency, { sign: true })}</span>
                  )}
                </div>
                {e.plan && (
                  <p className="text-sm whitespace-pre-wrap">
                    <span className="text-muted">แผน: </span>
                    {e.plan}
                  </p>
                )}
                {e.result && (
                  <p className="text-sm whitespace-pre-wrap">
                    <span className="text-muted">ผล: </span>
                    {e.result}
                  </p>
                )}
                {e.lesson && (
                  <p className="text-sm whitespace-pre-wrap">
                    <span className="text-muted">บทเรียน: </span>
                    {e.lesson}
                  </p>
                )}
                <div className="flex justify-end gap-3 text-sm">
                  <button className="text-accent cursor-pointer" onClick={() => setEditing(e)}>
                    แก้
                  </button>
                  <button className="text-loss cursor-pointer" onClick={() => remove(e)}>
                    ลบ
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "เขียนบันทึก" : "แก้ไขบันทึก"}>
        {editing !== null && (
          <JournalForm
            key={editing === "new" ? "new" : editing.id}
            entry={editing === "new" ? undefined : editing}
            tags={app.profile.strategy_tags}
            onDone={() => {
              setEditing(null);
              journal.reload();
            }}
          />
        )}
      </Sheet>
    </>
  );
}
