"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAllDestinations, getDestinationProfile, upsertDestination, deleteDestinationRecord } from "@/lib/documentStore";
import { MONTHS } from "@/lib/months";

export type SaveDestinationState = { error: string | null };

function parseNumber(value: FormDataEntryValue | null, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Called from the Super Admin's list page. Includes inactive destinations -- an admin needs
// to see (and be able to reactivate) a deactivated one, not just the active catalog Decision
// Center scoring uses.
export async function getDestinationsForAdmin() {
  return getAllDestinations(true);
}

export async function saveDestinationAction(_prev: SaveDestinationState, formData: FormData): Promise<SaveDestinationState> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "DESTINATION_MANAGER")) {
    return { error: "You are not authorized to manage destinations." };
  }

  const originalName = String(formData.get("originalName") || "");
  const isNew = !originalName;
  const destinationName = String(formData.get("destination") || "").trim();

  // Row-level scoping, re-checked here regardless of what the page already allowed (see the
  // comment on canAccessPath in lib/auth.ts) -- a Destination Manager can create nothing and
  // can only ever update the one destination their account is assigned to. Checked against
  // the JWT's assignedDestination, never against anything the submitted form claims, since a
  // crafted request could put any name in the form's own fields.
  if (user.role === "DESTINATION_MANAGER") {
    if (isNew) return { error: "Destination Managers cannot create new destinations -- ask a Super Admin." };
    if (!user.assignedDestination || originalName !== user.assignedDestination) {
      return { error: "You can only edit the destination assigned to your account." };
    }
    // A manager also can't rename their destination out from under their own assignment.
    if (destinationName !== user.assignedDestination) {
      return { error: "Destination Managers cannot rename their assigned destination." };
    }
  }

  if (!destinationName) return { error: "Destination name is required." };

  const peakMonths = formData.getAll("peakMonths").map(String).filter((m) => MONTHS.includes(m));
  const shoulderMonths = formData.getAll("shoulderMonths").map(String).filter((m) => MONTHS.includes(m));
  const dailyCost = parseNumber(formData.get("dailyCost"));
  const safetyScore = Math.max(0, Math.min(100, parseNumber(formData.get("safetyScore"), 50)));
  if (dailyCost <= 0) return { error: "Daily cost must be greater than zero." };

  // A Destination Manager never sees the status control (it's Super-Admin-only in the form),
  // so formData has no "status" field for them at all -- defaulting that case to "ACTIVE"
  // would silently reactivate a destination a Super Admin had deliberately deactivated, the
  // moment its assigned manager saved an unrelated edit. Preserve whatever the record's
  // current status already is instead of guessing one.
  const status = user.role === "SUPER_ADMIN"
    ? (formData.get("status") === "INACTIVE" ? "INACTIVE" : "ACTIVE")
    : (await getDestinationProfile(originalName))?.status ?? "ACTIVE";

  await upsertDestination(
    {
      destination: destinationName,
      country: String(formData.get("country") || "Myanmar"),
      dailyCost,
      safetyScore,
      safetyNotes: String(formData.get("safetyNotes") || ""),
      safetyNotesMm: String(formData.get("safetyNotesMm") || ""),
      peakMonths,
      shoulderMonths,
      visaRule: String(formData.get("visaRule") || ""),
      visaRuleMm: String(formData.get("visaRuleMm") || ""),
      status,
    },
    user.email,
    originalName || undefined
  );

  redirect("/manage-destinations");
}

export async function deleteDestinationAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    // Deletion is destructive and irreversible for the demo dataset -- restricted to Super
    // Admin only, unlike edits which a scoped Destination Manager may also make.
    throw new Error("Only a Super Admin can delete a destination.");
  }
  const name = String(formData.get("destination") || "");
  if (name) await deleteDestinationRecord(name);
  redirect("/manage-destinations");
}

export async function getDestinationForEdit(name: string) {
  return getDestinationProfile(name);
}
