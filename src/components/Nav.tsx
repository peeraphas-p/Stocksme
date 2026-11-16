"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "ภาพรวม", icon: "📊" },
  { href: "/trades", label: "รายการ", icon: "📋" },
  { href: "/journal", label: "บันทึก", icon: "📝" },
  { href: "/reports", label: "รายงาน", icon: "📈" },
  { href: "/import", label: "นำเข้า", icon: "⬆️" },
  { href: "/settings", label: "ตั้งค่า", icon: "⚙️" },
];

export default function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-52 flex-col gap-1 border-r border-border bg-surface p-3">
        <div className="px-3 py-4 text-lg font-bold">📈 Stocksme</div>
        {ITEMS.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`rounded-xl px-3 py-2 text-sm ${active(i.href) ? "bg-accent text-white" : "hover:bg-bg"}`}
          >
            <span className="mr-2">{i.icon}</span>
            {i.label}
          </Link>
        ))}
      </aside>
      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-6 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`flex flex-col items-center py-2 text-[11px] ${active(i.href) ? "text-accent font-bold" : "text-muted"}`}
          >
            <span className="text-lg leading-none">{i.icon}</span>
            {i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
