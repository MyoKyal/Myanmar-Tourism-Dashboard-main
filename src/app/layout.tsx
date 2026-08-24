import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import { FilterProvider } from "@/lib/FilterContext";
import { AppPreferences } from "@/components/AppPreferences";

export const metadata: Metadata = {
  title: "Myanmar Tourism Dashboard",
  description: "Data Analysis and Management Dashboard for Myanmar Tourism",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body className="bg-[#f8fafc] text-slate-900 antialiased flex h-screen overflow-hidden">

        {/* Background Decorative Blobs */}
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

        <AppPreferences>
          <Sidebar />
          <div className="flex-1 h-screen overflow-y-auto relative z-10 w-full flex flex-col">
            <MobileHeader />
            <main className="flex-1">
              <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto min-h-full">
                <FilterProvider>{children}</FilterProvider>
              </div>
            </main>
          </div>
        </AppPreferences>
      </body>
    </html>
  );
}
