"use client";

import { BackgroundPixelStars } from "@/components/ui/background-pixel-stars";
import { useAppearance } from "@/lib/appearance";

/** ชั้นพื้นหลังที่เคลื่อนไหวได้ หลังทุกหน้า: แสงฟุ้งของ "สมุดกราฟ" หรือดาวพิกเซล */
export default function AppBackground() {
  const [a] = useAppearance();
  if (a.background === "ledger") {
    return (
      <div aria-hidden="true" className="ledger-glow">
        <i />
        <i />
        <i />
        <i />
      </div>
    );
  }
  if (a.background === "stars") {
    return (
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-[1]">
        <BackgroundPixelStars />
      </div>
    );
  }
  return null;
}
