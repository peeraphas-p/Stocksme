import { ImageResponse } from "next/og";
import { LOGO_DATA_URI } from "@/lib/brand";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// ไอคอนขนาดใหญ่สำหรับติดตั้งแอปบน Android / Chrome (PWA)
export default function PwaIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1f2427" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_DATA_URI} width={344} height={390} alt="" />
      </div>
    ),
    size,
  );
}
