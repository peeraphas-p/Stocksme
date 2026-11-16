import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stocksme — Trading Journal",
    short_name: "Stocksme",
    description: "US stock trading journal · P/L in USD and THB",
    start_url: "/",
    display: "standalone",
    background_color: "#1f2427",
    theme_color: "#1f2427",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon1", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
