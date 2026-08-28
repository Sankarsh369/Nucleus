import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"] });

const codystar = localFont({
  src: '../../public/font/codystar/Codystar-Regular.ttf',
  variable: '--font-codystar',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Nucleus Context Compression",
  description: "Ultra-Low Resource Context Compression Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable, codystar.variable)} suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}
