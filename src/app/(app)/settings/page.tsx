"use client";

import { useEffect, useState } from "react";
import { Download, Languages, Plus, X } from "lucide-react";
import AccountCard from "@/components/AccountCard";
import { LanguageList } from "@/components/LanguagePicker";
import { useI18n } from "@/i18n/client";
import { AppearanceControls } from "@/components/AppShell";
import { CurrencyToggle, PageHeader } from "@/components/ui";
import { saveProfile } from "@/lib/data";
import { useApp } from "@/lib/useApp";
import type { Currency } from "@/lib/types";

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function SettingsPage() {
  const app = useApp();
  const i18n = useI18n();
  const { m } = i18n;
  const s = m.settings;
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => setTags(app.profile.strategy_tags), [app.profile.strategy_tags]);

  async function persist(p: { strategy_tags?: string[]; default_currency?: Currency }) {
    try {
      await saveProfile(p);
      setMsg(s.saved);
      app.reloadProfile();
    } catch (e) {
      setMsg(i18n.t(s.saveFailed, { e: String((e as { message?: string }).message ?? e) }));
    }
  }

  function addTag() {
    const t = newTag.trim();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setNewTag("");
    persist({ strategy_tags: next });
  }

  function removeTag(t: string) {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    persist({ strategy_tags: next });
  }

  function exportCsv() {
    const cols = ["executed_at", "symbol", "side", "qty", "price_usd", "fee_usd", "fx_rate", "broker", "strategy_tag", "emotion", "note"] as const;
    const lines = [cols.join(","), ...app.trades.map((t) => cols.map((c) => csvCell(t[c])).join(","))];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stocksme-trades-${new Date().toLocaleDateString("en-CA")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageHeader eyebrow={s.eyebrow} title={s.title} />
      {msg && <div className="text-[13px] text-muted">{msg}</div>}

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 md:items-start">
      <AccountCard />
      <div className="card space-y-2">
        <h2 className="text-sm font-semibold tracking-tight">{s.defaultCurrency}</h2>
        <CurrencyToggle
          value={app.profile.default_currency}
          onChange={(c) => {
            app.setCurrency(c);
            persist({ default_currency: c });
          }}
        />
        <p className="text-xs text-muted">{i18n.t(s.fxNote, { v: app.latestFx.toFixed(2) })}</p>
      </div>

      <div className="card space-y-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
            <Languages size={15} aria-hidden="true" />
            {m.common.language}
          </h2>
          <p className="text-xs text-muted">{s.languageDesc}</p>
        </div>
        <LanguageList />
      </div>

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">{s.playbook}</h2>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t} className="chip">
              {t}
              <button className="-mr-1 ml-1 grid h-4 w-4 place-items-center rounded-full text-muted hover:text-loss cursor-pointer" onClick={() => removeTag(t)} aria-label={i18n.t(s.removeTag, { t })}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="input" placeholder={s.newTag} value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} />
          <button className="btn" onClick={addTag}>
            <Plus size={15} aria-hidden="true" />
            {m.common.add}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-1 text-sm font-semibold tracking-tight">{m.appearance.settingsTitle}</h2>
        <p className="mb-4 text-xs text-muted">{m.appearance.settingsDesc}</p>
        <AppearanceControls />
      </div>

      <div className="card space-y-2">
        <h2 className="text-sm font-semibold tracking-tight">{s.backup}</h2>
        <button className="btn" onClick={exportCsv} disabled={app.trades.length === 0}>
          <Download size={15} aria-hidden="true" />
          {s.downloadCsv}
        </button>
      </div>

      </div>
    </>
  );
}
