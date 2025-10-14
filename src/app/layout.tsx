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
      <body className={`${glorySans.variable} ${gloryMono.variable} antialiased`}>
        <Toaster position="top-right" richColors />
        <UserProvider>
          {/* <Loader /> */}
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
