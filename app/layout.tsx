import type { Metadata } from "next";
import "./globals.scss";
import { ConvexClientProvider } from "./ConvexProvider";
import { Inter } from "next/font/google";

export const metadata: Metadata = {
  title: "ASRC2027",
  description: "CICM Annual Student Research Conference 2027",
  icons: {
    icon: "/arsc.png",
  },
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/arsc.png" />
      </head>
      <body className={inter.className}>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
