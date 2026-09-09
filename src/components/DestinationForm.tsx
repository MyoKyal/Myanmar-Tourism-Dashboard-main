"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, Save, Trash2, ArrowLeft } from "lucide-react";
import { saveDestinationAction, deleteDestinationAction, type SaveDestinationState } from "@/actions/manageDestinations";
import { MONTHS } from "@/lib/months";
import type { DestinationProfile } from "@/lib/documentStore";

const inputClass = "w-full rounded-lg border border-slate-700/50 bg-slate-950/50 px-3 py-2 text-slate-200 outline-none focus:border-cyan-500 transition-colors";
const labelClass = "text-sm font-semibold text-slate-400 mb-1.5 block";

const initialState: SaveDestinationState = { error: null };

export function DestinationForm({
  initial,
  isNew,
  canRename,
  canChangeStatus,
  canDelete,
}: {
  initial: DestinationProfile | null;
  isNew: boolean;
  canRename: boolean;
  canChangeStatus: boolean;
  canDelete: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveDestinationAction, initialState);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/manage-destinations" className="p-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">{isNew ? "Add Destination" : `Edit ${initial?.destination}`}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {canRename ? "Changes take effect immediately in Decision Center scoring and clustering." : "You can edit your assigned destination's details. Only a Super Admin can rename, deactivate, or delete a destination."}
          </p>
        </div>
      </div>

      <form id="destination-form" action={formAction} className="glass-panel p-6 flex flex-col gap-5">
        <input type="hidden" name="originalName" value={isNew ? "" : initial?.destination || ""} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <label>
            <span className={labelClass}>Destination name</span>
            {/* readOnly, not disabled: a disabled input is excluded from FormData entirely on
                submit, which would silently drop the destination name from every Destination
                Manager's save (they always have canRename=false) and fail validation on the
                server for a reason invisible from this screen. readOnly still submits the
                value while blocking edits in the UI. */}
            <input name="destination" defaultValue={initial?.destination || ""} required readOnly={!canRename} className={`${inputClass} ${!canRename ? "opacity-60 cursor-not-allowed" : ""}`} />
          </label>
          <label>
            <span className={labelClass}>Country</span>
            <input name="country" defaultValue={initial?.country || "Myanmar"} required className={inputClass} />
          </label>
          <label>
            <span className={labelClass}>Typical daily cost (USD)</span>
            <input name="dailyCost" type="number" min="1" step="1" defaultValue={initial?.dailyCost ?? ""} required className={inputClass} />
          </label>
          <label>
            <span className={labelClass}>Safety score (0-100)</span>
            <input name="safetyScore" type="number" min="0" max="100" step="1" defaultValue={initial?.safetyScore ?? 50} required className={inputClass} />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <label>
            <span className={labelClass}>Safety notes (English)</span>
            <textarea name="safetyNotes" rows={3} defaultValue={initial?.safetyNotes || ""} className={inputClass} />
          </label>
          <label>
            <span className={labelClass}>Safety notes (Burmese)</span>
            <textarea name="safetyNotesMm" rows={3} defaultValue={initial?.safetyNotesMm || ""} className={inputClass} />
          </label>
          <label>
            <span className={labelClass}>Visa note (English)</span>
            <textarea name="visaRule" rows={3} defaultValue={initial?.visaRule || ""} className={inputClass} />
          </label>
          <label>
            <span className={labelClass}>Visa note (Burmese)</span>
            <textarea name="visaRuleMm" rows={3} defaultValue={initial?.visaRuleMm || ""} className={inputClass} />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <span className={labelClass}>Peak months</span>
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((m) => (
                <label key={m} className="flex items-center gap-1.5 text-xs text-slate-400 px-2 py-1.5 rounded-md border border-slate-700/40 hover:bg-white/5 cursor-pointer">
                  <input type="checkbox" name="peakMonths" value={m} defaultChecked={initial?.peakMonths?.includes(m)} className="accent-cyan-500" />
                  {m.slice(0, 3)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <span className={labelClass}>Shoulder months</span>
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((m) => (
                <label key={m} className="flex items-center gap-1.5 text-xs text-slate-400 px-2 py-1.5 rounded-md border border-slate-700/40 hover:bg-white/5 cursor-pointer">
                  <input type="checkbox" name="shoulderMonths" value={m} defaultChecked={initial?.shoulderMonths?.includes(m)} className="accent-amber-500" />
                  {m.slice(0, 3)}
                </label>
              ))}
            </div>
          </div>
        </div>

        {canChangeStatus && (
          <label className="max-w-xs">
            <span className={labelClass}>Status</span>
            <select name="status" defaultValue={initial?.status || "ACTIVE"} className={`${inputClass} appearance-none`}>
              <option value="ACTIVE">Active -- eligible for recommendations</option>
              <option value="INACTIVE">Inactive -- hidden from Decision Center</option>
            </select>
          </label>
        )}

        {state.error && <p className="text-sm text-rose-400 bg-rose-950/40 border border-rose-800/50 rounded-lg px-3 py-2">{state.error}</p>}
      </form>

      {/* Deliberately outside the form above -- HTML forbids nesting <form> elements (it
          silently breaks, causing a hydration mismatch), so the Save button targets the form
          by id instead of being physically inside it. */}
      <div className="glass-panel p-4 flex items-center justify-between -mt-2">
        <button type="submit" form="destination-form" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white font-semibold px-5 py-2.5 transition-colors">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {pending ? "Saving..." : "Save"}
        </button>

        {canDelete && !isNew && (
          <form
            action={deleteDestinationAction}
            onSubmit={(e) => {
              if (!window.confirm(`Delete ${initial?.destination}? This cannot be undone.`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="destination" value={initial?.destination || ""} />
            <button type="submit" className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-400 hover:text-rose-300 px-3 py-2 transition-colors">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
