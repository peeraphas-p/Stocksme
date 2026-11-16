import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";

// ลิงก์ยืนยันอีเมลจาก Supabase จะพากลับมาที่นี่พร้อม ?code=
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const sb = await serverSupabase();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/`);
  }
  return NextResponse.redirect(`${origin}/login?error=confirm`);
}
