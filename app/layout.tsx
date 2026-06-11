import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vitano — Hit your protein on autopilot",
  description:
    "Snap a photo of your meal. We tell you if you're on track to build muscle — no tedious logging.",
  metadataBase: new URL("https://getvitano.com"),
  alternates: {
    canonical: "https://getvitano.com",
  },
  icons: {
    icon: "/vitano_icon_transparent.png",
    apple: "/vitano_icon_transparent.png",
  },
  openGraph: {
    title: "Vitano — Hit your protein on autopilot",
    description:
      "Snap a photo of your meal. We tell you if you're on track to build muscle — no tedious logging.",
    type: "website",
    url: "https://getvitano.com",
    siteName: "Vitano",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vitano — Hit your protein on autopilot",
    description:
      "Snap a photo of your meal. We tell you if you're on track to build muscle — no tedious logging.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}<Analytics /></body>
    </html>
  );
}
