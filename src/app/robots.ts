import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * `/robots.txt`
 *
 * Crawlers may index the public catalog; private and transactional surfaces
 * (admin, account pages, auth and payment endpoints) stay out of the index.
 * Game iframes are blocked to avoid crawling self-hosted HTML bundles.
 */
export default function robots(): MetadataRoute.Robots {
  const base = env.siteUrl;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/profile",
          "/favorites",
          "/notifications",
          "/play/",
          "/search",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
