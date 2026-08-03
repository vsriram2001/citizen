import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { FontSwitcher } from "@/components/FontSwitcher";
import "./globals.css";

/*
  Geist Sans, self-hosted via the `geist` package (OFL, free commercially).
  One face across every slot — headline, body, UI. No serif, no second family.

  Deliberate: the product reads as a precise instrument rather than a legacy
  publication. Authority comes from layout and restraint, not from borrowing a
  newspaper's typographic costume.
*/

export const metadata: Metadata = {
  title: "Citizen",
  description: "Specific, quantifiable policy asks — and who backs them.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        {children}
        {/* Dev-only. Guarded so it can never reach production, where pulling
            15 font families from Google Fonts would be unacceptable. */}
        {process.env.NODE_ENV === "development" && <FontSwitcher />}
      </body>
    </html>
  );
}
