"use client";

import { BackgroundPixelStars } from "@/components/ui/background-pixel-stars";
import { useAppearance } from "@/lib/appearance";

/** ดาวพิกเซลเคลื่อนไหวหลังทุกหน้า เมื่อเลือกพื้นหลัง "ดาว" (ค่าเริ่มต้น) */
export default function StarsBackground() {
  const [a] = useAppearance();
  if (a.background !== "stars") return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-[1]">
      <BackgroundPixelStars />
    </div>
  );
}
