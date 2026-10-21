import type { Metadata } from "next";
import Header from "@/components/layout/header";
import "./globals.scss";
import { ConvexClientProvider } from "./ConvexProvider";
import { Inter } from "next/font/google";

export const metadata: Metadata = {
  title: "ASRC2027",
  description: "CICM Annual Student Research Conference 2027",
  icons: {
    icon: [{ url: "/asrc.png", type: "image/png", sizes: "any" }],
    shortcut: "/asrc.png",
    apple: "/asrc.png",
  },
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
        <ConvexClientProvider>
          <Header />
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
