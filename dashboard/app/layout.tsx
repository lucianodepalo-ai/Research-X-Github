import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Research-X Dashboard",
  description: "Biblioteca de investigaciones GitHub — Claude/MCP/Anthropic",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAuthPage =
    typeof children === "object" &&
    (children as { type?: { name?: string } })?.type?.name === "SignInPage";

  return (
    <html lang="es" className="dark h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        {session ? (
          <div className="flex h-full min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-[220px] p-6 overflow-auto">
              {children}
            </main>
          </div>
        ) : (
          <div className="flex min-h-screen items-center justify-center">
            {children}
          </div>
        )}
      </body>
    </html>
  );
}
