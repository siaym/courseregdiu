import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/roles";

export default async function AdminPage() {
  await requireAdmin("/admin");
  redirect("/admin/emails");
}
