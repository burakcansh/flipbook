import type { Metadata } from "next";
import { Playfair_Display, Inter, Lora, Caveat } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/LangProvider";

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-serif",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin", "latin-ext"],
  variable: "--font-hand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NextviroBook",
  description:
    "Kitap, sertifika ve web sayfalarını oluştur; link ve kodla paylaş.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="tr"
      className={`${playfair.variable} ${inter.variable} ${lora.variable} ${caveat.variable}`}
    >
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
