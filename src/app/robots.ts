import type { MetadataRoute } from "next";
import { publicOrigin } from "@/lib/site-origin";

export default function robots(): MetadataRoute.Robots {
  const origin = publicOrigin();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/admin/"] }],
    sitemap: origin ? `${origin}/sitemap.xml` : undefined,
  };
}
