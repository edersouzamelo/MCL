import type { Metadata, Viewport } from "next";
import { Providers } from "@/providers/Providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
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
        url: "/icon?v=4",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    shortcut: "/icon?v=4",
    apple: "/icon?v=4",
  },
};

export const viewport: Viewport = {
  themeColor: "#050c12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark h-full antialiased" data-mcl-font="media" data-mcl-motion="on" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-zinc-950 text-white transition-colors duration-300">
        <ServiceWorkerRegister />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
