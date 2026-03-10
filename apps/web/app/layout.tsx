import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import { SessionProvider } from "./components/SessionProvider";
import { Toaster } from "sonner";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Sui Rewards Platform",
  description: "Track delegator and validator rewards reliably across every epoch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${spaceGrotesk.variable} bg-[#F5F5F5] font-sans antialiased text-[#0a0a0a] min-h-screen flex flex-col`}>
        <SessionProvider>
          <Header />
          <main className="flex-1 relative">
            {children}
          </main>
          <Toaster position="bottom-right" richColors />
        </SessionProvider>
      </body>
    </html>
  );
}
