import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl =
    process.env.NEXT_PUBLIC_EVENTS_URL || "https://events.incubationcentre.nitp.ac.in";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  let eventRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${apiUrl}/events`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const events = data.events || [];
      eventRoutes = events.flatMap((event: any) => [
        {
          url: `${siteUrl}/${event.id}`,
          lastModified: event.updatedAt ? new Date(event.updatedAt) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        },
        {
          url: `${siteUrl}/${event.id}/register`,
          lastModified: event.updatedAt ? new Date(event.updatedAt) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        },
      ]);
    }
  } catch {
    // If backend is not reached during static generation, return static routes safely
  }

  return [...staticRoutes, ...eventRoutes];
}
