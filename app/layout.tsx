import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vitano — Hit your protein on autopilot",
  description:
    "Snap a photo of your meal. We tell you if you're on track to build muscle — no tedious logging.",
  openGraph: {
    title: "Vitano — Hit your protein on autopilot",
    description:
      "Snap a photo of your meal. We tell you if you're on track to build muscle — no tedious logging.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
