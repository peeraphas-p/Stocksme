import { LOGO_SVG } from "@/lib/brand";

/** ไอคอนสมุด Stocksme (สัดส่วน 300×340) */
export function BrandMark({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 [&>svg]:h-full [&>svg]:w-full ${className}`}
      style={{ width: size, height: Math.round((size * 340) / 300) }}
      dangerouslySetInnerHTML={{ __html: LOGO_SVG }}
    />
  );
}

/** ตัวอักษร "Stocksme" — "me" เป็นตัวเอียงแบบมีเชิง สีเขียวของโลโก้ */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`whitespace-nowrap font-semibold tracking-[-0.03em] ${className}`}>
      Stocks
      <em className="font-serif-brand italic text-[var(--logo-green)]">
        me
      </em>
    </span>
  );
}
