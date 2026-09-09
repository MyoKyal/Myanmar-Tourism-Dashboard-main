import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getUsersForAdmin } from "@/actions/manageUsers";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  DESTINATION_MANAGER: "Destination Manager",
  BUSINESS_USER: "Business User",
  TOURIST: "Tourist",
};

export default async function ManageUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "SUPER_ADMIN") redirect("/");

  const users = await getUsersForAdmin();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Manage Users</h1>
          <p className="text-slate-400 mt-2">Create and manage accounts across every role.</p>
        </div>
        <Link
          href="/manage-users/new"
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
        >
          <Plus className="w-4 h-4" /> Add User
        </Link>
      </div>

      <div className="glass-panel overflow-x-auto p-0">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Email</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Scope</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                <td className="px-5 py-3">
                  <Link href={`/manage-users/${u._id}`} className="font-semibold text-slate-200 hover:text-cyan-400 transition-colors">
                    {u.fullName}
                  </Link>
                </td>
                <td className="px-5 py-3 text-slate-400 font-mono text-xs">{u.email}</td>
                <td className="px-5 py-3 text-slate-300">{ROLE_LABEL[u.role]}</td>
                <td className="px-5 py-3 text-slate-500 text-xs">{u.assignedDestination || u.businessName || "—"}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${u.status === "ACTIVE" ? "bg-emerald-900/40 text-emerald-400" : "bg-slate-700/40 text-slate-400"}`}>
                    {u.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
