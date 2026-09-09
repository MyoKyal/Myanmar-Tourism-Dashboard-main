import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import { FilterProvider } from "@/lib/FilterContext";
import { AppPreferences } from "@/components/AppPreferences";
import { SessionProvider } from "@/components/SessionProvider";
import { getCurrentUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  // middleware.ts already redirects any unauthenticated request to /login before this layout
  // renders -- this check exists to fail safely (not crash SessionProvider on a null user)
  // if that ever isn't true, not as the primary access control.
  if (!user) redirect("/login");

  return (
    <SessionProvider user={user}>
      <div className="flex h-screen overflow-hidden w-full">
        {/* Background Decorative Blobs */}
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

        <AppPreferences>
          <Sidebar />
          <div className="flex-1 h-screen overflow-y-auto relative z-10 w-full flex flex-col">
            <MobileHeader />
            <main className="flex-1">
              <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-[1600px] mx-auto min-h-full">
                <FilterProvider>{children}</FilterProvider>
              </div>
            </main>
          </div>
        </AppPreferences>
      </div>
    </SessionProvider>
  );
}
