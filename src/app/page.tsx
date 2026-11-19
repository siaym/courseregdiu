import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/roles";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile(user);
  if (profile?.role === "admin") {
    redirect("/admin/emails");
  }

  if (profile?.role === "advisor" || profile?.role === "department_head") {
    redirect("/advisor");
  }

  if (profile?.role === "student" && !profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}
