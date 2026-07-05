import type { Metadata, Viewport } from "next";
import { Providers } from "@/providers/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCL",
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

export const viewport: Viewport = {
  themeColor: "#1e293b", // Slate 800 - azul acinzentado
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-zinc-950 text-white transition-colors duration-300">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
