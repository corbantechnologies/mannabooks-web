import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/w/", "/workspaces", "/account", "/groups", "/admin", "/api/", "/p/", "/c/", "/q/", "/signin", "/signup"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
