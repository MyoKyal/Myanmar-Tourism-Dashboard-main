"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { saveUserAction, type SaveUserState } from "@/actions/manageUsers";
import type { UserRecord } from "@/lib/documentStore";
import type { Role } from "@/lib/auth";

const inputClass = "w-full rounded-lg border border-slate-700/50 bg-slate-950/50 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 transition-colors";
const labelClass = "text-sm font-semibold text-slate-400 mb-1.5 block";

const initialState: SaveUserState = { error: null };

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "DESTINATION_MANAGER", label: "Destination Manager" },
  { value: "BUSINESS_USER", label: "Business User" },
  { value: "TOURIST", label: "Tourist" },
];

export function UserForm({
  initial,
  isNew,
  isSelf,
  destinationOptions,
}: {
  initial: Omit<UserRecord, "passwordHash"> | null;
  isNew: boolean;
  isSelf: boolean;
  destinationOptions: string[];
}) {
  const [state, formAction, pending] = useActionState(saveUserAction, initialState);
  const [role, setRole] = useState<Role>(initial?.role || "TOURIST");

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/manage-users" className="p-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">{isNew ? "Add User" : `Edit ${initial?.fullName}`}</h1>
          {isSelf && <p className="text-slate-400 text-sm mt-1">This is your own account -- role and status changes that would lock you out are blocked.</p>}
        </div>
      </div>

      <form action={formAction} className="glass-panel p-6 flex flex-col gap-5">
        <input type="hidden" name="userId" value={isNew ? "" : initial?._id || ""} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <label>
            <span className={labelClass}>Full name</span>
            <input name="fullName" defaultValue={initial?.fullName || ""} required className={inputClass} />
          </label>
          <label>
            <span className={labelClass}>Email</span>
            {/* readOnly, not disabled: a disabled input is dropped from FormData entirely on
                submit (browsers never include disabled controls), which would make every edit
                fail server-side validation with "email is required" for a reason invisible
                from this screen -- caught by testing this exact path, not by inspection.
                readOnly still submits the value while blocking edits in the UI. */}
            <input name="email" type="email" defaultValue={initial?.email || ""} required readOnly={!isNew} className={`${inputClass} ${!isNew ? "opacity-60 cursor-not-allowed" : ""}`} />
          </label>
          <label>
            <span className={labelClass}>Role</span>
            {/* A <select disabled> also never submits its value -- unlike the readOnly fix
                above, readOnly isn't meaningful on <select> in HTML, so the locked case
                drops the `name` from the visible control and submits the real value through
                a parallel hidden input instead. */}
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={isSelf} name={isSelf ? undefined : "role"} className={`${inputClass} appearance-none disabled:opacity-60`}>
              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {isSelf && <input type="hidden" name="role" value={role} />}
          </label>
          <label>
            <span className={labelClass}>Status</span>
            <select defaultValue={initial?.status || "ACTIVE"} disabled={isSelf} name={isSelf ? undefined : "status"} className={`${inputClass} appearance-none disabled:opacity-60`}>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            {isSelf && <input type="hidden" name="status" value={initial?.status || "ACTIVE"} />}
          </label>

          {role === "DESTINATION_MANAGER" && (
            <label>
              <span className={labelClass}>Assigned destination</span>
              <select name="assignedDestination" defaultValue={initial?.assignedDestination || ""} className={`${inputClass} appearance-none`}>
                <option value="">Select a destination</option>
                {destinationOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
          )}
          {role === "BUSINESS_USER" && (
            <label>
              <span className={labelClass}>Business name</span>
              <input name="businessName" defaultValue={initial?.businessName || ""} className={inputClass} />
            </label>
          )}

          <label>
            <span className={labelClass}>{isNew ? "Password" : "New password (optional)"}</span>
            <input name="password" type="password" placeholder={isNew ? "" : "Leave blank to keep current password"} className={inputClass} />
            <span className="text-[11px] text-slate-500 mt-1 block">At least 8 characters.</span>
          </label>
        </div>

        {state.error && <p className="text-sm text-rose-400 bg-rose-950/40 border border-rose-800/50 rounded-lg px-3 py-2">{state.error}</p>}

        <div className="pt-2 border-t border-white/10">
          <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white font-semibold px-5 py-2.5 transition-colors">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {pending ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
