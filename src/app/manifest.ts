import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LoverBoy",
    short_name: "LoverBoy",
    description: "Liebe ist Pflicht. Fehler kosten.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff6f1",
    theme_color: "#e11d48",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
