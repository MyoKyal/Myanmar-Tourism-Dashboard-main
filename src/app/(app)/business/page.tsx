"use client";

import { Briefcase, Hammer } from "lucide-react";
import { usePreferences } from "@/components/AppPreferences";
import { useSession } from "@/components/SessionProvider";

// Honest placeholder, not a fake dashboard: no business-owned entity (a hotel or tour
// operator account tied to this user) exists in the data model yet -- that's Phase 3
// ("Manage hotels", "Manage tour operators", ownership linking) from the architecture
// blueprint. Showing invented occupancy/booking numbers here would violate the same
// real-vs-simulated-data discipline the rest of this app has been built around.
export default function BusinessPage() {
  const { t } = usePreferences();
  const user = useSession();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-purple-900/30 border border-purple-800/40 flex items-center justify-center text-purple-400">
        <Briefcase className="w-7 h-7" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">{t("Business Dashboard")}</h1>
        <p className="text-slate-400 max-w-md mx-auto">
          {user.businessName ? `${user.businessName} — ` : ""}
          Signed in as a Business User. Booking trends, occupancy, and revenue for your own
          listing aren&apos;t built yet — that needs hotels and tour packages to be linked to an
          owning account first (Phase 3 of the platform roadmap).
        </p>
      </div>
      <div className="glass-panel px-4 py-3 flex items-center gap-2.5 text-sm text-slate-400 mt-2">
        <Hammer className="w-4 h-4 text-amber-400 shrink-0" />
        Coming in Phase 3: hotel/tour-operator management, then this dashboard.
      </div>
    </div>
  );
}
