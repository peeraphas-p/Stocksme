"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChartCandlestick } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

/** แปลข้อความ error ที่พบบ่อยจาก Supabase Auth เป็นภาษาไทย พร้อมบอกวิธีแก้ */
function explain(error: { message: string; code?: string }) {
  const m = error.message.toLowerCase();
  const c = error.code ?? "";
  if (c === "signup_disabled" || c === "email_provider_disabled" || m.includes("signups are disabled") || m.includes("signups not allowed"))
    return "Supabase ปิดการสมัครด้วยอีเมลไว้ — ไปที่ Supabase → Authentication → Sign In / Providers แล้วเปิด “Allow new users to sign up” และเปิด Email provider (ให้ปิดแค่ “Confirm email”)";
  if (c === "invalid_credentials" || m.includes("invalid login credentials")) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง (ถ้ายังไม่มีบัญชี ให้กด “สมัครสมาชิก” ด้านล่างก่อน)";
  if (c === "email_not_confirmed" || m.includes("email not confirmed")) return "ยังไม่ได้ยืนยันอีเมล — เช็กกล่องอีเมลแล้วกดลิงก์ยืนยัน หรือปิด “Confirm email” ใน Supabase";
  if (c === "user_already_exists" || m.includes("already registered")) return "อีเมลนี้สมัครไว้แล้ว — กด “มีบัญชีแล้ว? เข้าสู่ระบบ”";
  if (c === "weak_password" || m.includes("password should")) return "รหัสผ่านสั้นหรือง่ายเกินไป (อย่างน้อย 6 ตัวอักษร)";
  if (c === "over_email_send_rate_limit" || m.includes("rate limit")) return "ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่";
  if (c === "email_address_invalid" || m.includes("is invalid")) return "รูปแบบอีเมลไม่ถูกต้อง";
  return error.message;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const sb = supabase();
    if (mode === "signin") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setMsg({ kind: "err", text: "เข้าสู่ระบบไม่สำเร็จ: " + explain(error) });
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
      if (error) setMsg({ kind: "err", text: "สมัครไม่สำเร็จ: " + explain(error) });
      else if (data.session) {
        router.replace("/");
        router.refresh();
      } else setMsg({ kind: "ok", text: "สมัครแล้ว! เช็กอีเมลเพื่อกดยืนยัน แล้วกลับมาเข้าสู่ระบบ" });
    }
    setBusy(false);
  }

  return (
    <main className="min-h-dvh grid place-items-center px-4">
      <form onSubmit={submit} className="glass w-full max-w-sm space-y-4 rounded-[24px] p-6 sm:p-7">
        <div>
          <span className="mb-4 grid h-10 w-10 place-items-center rounded-[12px] bg-brand text-brand-ink">
            <ChartCandlestick size={21} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <h1 className="text-[26px] leading-tight font-medium tracking-[-0.035em]">{mode === "signin" ? "ยินดีต้อนรับกลับ" : "สร้างบัญชี"}</h1>
          <p className="mt-1 text-[13px] text-muted">Stocksme · บันทึกการเทรดหุ้น US ของคุณ</p>
        </div>
        <label className="field">
          <span>อีเมล</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>รหัสผ่าน</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {msg && <p className={msg.kind === "ok" ? "text-gain text-sm" : "text-loss text-sm"}>{msg.text}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "กำลังดำเนินการ…" : mode === "signin" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
        </button>
        <button
          type="button"
          className="w-full text-[13px] text-muted underline-offset-2 hover:text-fg hover:underline cursor-pointer"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "ยังไม่มีบัญชี? สมัครสมาชิก" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}
        </button>
      </form>
    </main>
  );
}
