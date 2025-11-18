import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import WalletProvider from "@/components/WalletProvider";
import { Providers } from "@/lib/providers";
import Navigation from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WHISTLE - Decentralized RPC Provider Network",
  description: "Self-sovereign blockchain data access powered by WHISTLE Network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <WalletProvider>
            <Navigation />
            {children}
          </WalletProvider>
        </Providers>
      </body>
    </html>
  );
}
