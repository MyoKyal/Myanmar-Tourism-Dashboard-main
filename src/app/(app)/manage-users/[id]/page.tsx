import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getUserForEdit } from "@/actions/manageUsers";
import { getAllDestinations } from "@/lib/documentStore";
import { UserForm } from "@/components/UserForm";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (currentUser.role !== "SUPER_ADMIN") redirect("/");

  const isNew = id === "new";
  const initial = isNew ? null : await getUserForEdit(id);
  if (!isNew && !initial) notFound();

  // includeInactive: true -- a manager may already be assigned to a destination a Super
  // Admin has since deactivated. Excluding it here would make the select silently fall back
  // to the empty placeholder instead of showing their real assignment.
  const destinations = await getAllDestinations(true);

  return (
    <UserForm
      initial={initial}
      isNew={isNew}
      isSelf={!isNew && initial?.email === currentUser.email}
      destinationOptions={destinations.map((d) => d.destination)}
    />
  );
}
