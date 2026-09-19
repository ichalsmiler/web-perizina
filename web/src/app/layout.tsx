import type { Metadata, Viewport } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IzinSiswa - Aplikasi Perizinan Digital",
  description: "Ajukan dan lacak izin siswa secara digital, tanpa perlu akun.",
  // Agar tampilan menyesuaikan lebar layar HP dan bisa di-zoom (aksesibilitas).
  appleWebApp: {
    capable: true,
    title: "IzinSiswa",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0b574b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${poppins.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-light text-neutral-dark font-sans">
        {children}
      </body>
    </html>
  );
}
