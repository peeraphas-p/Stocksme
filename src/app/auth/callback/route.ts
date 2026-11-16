import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/safe-path";
import { serverSupabase } from "@/lib/supabase/server";

// ลิงก์จากอีเมล Supabase (ยืนยันอีเมล / ตั้งรหัสผ่านใหม่) จะพากลับมาที่นี่พร้อม ?code=
// ?next= กำหนดหน้าที่จะไปต่อ — รับเฉพาะ path ภายในเว็บนี้ กันการพาไปเว็บอื่น
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  if (code) {
    const sb = await serverSupabase();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=confirm`);
}
