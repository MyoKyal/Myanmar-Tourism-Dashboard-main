import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDestinationForEdit } from "@/actions/manageDestinations";
import { DestinationForm } from "@/components/DestinationForm";

export default async function EditDestinationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isNew = id === "new";
  if (isNew && user.role !== "SUPER_ADMIN") redirect("/manage-destinations");

  const name = decodeURIComponent(id);

  // Page-level courtesy redirect for a Destination Manager who lands on someone else's edit
  // URL -- send them to their own instead of showing a form they'll only get rejected from
  // on submit. Checked against the URL param directly, before ever calling
  // getDestinationForEdit, so the normal "wrong link" case is a redirect rather than the
  // error that action now throws for a mismatched name (its own defense-in-depth check,
  // which can't be bypassed by skipping this page).
  if (!isNew && user.role === "DESTINATION_MANAGER" && name !== user.assignedDestination) {
    redirect(user.assignedDestination ? `/manage-destinations/${encodeURIComponent(user.assignedDestination)}` : "/manage-destinations");
  }

  const initial = isNew ? null : await getDestinationForEdit(name);
  if (!isNew && !initial) notFound();

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  return (
    <DestinationForm
      initial={initial}
      isNew={isNew}
      canRename={isSuperAdmin}
      canChangeStatus={isSuperAdmin}
      canDelete={isSuperAdmin}
    />
  );
}
