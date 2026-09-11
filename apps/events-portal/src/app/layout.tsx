import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_EVENTS_URL as string;

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: (() => {
    try {
      return siteUrl ? new URL(siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`) : null;
    } catch {
      return null;
    }
  })(),
  title: {
    default: "Events Portal | Incubation Centre NIT Patna",
    template: "%s | IC NIT Patna Events",
  },
  description:
    "Official Events Portal of the Incubation Centre, National Institute of Technology Patna. Discover, register, and compete in hackathons, coding contests, startup hunts, quizzes, and workshops.",
  keywords: [
    "Incubation Centre NIT Patna",
    "NIT Patna Events",
    "Hackathons",
    "Coding Competitions",
    "Startup Hunt",
    "Algorithm Treasure Hunt",
    "Innovation Hub",
    "NITP Tech Fest",
    "Student Innovation",
    "Engineering Challenges",
    "IC Events Portal",
  ],
  authors: [{ name: "Incubation Centre, NIT Patna", url: "https://incubationcentre.nitp.ac.in" }],
  creator: "Incubation Centre, NIT Patna",
  publisher: "National Institute of Technology Patna",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "Incubation Centre NIT Patna Events Portal",
    title: "Events Portal | Incubation Centre NIT Patna",
    description:
      "Level up your skills by participating in hackathons, quizzes, and treasure hunts. The ultimate arena for competitive minds at NIT Patna.",
    images: [
      {
        url: "/ic_logo.png",
        width: 512,
        height: 512,
        alt: "Incubation Centre NIT Patna Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Events Portal | Incubation Centre NIT Patna",
    description:
      "Level up your skills by participating in hackathons, quizzes, and treasure hunts at Incubation Centre, NIT Patna.",
    images: ["/ic_logo.png"],
    creator: "@ic_nitp",
  },
  icons: {
    icon: [
      { url: "/ic_logo.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/ic_logo.png",
    apple: "/ic_logo.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Incubation Centre, NIT Patna",
      url: "https://incubationcentre.nitp.ac.in",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/ic_logo.png`,
        caption: "Incubation Centre NIT Patna Logo",
      },
      sameAs: [
        "https://www.linkedin.com/company/incubation-centre-nit-patna",
        "https://twitter.com/ic_nitp",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Incubation Centre NIT Patna Events Portal",
      description: "Official events and competition arena of Incubation Centre NIT Patna.",
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
      inLanguage: "en-US",
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
