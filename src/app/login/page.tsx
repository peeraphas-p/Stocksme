"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

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
      if (error) setMsg({ kind: "err", text: "เข้าสู่ระบบไม่สำเร็จ: " + error.message });
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
      if (error) setMsg({ kind: "err", text: "สมัครไม่สำเร็จ: " + error.message });
      else if (data.session) {
        router.replace("/");
        router.refresh();
      } else setMsg({ kind: "ok", text: "สมัครแล้ว! เช็กอีเมลเพื่อกดยืนยัน แล้วกลับมาเข้าสู่ระบบ" });
    }
    setBusy(false);
  }

  return (
    <main className="min-h-dvh grid place-items-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-2xl font-bold">📈 Stocksme</h1>
          <p className="text-sm text-muted">บันทึกการเทรดหุ้น US ของคุณ</p>
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
          className="text-sm text-muted underline w-full"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "ยังไม่มีบัญชี? สมัครสมาชิก" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}
        </button>
      </form>
    </main>
  );
}
