import type { Metadata } from "next";
import Header from "@/components/layout/header";
import "./globals.scss";
import { ConvexClientProvider } from "./ConvexProvider";
import { Inter } from "next/font/google";

const SITE_NAME = "CICM Annual Student Research Conference 2027";
const SITE_URL = "https://www.cicmasrc.org";

// Favicon / apple icon come from app/favicon.ico, app/icon.png and
// app/apple-icon.png (Next.js file conventions).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  applicationName: SITE_NAME,
  description:
    "ASRC 2027 is now accepting abstracts from student researchers in basic science, clinical medicine, public health, medical education, evidence synthesis, and more.",
  openGraph: {
    siteName: SITE_NAME,
    title: SITE_NAME,
    url: SITE_URL,
    type: "website",
  },
};

// Tells Google which name to show for the site in search results.
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: ["ASRC 2027", "CICM ASRC"],
  url: `${SITE_URL}/`,
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <ConvexClientProvider>
          <Header />
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
