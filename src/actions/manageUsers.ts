"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAllUsers, getUserById, getUserByEmail, createUser, updateUser } from "@/lib/documentStore";
import type { Role } from "@/lib/auth";

export type SaveUserState = { error: string | null };

const VALID_ROLES: Role[] = ["SUPER_ADMIN", "DESTINATION_MANAGER", "BUSINESS_USER", "TOURIST"];

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    throw new Error("Only a Super Admin can manage user accounts.");
  }
  return user;
}

export async function getUsersForAdmin() {
  await requireSuperAdmin();
  return getAllUsers();
}

export async function getUserForEdit(id: string) {
  await requireSuperAdmin();
  return getUserById(id);
}

export async function saveUserAction(_prev: SaveUserState, formData: FormData): Promise<SaveUserState> {
  const currentUser = await requireSuperAdmin();

  const userId = String(formData.get("userId") || "");
  const isNew = !userId;
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") || "").trim();
  const role = String(formData.get("role") || "") as Role;
  const status = formData.get("status") === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
  const assignedDestination = String(formData.get("assignedDestination") || "").trim();
  const businessName = String(formData.get("businessName") || "").trim();
  const passwordPlain = String(formData.get("password") || "");

  if (!email || !email.includes("@")) return { error: "Enter a valid email address." };
  if (!fullName) return { error: "Full name is required." };
  if (!VALID_ROLES.includes(role)) return { error: "Select a valid role." };
  if (role === "DESTINATION_MANAGER" && !assignedDestination) return { error: "A Destination Manager must have an assigned destination." };
  if (role === "BUSINESS_USER" && !businessName) return { error: "A Business User must have a business name." };
  if (isNew && passwordPlain.length < 8) return { error: "Password must be at least 8 characters." };
  if (!isNew && passwordPlain && passwordPlain.length < 8) return { error: "New password must be at least 8 characters (leave blank to keep the current one)." };

  // Safety check: a Super Admin locking their own account out (demoting themselves or
  // suspending themselves) has no recovery path in this app -- there's no second admin
  // account guaranteed to exist, and no "reset via email" flow. Blocking it here is cheaper
  // than writing account-recovery infrastructure for a mistake that's easy to just prevent.
  if (!isNew) {
    const existing = await getUserById(userId);
    if (existing && existing.email === currentUser.email) {
      if (role !== "SUPER_ADMIN") return { error: "You cannot change your own role away from Super Admin." };
      if (status !== "ACTIVE") return { error: "You cannot suspend your own account." };
    }
  }

  if (isNew) {
    const existing = await getUserByEmail(email);
    if (existing) return { error: "An account with this email already exists." };
    await createUser({
      email, fullName, role, status,
      assignedDestination: role === "DESTINATION_MANAGER" ? assignedDestination : undefined,
      businessName: role === "BUSINESS_USER" ? businessName : undefined,
      passwordPlain,
    });
  } else {
    await updateUser(userId, {
      fullName, role, status,
      assignedDestination: role === "DESTINATION_MANAGER" ? assignedDestination : undefined,
      businessName: role === "BUSINESS_USER" ? businessName : undefined,
      ...(passwordPlain ? { passwordPlain } : {}),
    });
  }

  redirect("/manage-users");
}
