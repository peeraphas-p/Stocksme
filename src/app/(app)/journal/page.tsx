"use client";

import { useMemo, useState } from "react";
import { NotebookPen, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { TickerLogo } from "@/components/Ticker";
import { Empty, ErrorBox, PageHeader, Sheet, Skeleton } from "@/components/ui";
import { deleteJournal, saveJournal, useJournal } from "@/lib/data";
import { money, tone } from "@/lib/format";
import { dailyPnl } from "@/lib/stats";
import { useApp } from "@/lib/useApp";
import { EMOTIONS, type JournalEntry } from "@/lib/types";
import { useI18n } from "@/i18n/client";
import { emotionLabel } from "@/i18n/core";

const today = () => new Date().toLocaleDateString("en-CA");

function JournalForm({ entry, tags, onDone }: { entry?: JournalEntry; tags: string[]; onDone: () => void }) {
  const { m, t } = useI18n();
  const j = m.journal;
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
          <span>{m.common.date}</span>
          <input type="date" required value={f.entry_date} onChange={(e) => set("entry_date", e.target.value)} />
        </label>
        <label className="field">
          <span>{j.symbolOptional}</span>
          <input value={f.symbol ?? ""} onChange={(e) => set("symbol", e.target.value.toUpperCase())} />
        </label>
        <label className="field">
          <span>{m.common.strategy}</span>
          <select value={f.strategy_tag ?? ""} onChange={(e) => set("strategy_tag", e.target.value)}>
            <option value="">—</option>
            {tags.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{m.common.emotion}</span>
          <select value={f.emotion ?? ""} onChange={(e) => set("emotion", e.target.value)}>
            <option value="">—</option>
            {EMOTIONS.map((e) => (
              <option key={e} value={e}>
                {m.emotions[e]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>{j.plan}</span>
        <textarea rows={3} value={f.plan ?? ""} onChange={(e) => set("plan", e.target.value)} />
      </label>
      <label className="field">
        <span>{j.result}</span>
        <textarea rows={3} value={f.result ?? ""} onChange={(e) => set("result", e.target.value)} />
      </label>
      <label className="field">
        <span>{j.lesson}</span>
        <textarea rows={2} value={f.lesson ?? ""} onChange={(e) => set("lesson", e.target.value)} />
      </label>
      <div className="field">
        <span>{j.rating}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => set("rating", f.rating === n ? null : n)}
              className={`icon-btn h-9 w-9 ${f.rating && n <= f.rating ? "text-accent" : "text-muted opacity-50"}`}
              aria-label={t(j.stars, { n })}
              aria-pressed={!!f.rating && n <= f.rating}
            >
              <Star size={20} strokeWidth={1.6} fill={f.rating && n <= f.rating ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
      </div>
      {err && <p className="text-sm text-loss">{err}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? m.common.saving : m.common.save}
      </button>
    </form>
  );
}

export default function JournalPage() {
  const app = useApp();
  const journal = useJournal();
  const { m, t, fmt } = useI18n();
  const j = m.journal;
  const [editing, setEditing] = useState<JournalEntry | "new" | null>(null);
  const daily = useMemo(() => dailyPnl(app.pnl.closed, app.currency), [app.pnl.closed, app.currency]);

  async function remove(e: JournalEntry) {
    if (!confirm(j.confirmDelete)) return;
    await deleteJournal(e.id);
    journal.reload();
  }

  return (
    <>
      <PageHeader eyebrow={j.eyebrow} title={j.title}>
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          <Plus size={15} aria-hidden="true" />
          {j.write}
        </button>
      </PageHeader>
      <ErrorBox error={journal.error} />
      {journal.loading ? (
        <Skeleton rows={3} />
      ) : journal.data.length === 0 ? (
        <Empty icon={NotebookPen} title={j.emptyTitle}>
          {j.emptyBody}
        </Empty>
      ) : (
        <div className="space-y-3">
          {journal.data.map((e) => {
            const dayPnl = daily.get(e.entry_date);
            return (
              <article key={e.id} className="card space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold tracking-tight">{fmt.dayFull(e.entry_date)}</h2>
                  {e.rating && (
                    <span className="flex text-accent" aria-label={t(j.ratingAria, { n: e.rating })}>
                      {Array.from({ length: e.rating }, (_, i) => (
                        <Star key={i} size={13} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                      ))}
                    </span>
                  )}
                  {dayPnl !== undefined && (
                    <span className={`ml-auto text-[13px] font-medium ${tone(dayPnl)}`}>{t(j.thatDay, { v: money(dayPnl, app.currency, { sign: true }) })}</span>
                  )}
                </div>
                {(e.symbol || e.strategy_tag || e.emotion) && (
                  <div className="flex flex-wrap gap-1.5">
                    {e.symbol && (
                      <span className="tag bg-bg">
                        <TickerLogo symbol={e.symbol} size={14} />
                        {e.symbol}
                      </span>
                    )}
                    {e.strategy_tag && <span className="tag bg-bg">{e.strategy_tag}</span>}
                    {e.emotion && <span className="tag bg-bg">{emotionLabel(m, e.emotion)}</span>}
                  </div>
                )}
                {e.plan && (
                  <div className="text-[13px] leading-relaxed">
                    <div className="mb-0.5 text-[11px] text-muted">{j.planShort}</div>
                    <p className="whitespace-pre-wrap">{e.plan}</p>
                  </div>
                )}
                {e.result && (
                  <div className="text-[13px] leading-relaxed">
                    <div className="mb-0.5 text-[11px] text-muted">{j.resultShort}</div>
                    <p className="whitespace-pre-wrap">{e.result}</p>
                  </div>
                )}
                {e.lesson && (
                  <div className="text-[13px] leading-relaxed">
                    <div className="mb-0.5 text-[11px] text-muted">{j.lesson}</div>
                    <p className="whitespace-pre-wrap">{e.lesson}</p>
                  </div>
                )}
                <div className="flex justify-end gap-1">
                  <button className="icon-btn h-8 w-8 text-muted" onClick={() => setEditing(e)} aria-label={j.editAria} title={m.common.edit}>
                    <Pencil size={14} />
                  </button>
                  <button className="icon-btn h-8 w-8 text-muted hover:text-loss" onClick={() => remove(e)} aria-label={j.deleteAria} title={m.common.delete}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? j.write : j.edit}>
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
