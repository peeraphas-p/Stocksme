"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, ExternalLink, KeyRound, Loader2, Trash2 } from "lucide-react";
import { Segmented } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import { AiError, listModels, pickDefaultModel, PROVIDERS, providerOf, type ProviderId } from "@/lib/ai/providers";
import type { AiSettings } from "@/lib/ai/settings";

const ERR = { auth: "errAuth", limit: "errLimit", busy: "errBusy", refusal: "errRefusal", model: "errModel", network: "errNetwork", failed: "errFailed" } as const;

/** ตั้งค่าผู้ช่วย AI: เลือกเจ้า, ใส่ key, เลือกโมเดล — ทุกอย่างเก็บในเบราว์เซอร์นี้ */
export default function AiSetup({ settings, update, onDone }: { settings: AiSettings; update: (fn: (s: AiSettings) => AiSettings) => void; onDone?: () => void }) {
  const { m, t } = useI18n();
  const a = m.ask;
  const provider = settings.provider;
  const info = providerOf(provider);
  const savedKey = settings.keys[provider] ?? "";
  const [draft, setDraft] = useState(savedKey);
  const [show, setShow] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // เปลี่ยนเจ้า → แสดง key ของเจ้านั้น และโหลดรายชื่อโมเดลถ้ามี key แล้ว
  useEffect(() => {
    setDraft(settings.keys[provider] ?? "");
    setModels([]);
    setError(null);
    const key = settings.keys[provider];
    if (!key) return;
    let cancelled = false;
    listModels(provider, key)
      .then((ids) => !cancelled && setModels(ids))
      .catch(() => undefined); // เงียบไว้ — ปุ่มเชื่อมต่อจะแจ้งข้อผิดพลาดเอง
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- โหลดใหม่เมื่อเปลี่ยนเจ้าเท่านั้น
  }, [provider]);

  const showError = (e: unknown) => {
    const code = e instanceof AiError ? e.code : "failed";
    setError(t(a[ERR[code]], { company: info.company }));
  };

  async function connect() {
    const key = draft.trim();
    if (!key) return;
    setBusy(true);
    setError(null);
    try {
      const ids = await listModels(provider, key);
      if (!ids.length) throw new AiError("model");
      setModels(ids);
      const current = settings.models[provider];
      const model = current && ids.includes(current) ? current : pickDefaultModel(provider, ids);
      update((s) => ({ ...s, keys: { ...s.keys, [provider]: key }, models: { ...s.models, [provider]: model } }));
      onDone?.();
    } catch (e) {
      if (e instanceof AiError && e.code === "model") setError(a.errNoModels);
      else showError(e);
    } finally {
      setBusy(false);
    }
  }

  function removeKey() {
    update((s) => {
      const keys = { ...s.keys };
      delete keys[provider];
      return { ...s, keys };
    });
    setDraft("");
    setModels([]);
  }

  const model = settings.models[provider] ?? "";
  const modelOptions = models.length ? models : model ? [model] : [];

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <KeyRound size={15} aria-hidden="true" />
          {a.setupTitle}
        </h2>
        <p className="mt-1 text-xs text-muted">{a.setupDesc}</p>
      </div>

      <div className="space-y-1.5">
        <div className="text-xs text-muted">{a.provider}</div>
        <Segmented<ProviderId>
          label={a.provider}
          value={provider}
          onChange={(p) => update((s) => ({ ...s, provider: p }))}
          options={PROVIDERS.map((p) => ({ value: p.id, label: p.name }))}
        />
      </div>

      <div className="field">
        <span className="flex items-center justify-between gap-2">
          {a.apiKey}
          <a href={info.keyUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-accent hover:underline">
            {t(a.getKey, { company: info.company })}
            <ExternalLink size={11} aria-hidden="true" />
          </a>
        </span>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={show ? "text" : "password"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && connect()}
              placeholder={t(a.keyPlaceholder, { name: info.name }) + (info.keyPrefix ? ` (${info.keyPrefix}…)` : "")}
              autoComplete="off"
              spellCheck={false}
              className="w-full !pr-10 font-mono text-[13px]"
            />
            <button type="button" className="absolute top-1/2 right-1.5 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-fg cursor-pointer" onClick={() => setShow(!show)} aria-label={show ? a.hideKey : a.showKey}>
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <button type="button" className="btn btn-primary" onClick={connect} disabled={busy || !draft.trim()}>
            {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null}
            {busy ? a.checking : a.connect}
          </button>
        </div>
      </div>

      {savedKey && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="field min-w-0 flex-1">
            <span>{a.model}</span>
            <select value={model} onChange={(e) => update((s) => ({ ...s, models: { ...s.models, [provider]: e.target.value } }))}>
              {modelOptions.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-danger" onClick={removeKey}>
            <Trash2 size={14} aria-hidden="true" />
            {a.removeKey}
          </button>
          {onDone && (
            <button type="button" className="btn" onClick={onDone}>
              {a.done}
            </button>
          )}
        </div>
      )}

      {error && <p className="text-[13px] text-loss">{error}</p>}
      <p className="text-[11px] text-muted">{a.sharedWarning}</p>
    </section>
  );
}
