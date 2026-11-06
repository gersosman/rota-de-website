import type { Metadata } from "next";
import { Geist_Mono, Newsreader, Outfit } from "next/font/google";
import { getDictionary, getLocale } from "@/lib/i18n";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
});

const newsreader = Newsreader({
  subsets: ["latin", "latin-ext"],
  variable: "--font-newsreader",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getDictionary();
  return {
    title: { default: copy.metaTitle, template: "%s · ROTA DE" },
    description: copy.metaDescription,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${outfit.variable} ${newsreader.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
