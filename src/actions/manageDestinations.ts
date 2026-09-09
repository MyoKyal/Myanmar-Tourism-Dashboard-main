"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAllDestinations, getDestinationProfile, upsertDestination, deleteDestinationRecord, reassignDestinationManagers } from "@/lib/documentStore";
import { MONTHS } from "@/lib/months";

export type SaveDestinationState = { error: string | null };

function parseNumber(value: FormDataEntryValue | null, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Called from the Super Admin's list page. Includes inactive destinations -- an admin needs
// to see (and be able to reactivate) a deactivated one, not just the active catalog Decision
// Center scoring uses. Super-Admin-only: a Destination Manager never reaches this page (see
// manage-destinations/page.tsx), so any other caller is a crafted request, not a real flow.
export async function getDestinationsForAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    throw new Error("Only a Super Admin can view the destination catalog.");
  }
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

  if (isNew) {
    const collision = await getDestinationProfile(destinationName);
    if (collision) return { error: "A destination with this name already exists." };
  }

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

  // A rename changes the destinations collection's key but nothing else knows about it --
  // without this, the manager assigned to the old name would be orphaned (their record and
  // JWT still point at a name that no longer resolves to any destination).
  if (originalName && destinationName !== originalName) {
    await reassignDestinationManagers(originalName, destinationName);
  }

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

// A Destination Manager legitimately calls this for their own row (see
// manage-destinations/[id]/page.tsx), so unlike getDestinationsForAdmin this can't be
// Super-Admin-only -- but a manager requesting a name other than their own is a crafted
// request (the page itself redirects them away before ever reaching here), not a real flow.
export async function getDestinationForEdit(name: string) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "DESTINATION_MANAGER")) {
    throw new Error("You are not authorized to view this destination.");
  }
  if (user.role === "DESTINATION_MANAGER" && name !== user.assignedDestination) {
    throw new Error("You can only view the destination assigned to your account.");
  }
  return getDestinationProfile(name);
}
