import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_EVENTS_URL as string;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/admin/*"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
