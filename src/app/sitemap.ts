import type { MetadataRoute } from "next";
import { publicOrigin } from "@/lib/site-origin";

const PATHS = ["/", "/almanyada-soforluk", "/nasil-calisir", "/sss", "/on-degerlendirme", "/basvuru-takip", "/sartlar", "/iletisim", "/hizmetler", "/impressum", "/datenschutz", "/agb", "/iptal-iade"];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = publicOrigin();
  if (!origin) return [];
  return PATHS.map((path) => ({
    url: `${origin}${path}`,
    lastModified: new Date("2026-11-07"),
  }));
}
