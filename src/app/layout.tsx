import type { Metadata } from "next";
import { Mali, Comfortaa } from "next/font/google";
import "./globals.css";

import Navbar from '@/components/Navbar';
import SessionCloser from '@/components/SessionCloser';

const mali = Mali({
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-mali",
  display: "swap",
});

const comfortaa = Comfortaa({
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-comfortaa",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sổ vàng của bé Linh",
  description: "Quản lý danh mục đầu tư và theo dõi giá vàng Ngọc Của",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${mali.variable} ${comfortaa.variable}`}>
      <body>
        <Navbar />
        <SessionCloser />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
