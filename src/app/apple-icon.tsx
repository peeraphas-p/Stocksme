import { ImageResponse } from "next/og";
import { LOGO_DATA_URI } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// ไอคอนหน้าจอโฮม (iPhone/iPad): สมุดสีเขียวบนพื้นเข้มแบบภาพแบรนด์
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1f2427" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_DATA_URI} width={124} height={140} alt="" />
      </div>
    ),
    size,
  );
}
