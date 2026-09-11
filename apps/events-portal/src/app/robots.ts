import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl =
    process.env.NEXT_PUBLIC_EVENTS_URL || "https://events.incubationcentre.nitp.ac.in";

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
