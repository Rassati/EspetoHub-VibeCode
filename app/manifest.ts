import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Espeto Hub",
    short_name: "Espeto Hub",
    description: "Pedidos simples para pequenas empresas",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fffaf7",
    theme_color: "#ef6c32",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
