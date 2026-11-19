"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Development authentication helper to test real server-side role resolution
 * and onboarding enforcement without requiring external Google OAuth in local offline testing.
 * Disabled in production environments.
 */
export async function setDevSession(role: "student" | "student_new" | "advisor") {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development authentication is prohibited in production.");
  }

  const cookieStore = await cookies();
  cookieStore.set("diu_session_role", role, {
    httpOnly: true,
    secure: false,
    path: "/",
    sameSite: "lax",
  });

  if (role === "student_new") {
    cookieStore.delete("diu_onboarded_student_data");
    redirect("/onboarding");
  }

  if (role === "advisor") {
    redirect("/advisor");
  }

  redirect("/dashboard");
}

export async function clearSession() {
  try {
    const supabase = await getSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {}

  const cookieStore = await cookies();
  cookieStore.delete("diu_session_role");
  cookieStore.delete("diu_onboarded_student_data");

  redirect("/login");
}
