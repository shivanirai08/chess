import type { Metadata } from "next";
import { Glory } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
// import Loader from "@/components/Loader";


const glorySans = Glory({
  variable: "--font-glory-sans",
  subsets: ["latin"],
});

const gloryMono = Glory({
  variable: "--font-glory-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chess Game",
  description: "A strategic board game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${glorySans.variable} ${gloryMono.variable} antialiased`}
      >
        <Toaster position="top-right" richColors />
          {/* <Loader /> */}
          <div
            className="relative min-h-screen bg-fixed bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/bg.svg')" }}
          >
            {/* Overlay - sits between background and content */}
            <div className="fixed inset-0 bg-gradient-to-b from-black/30 to-black/60 pointer-events-none z-0" />
            {/* Content - sits above overlay */}
            <div className="relative z-10">
              {children}
            </div>
          </div>
      </body>
    </html>
  );
}
