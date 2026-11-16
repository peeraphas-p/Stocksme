import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stocksme — บันทึกการเทรด",
    short_name: "Stocksme",
    description: "บันทึกการเทรดหุ้น US กำไรขาดทุนทั้ง USD และบาท",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#2563eb",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
