/** The public address of this site, for the sitemap, robots.txt and absolute links in metadata. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://mannabooks.co.ke").replace(/\/$/, "");
