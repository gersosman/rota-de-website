import type { Metadata } from "next";
import { Geist_Mono, Newsreader, Outfit } from "next/font/google";
import { getDictionary, getLocale } from "@/lib/i18n";
import { publicOrigin } from "@/lib/site-origin";
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
  const origin = publicOrigin();
  return {
    metadataBase: origin ? new URL(origin) : undefined,
    title: { default: copy.metaTitle, template: "%s · ROTA DE" },
    description: copy.metaDescription,
    alternates: origin ? { canonical: origin } : undefined,
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      locale: "tr_TR",
      type: "website",
      images: [{ url: "/photos/highway.jpg", width: 1200, height: 630, alt: copy.phase3.photoHighway }],
    },
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
