"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrandMark, Wordmark } from "@/components/Brand";
import LanguagePicker from "@/components/LanguagePicker";
import { useI18n } from "@/i18n/client";
import type { Messages } from "@/i18n/messages/th";
import { supabase } from "@/lib/supabase/client";

/** แปลข้อความ error ที่พบบ่อยจาก Supabase Auth เป็นภาษาที่เลือก พร้อมบอกวิธีแก้ */
function explain(error: { message: string; code?: string }, l: Messages["login"]) {
  const m = error.message.toLowerCase();
  const c = error.code ?? "";
  if (c === "signup_disabled" || c === "email_provider_disabled" || m.includes("signups are disabled") || m.includes("signups not allowed")) return l.errSignupDisabled;
  if (c === "invalid_credentials" || m.includes("invalid login credentials")) return l.errInvalidCredentials;
  if (c === "email_not_confirmed" || m.includes("email not confirmed")) return l.errNotConfirmed;
  if (c === "user_already_exists" || m.includes("already registered")) return l.errAlreadyRegistered;
  if (c === "weak_password" || m.includes("password should")) return l.errWeakPassword;
  if (c === "over_email_send_rate_limit" || m.includes("rate limit")) return l.errRateLimit;
  if (c === "email_address_invalid" || m.includes("is invalid")) return l.errInvalidEmail;
  return error.message;
}

export default function LoginPage() {
  const router = useRouter();
  const { m, t } = useI18n();
  const l = m.login;
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // เปิดมาจากปุ่ม "เริ่มใช้ฟรี" (?mode=signup) → แสดงฟอร์มสมัคร
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signup") setMode("signup");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const sb = supabase();
    if (mode === "forgot") {
      // ลิงก์ในอีเมลจะพากลับมาที่ /auth/callback แล้วไปหน้าตั้งรหัสผ่านใหม่
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) setMsg({ kind: "err", text: t(l.resetFailed, { e: explain(error, l) }) });
      else setMsg({ kind: "ok", text: l.resetSent });
    } else if (mode === "signin") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setMsg({ kind: "err", text: t(l.signInFailed, { e: explain(error, l) }) });
      else {
        router.replace("/");
        router.refresh();
      }
    } else {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) setMsg({ kind: "err", text: t(l.signUpFailed, { e: explain(error, l) }) });
      else if (data.session) {
        router.replace("/");
        router.refresh();
      } else setMsg({ kind: "ok", text: l.signedUpCheckEmail });
    }
    setBusy(false);
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="absolute top-3 right-3 sm:top-5 sm:right-5">
        <LanguagePicker />
      </div>
      <form onSubmit={submit} className="glass w-full max-w-sm space-y-4 rounded-[24px] p-6 sm:p-7">
        <div>
          <div className="mb-5 flex flex-col items-center gap-2 text-center">
            <BrandMark size={64} />
            <Wordmark className="text-[26px]" />
          </div>
          <h1 className="text-[26px] leading-tight font-medium tracking-[-0.035em]">{mode === "signin" ? l.welcomeBack : mode === "signup" ? l.createAccount : l.forgot}</h1>
          <p className="mt-1 text-[13px] text-muted">{mode === "forgot" ? l.forgotDesc : l.tagline}</p>
        </div>
        <label className="field">
          <span>{l.email}</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode !== "forgot" && (
        <label className="field">
          <span className="flex items-center justify-between">
            {l.password}
            {mode === "signin" && (
              <button type="button" className="text-[12px] text-muted hover:text-fg cursor-pointer" onClick={() => { setMode("forgot"); setMsg(null); }}>
                {l.forgotLink}
              </button>
            )}
          </span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        )}
        {msg && <p className={msg.kind === "ok" ? "text-gain text-sm" : "text-loss text-sm"}>{msg.text}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? l.working : mode === "signin" ? m.common.signIn : mode === "signup" ? l.signUp : l.sendReset}
        </button>
        <button
          type="button"
          className="w-full text-[13px] text-muted underline-offset-2 hover:text-fg hover:underline cursor-pointer"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setMsg(null);
          }}
        >
          {mode === "signin" ? l.toSignUp : l.toSignIn}
        </button>
      </form>
      <Link href="/welcome" className="mt-4 flex items-center justify-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeft size={14} aria-hidden="true" />
        {m.common.backHome}
      </Link>
      {mode === "signup" && (
        <p className="mt-3 max-w-sm text-center text-[11px] text-muted">
          {l.agreeBefore}{" "}
          <Link href="/terms" className="underline underline-offset-2">
            {m.common.terms}
          </Link>{" "}
          {l.agreeAnd}{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            {m.common.privacy}
          </Link>
        </p>
      )}
    </main>
  );
}
