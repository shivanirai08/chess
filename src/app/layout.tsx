import type { Metadata } from "next";
import { Glory } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";
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
        <UserProvider>
          {/* <Loader /> */}
          <div
            className="relative min-h-screen bg-fixed bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/bg.svg')" }}
          >
            {/* Overlay */}
            <div className="fixed inset-0 bg-gradient-to-b from-black/30 to-black/60 pointer-events-none" />
            {children}
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
