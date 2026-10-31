import type { Metadata, Viewport } from "next";
import { Nunito, Pacifico } from "next/font/google";
import "./globals.css";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });
const pacifico = Pacifico({ variable: "--font-pacifico", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "LoverBoy", template: "%s · LoverBoy" },
  description: "Liebe ist Pflicht. Fehler kosten. Das offizielle Strafregister der LoverBoys.",
  appleWebApp: { capable: true, title: "LoverBoy", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#e11d48",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${nunito.variable} ${pacifico.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
