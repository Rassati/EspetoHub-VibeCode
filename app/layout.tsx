import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Espeto Hub",
  description: "Pedidos simples para pequenas empresas",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#ef6c32",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
