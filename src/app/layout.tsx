import type { Metadata, Viewport } from "next";
import { Playfair_Display, Public_Sans } from "next/font/google";
import { ViewportVars } from "@/components/mobile/ViewportVars";
import "./globals.css";

/*
  Playfair Display (headings) + Public Sans (body/UI), self-hosted via
  next/font — no runtime request to Google, no layout shift.

  Chosen after a type-specimen review: bold serif headline in the
  Guardian/Vox register, over a neutral, highly legible sans body. Headline
  weight is 900 (Playfair's heaviest) — 700 and 800 both read too light at
  display sizes.
*/

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["900"],
  variable: "--font-playfair-display",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Citizen",
  description: "Specific, quantifiable policy asks — and who backs them.",
};

// Phones: draw under the notch/home bar (pages pad with env(safe-area-inset-*)),
// and on Android let the keyboard shrink the layout instead of covering it.
// iOS ignores interactiveWidget; ViewportVars covers it there. Pinch zoom is
// deliberately left on — it's an accessibility feature, not a bug to disable.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#fafaf7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${publicSans.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <ViewportVars />
        {children}
      </body>
    </html>
  );
}
