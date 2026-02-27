import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FinancialVisibilityProvider } from "@/contexts/FinancialVisibilityContext";
import { ThemeScript } from "@/components/ThemeScript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.loopia.app.br"),
  title: "LoopIA - Gestão de Oficinas",
  description: "Sistema inteligente para gestão de oficinas mecânicas",
  openGraph: {
    title: "LoopIA - Gestão de Oficinas",
    description: "Sistema inteligente para gestão de oficinas mecânicas",
    url: "https://www.loopia.app.br",
    siteName: "LoopIA",
    images: [
      {
        url: "https://www.loopia.app.br/logo.opengraph.png",
        width: 1200,
        height: 630,
        alt: "LoopIA Logo",
      },
    ],
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "LoopIA - Gestão de Oficinas",
    description: "Sistema inteligente para gestão de oficinas mecânicas",
    images: ["https://www.loopia.app.br/logo.opengraph.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <meta name="theme-color" content="#121212" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <FinancialVisibilityProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </FinancialVisibilityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
