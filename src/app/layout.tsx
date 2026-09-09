import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Myanmar Tourism Dashboard",
  description: "Data Analysis and Management Dashboard for Myanmar Tourism",
};

// Deliberately minimal: the dashboard chrome (sidebar, filters, theme/language) lives in
// (app)/layout.tsx instead, since /login is the one route that must not have it -- a login
// screen with a destinations sidebar next to it would be a broken, half-authenticated look.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body className="bg-[#f8fafc] text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
