import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AF Item",
  description: "AnimalFarm item editor",
  icons: {
    icon: "/anif_icon.png",
    apple: "/anif_icon.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
