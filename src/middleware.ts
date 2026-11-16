import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth", "/setup", "/welcome"];

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  // ยังไม่ได้ตั้งค่า Supabase → พาไปหน้าแนะนำการตั้งค่า
  if (!url || !key) {
    if (path.startsWith("/setup")) return NextResponse.next();
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  let response = NextResponse.next({ request });
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await sb.auth.getUser();

  // ยังไม่ล็อกอิน: หน้าแรก → หน้าแนะนำเว็บ, หน้าอื่นในแอป → หน้าล็อกอิน
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL(path === "/" ? "/welcome" : "/login", request.url));
  }
  // ล็อกอินแล้วไม่ต้องเห็นหน้าล็อกอิน/หน้าแนะนำ
  if (user && (path.startsWith("/login") || path.startsWith("/welcome"))) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/|favicon.ico|manifest.webmanifest|icon.*|apple-icon.*|sw.js).*)",
  ],
};
