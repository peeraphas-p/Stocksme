/**
 * ปลายทางหลังล็อกอิน/ยืนยันอีเมล — รับเฉพาะ path ภายในเว็บนี้ (เช่น "/reset-password")
 * กันลิงก์หลอกที่พาไปเว็บอื่น เช่น "//evil.com", "https://evil.com", "/\evil.com"
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/";
  return /^\/(?![/\\])[A-Za-z0-9\-_/]*$/.test(next) ? next : "/";
}
