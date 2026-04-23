import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "Research-X Dashboard",
  description: "Biblioteca de investigaciones GitHub — Claude/MCP/Anthropic",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <div className="flex h-full min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-[220px] p-6 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
