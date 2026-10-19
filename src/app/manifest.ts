import type { MetadataRoute } from "next";

/** Lets phones add MannaBooks to the home screen with its own icon and name. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MannaBooks",
    short_name: "MannaBooks",
    description: "Accounting, sales, stock and payroll for Kenyan businesses.",
    start_url: "/workspaces",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#065f46",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
