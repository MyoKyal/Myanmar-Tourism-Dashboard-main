import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getDestinationsForAdmin } from "@/actions/manageDestinations";

// A Destination Manager only ever has one destination to manage, so a list-of-one page would
// be a pointless extra click -- send them straight to their own edit form. Only a Super
// Admin (who genuinely has many to choose from) sees the table below.
export default async function ManageDestinationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "DESTINATION_MANAGER") {
    if (!user.assignedDestination) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-3">
          <ShieldAlert className="w-8 h-8 text-amber-400" />
          <p className="text-slate-300 font-semibold">No destination is assigned to your account yet.</p>
          <p className="text-slate-500 text-sm max-w-sm">Ask a Super Admin to assign one before you can manage destination data.</p>
        </div>
      );
    }
    redirect(`/manage-destinations/${encodeURIComponent(user.assignedDestination)}`);
  }

  const destinations = await getDestinationsForAdmin();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Manage Destinations</h1>
          <p className="text-slate-400 mt-2">Edit the catalog the Decision Center scores and recommends from.</p>
        </div>
        <Link
          href="/manage-destinations/new"
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Destination
        </Link>
      </div>

      <div className="glass-panel overflow-x-auto p-0">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3 font-semibold">Destination</th>
              <th className="px-5 py-3 font-semibold">Daily Cost</th>
              <th className="px-5 py-3 font-semibold">Safety Score</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold text-right">Updated</th>
            </tr>
          </thead>
          <tbody>
            {destinations.map((d) => (
              <tr key={d.destination} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                <td className="px-5 py-3">
                  <Link href={`/manage-destinations/${encodeURIComponent(d.destination)}`} className="font-semibold text-slate-200 hover:text-cyan-400 transition-colors">
                    {d.destination}
                  </Link>
                  <div className="text-xs text-slate-500">{d.country}</div>
                </td>
                <td className="px-5 py-3 text-slate-300">${d.dailyCost}/day</td>
                <td className="px-5 py-3 text-slate-300">{d.safetyScore}/100</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${d.status === "ACTIVE" ? "bg-emerald-900/40 text-emerald-400" : "bg-slate-700/40 text-slate-400"}`}>
                    {d.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-xs text-slate-500">
                  {d.updatedAt ? new Date(d.updatedAt).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
