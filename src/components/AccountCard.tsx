"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileJson, KeyRound, LogOut, Trash2, TriangleAlert } from "lucide-react";
import { Note, Sheet } from "@/components/ui";
import { deleteMyAccount, exportAllData } from "@/lib/data";
import { supabase } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/client";

function download(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function AccountCard() {
  const router = useRouter();
  const { m, t } = useI18n();
  const a = m.account;
  const CONFIRM_WORD = a.confirmWord;
  const [warnPre, warnPost] = a.deleteWarn.split("{email}");
  const [typePre, typePost] = a.typeToConfirm.split("{w}");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<"pw" | "export" | "delete" | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [delErr, setDelErr] = useState<string | null>(null);

  useEffect(() => {
    supabase().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy("pw");
    const { error } = await supabase().auth.updateUser({ password: pw });
    setBusy(null);
    setPwMsg(error ? { ok: false, text: t(a.changeFailed, { e: error.message }) } : { ok: true, text: a.passwordChanged });
    if (!error) setPw("");
  }

  async function exportJson() {
    setBusy("export");
    try {
      const data = await exportAllData();
      download(`stocksme-all-data-${new Date().toLocaleDateString("en-CA")}.json`, JSON.stringify(data, null, 2), "application/json");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    setDelErr(null);
    try {
      await deleteMyAccount();
      router.replace("/welcome");
      router.refresh();
    } catch (e) {
      const msg = String((e as { message?: string }).message ?? e);
      setDelErr(msg.includes("delete_my_account") ? a.missingFn : t(a.deleteFailed, { e: msg }));
      setBusy(null);
    }
  }

  async function signOut() {
    await supabase().auth.signOut();
    router.replace("/welcome");
    router.refresh();
  }

  return (
    <div className="card space-y-4 md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{a.title}</h2>
          <p className="text-xs text-muted">{email || "—"}</p>
        </div>
        <button className="btn btn-danger" onClick={signOut}>
          <LogOut size={15} aria-hidden="true" />
          {m.nav.signOut}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <form onSubmit={changePassword} className="space-y-2">
          <label className="field">
            <span className="flex items-center gap-1.5">
              <KeyRound size={13} aria-hidden="true" /> {a.changePassword}
            </span>
            <input type="password" minLength={6} required autoComplete="new-password" placeholder={a.newPasswordPlaceholder} value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
          <button className="btn btn-primary" disabled={busy === "pw" || pw.length < 6}>
            {busy === "pw" ? m.common.saving : a.saveNewPassword}
          </button>
          {pwMsg && <p className={`text-xs ${pwMsg.ok ? "text-gain" : "text-loss"}`}>{pwMsg.text}</p>}
        </form>

        <div className="space-y-2">
          <div className="field">
            <span className="flex items-center gap-1.5">
              <FileJson size={13} aria-hidden="true" /> {a.yourData}
            </span>
          </div>
          <p className="text-xs text-muted">{a.yourDataDesc}</p>
          <button className="btn btn-primary" onClick={exportJson} disabled={busy === "export"}>
            {busy === "export" ? a.preparing : a.downloadJson}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-loss-soft p-3">
        <p className="text-xs text-loss">{a.dangerText}</p>
        <button className="btn btn-danger-solid !py-1.5 text-xs" onClick={() => setDelOpen(true)}>
          <Trash2 size={14} aria-hidden="true" />
          {a.deleteAccount}
        </button>
      </div>

      <Sheet open={delOpen} onClose={() => (busy ? null : setDelOpen(false))} title={a.deleteTitle}>
        <div className="space-y-4 text-[13px]">
          <Note icon={TriangleAlert} tone="loss">
            {warnPre}
            <b>{email}</b>
            {warnPost}
          </Note>
          <p className="text-muted">{a.deleteTip}</p>
          <label className="field">
            <span>
              {typePre}
              <b className="text-fg">{CONFIRM_WORD}</b>
              {typePost}
            </span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
          {delErr && <p className="text-loss">{delErr}</p>}
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setDelOpen(false)} disabled={busy === "delete"}>
              {m.common.cancel}
            </button>
            <button className="btn btn-danger-solid" onClick={remove} disabled={typed.trim() !== CONFIRM_WORD || busy === "delete"}>
              {busy === "delete" ? a.deleting : a.deleteForever}
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
