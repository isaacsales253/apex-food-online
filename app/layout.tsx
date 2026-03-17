import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "APEX Food - Sistema de Gestão",
  description: "Gestão inteligente de custos, fichas técnicas e rentabilidade para food service.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" className={`${inter.variable} ${outfit.variable}`}>
      <body className="antialiased bg-slate-950 text-slate-50 min-h-screen">
        <Sidebar />
        <main className="main-content min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
