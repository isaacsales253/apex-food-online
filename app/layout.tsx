import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { Store, Package, FileText } from "lucide-react"; // Assuming these icons are used and need to be imported

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "APEX Food - Sistema de Gestão",
  description: "Gestão inteligente de custos, fichas técnicas e rentabilidade para food service.",
};

// Define the main menu items here, as implied by the user's intended change
const mainMenuItems = [
  { icon: Store, label: 'Fornecedores', path: '/fornecedores' },
  { icon: Package, label: 'Marcas', path: '/marcas' },
  { icon: FileText, label: 'Fichas Técnicas', path: '/fichas' },
  // Add other menu items as needed
];

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
