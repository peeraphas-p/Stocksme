import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";

// หน้านี้ถูกสร้างตอน build จึงบอกได้ว่า build นั้น "เห็น" ค่า Supabase หรือไม่ (ไม่แสดงค่าจริง)
function urlStatus(v: string | undefined) {
  if (!v) return { ok: false, text: "ไม่พบ" };
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(v.trim())) return { ok: false, text: "พบ แต่รูปแบบไม่ใช่ https://xxxx.supabase.co" };
  return { ok: true, text: "พบ" };
}
function keyStatus(v: string | undefined) {
  if (!v) return { ok: false, text: "ไม่พบ" };
  const k = v.trim();
  if (k.startsWith("sb_secret_")) return { ok: false, text: "เป็นคีย์ Secret — ห้ามใช้ ให้ใช้คีย์ Publishable แทน และควรสร้างคีย์ Secret ใหม่ใน Supabase" };
  if (k.startsWith("sb_publishable_")) return { ok: true, text: "พบ (Publishable)" };
  if (k.split(".").length === 3) return { ok: true, text: "พบ (anon แบบเก่า)" };
  return { ok: false, text: "พบ แต่รูปแบบไม่เหมือนคีย์ Supabase" };
}

export default function SetupPage() {
  const checks = [
    { name: "NEXT_PUBLIC_SUPABASE_URL", ...urlStatus(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", ...keyStatus(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) },
  ];

  return (
    <main className="min-h-dvh grid place-items-center px-4 py-10">
      <div className="glass max-w-lg space-y-4 rounded-[24px] p-6 text-sm leading-relaxed sm:p-7">
        <h1 className="text-[22px] font-medium tracking-[-0.03em]">ตั้งค่าฐานข้อมูลก่อนใช้งาน</h1>

        <div className="card space-y-2 !p-4">
          <div className="text-xs text-muted">ค่าที่ build นี้เห็น</div>
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
          <h2 className="mb-1 font-semibold">บนเว็บ (Netlify)</h2>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              <b>Project configuration → Environment variables</b> ใส่ชื่อให้ตรงตามด้านบนทุกตัวอักษร, Scopes = <b>All scopes</b>, Deploy contexts รวม <b>Production</b>
            </li>
            <li>
              <b>Deploys → Trigger deploy → Clear cache and deploy site</b>
            </li>
          </ol>
        </div>

        <div>
          <h2 className="mb-1 font-semibold">บนเครื่องตัวเอง</h2>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              Supabase → <b>SQL Editor</b> วางไฟล์ <code>supabase/schema.sql</code> แล้วกด Run
            </li>
            <li>
              Supabase → <b>Project Settings → API Keys</b> คัดลอก Project URL และคีย์ Publishable
            </li>
            <li>
              คัดลอก <code>.env.local.example</code> เป็น <code>.env.local</code> ใส่ค่าทั้งสอง แล้วรัน <code>npm run dev</code> ใหม่
            </li>
          </ol>
        </div>

        <p className="flex items-start gap-2 text-xs text-muted">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          ค่าที่ขึ้นต้นด้วย NEXT_PUBLIC_ ถูกฝังตอน build — แก้ค่าแล้วต้อง build/deploy ใหม่ทุกครั้ง
        </p>
      </div>
    </main>
  );
}
