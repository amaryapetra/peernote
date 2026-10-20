import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PeerNote",
    short_name: "PeerNote",
    description: "Share class notes, catch up on missed lectures, and find study partners.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#faf8f3",
    theme_color: "#2c4fa3",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
