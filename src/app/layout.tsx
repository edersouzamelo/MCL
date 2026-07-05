import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCL | Piloto Classe II",
  description:
    "Prototipo demonstrativo do Modelo de Continuidade Logistica para suprimento Classe II com dados sinteticos.",
  manifest: "/manifest.json",
  applicationName: "MCL Piloto",
  icons: {
    icon: [
      {
        url: "/favicon.png",
        type: "image/png",
        sizes: "any",
      },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
