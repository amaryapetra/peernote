import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PeerNote | Better notes, together",
  description: "PeerNote helps students discover shared class notes, connect with study partners, and learn together.",
  applicationName: "PeerNote",
  keywords: ["study groups", "collaborative notes", "course notes", "student study app"],
  robots: { index: true, follow: true },
  openGraph: {
    title: "PeerNote | Better notes, together",
    description: "One place for class notes, study partners and shared learning.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geistSans.variable + " " + geistMono.variable}>
      <body>{children}</body>
    </html>
  );
}
