import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CekOngkir - Cek Ongkos Kirim Semua Ekspedisi",
  description: "Bandingkan tarif pengiriman dari berbagai ekspedisi Indonesia. Cek ongkir JNE, TIKI, POS, J&T, SiCepat, AnterAja, dan lainnya.",
  keywords: ["cek ongkir", "ongkos kirim", "raja ongkir", "JNE", "TIKI", "POS Indonesia", "J&T", "SiCepat", "ekspedisi", "pengiriman"],
  authors: [{ name: "CekOngkir" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "CekOngkir - Cek Ongkos Kirim Semua Ekspedisi",
    description: "Bandingkan tarif pengiriman dari berbagai ekspedisi Indonesia",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
