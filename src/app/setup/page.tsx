import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import LanguagePicker from "@/components/LanguagePicker";
import { getI18n } from "@/i18n/server";
import type { Messages } from "@/i18n/messages/th";

// บอกว่า build นี้ "เห็น" ค่า Supabase หรือไม่ (NEXT_PUBLIC_* ถูกฝังตอน build · ไม่แสดงค่าจริง)
function urlStatus(v: string | undefined, s: Messages["setup"]) {
  if (!v) return { ok: false, text: s.missing };
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(v.trim())) return { ok: false, text: s.badUrl };
  return { ok: true, text: s.found };
}
function keyStatus(v: string | undefined, s: Messages["setup"]) {
  if (!v) return { ok: false, text: s.missing };
  const k = v.trim();
  if (k.startsWith("sb_secret_")) return { ok: false, text: s.secretKey };
  if (k.startsWith("sb_publishable_")) return { ok: true, text: s.publishable };
  if (k.split(".").length === 3) return { ok: true, text: s.legacyAnon };
  return { ok: false, text: s.badKey };
}

export default async function SetupPage() {
  const { m } = await getI18n();
  const s = m.setup;
  const checks = [
    { name: "NEXT_PUBLIC_SUPABASE_URL", ...urlStatus(process.env.NEXT_PUBLIC_SUPABASE_URL, s) },
    { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", ...keyStatus(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, s) },
  ];

  return (
    <main className="relative min-h-dvh grid place-items-center px-4 py-10">
      <div className="absolute top-3 right-3 sm:top-5 sm:right-5">
        <LanguagePicker />
      </div>
      <div className="glass max-w-lg space-y-4 rounded-[24px] p-6 text-sm leading-relaxed sm:p-7">
        <h1 className="text-[22px] font-medium tracking-[-0.03em]">{s.title}</h1>

        <div className="card space-y-2 !p-4">
          <div className="text-xs text-muted">{s.buildSees}</div>
          {checks.map((c) => (
            <div key={c.name} className="flex items-start gap-2">
              {c.ok ? <CircleCheck size={16} className="mt-0.5 shrink-0 text-gain" /> : <CircleX size={16} className="mt-0.5 shrink-0 text-loss" />}
              <div className="min-w-0">
                <code className="text-xs break-all">{c.name}</code>
                <div className={`text-xs ${c.ok ? "text-muted" : "text-loss"}`}>{c.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="mb-1 font-semibold">{s.onWeb}</h2>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>{s.webStep1}</li>
            <li>{s.webStep2}</li>
          </ol>
        </div>

        <div>
          <h2 className="mb-1 font-semibold">{s.onLocal}</h2>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>{s.localStep1}</li>
            <li>{s.localStep2}</li>
            <li>{s.localStep3}</li>
          </ol>
        </div>

        <p className="flex items-start gap-2 text-xs text-muted">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          {s.buildNote}
        </p>
      </div>
    </main>
  );
}
