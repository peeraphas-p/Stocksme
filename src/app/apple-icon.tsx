import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#2563eb" }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <path d="M12 44 L26 30 L35 37 L52 18" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="52" cy="18" r="4" fill="#fff" />
        </svg>
      </div>
    ),
    size,
  );
}
