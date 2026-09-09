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

  const destinations = await getAllDestinations();

  return (
    <UserForm
      initial={initial}
      isNew={isNew}
      isSelf={!isNew && initial?.email === currentUser.email}
      destinationOptions={destinations.map((d) => d.destination)}
    />
  );
}
