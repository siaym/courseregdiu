import { getCurrentUser, getCurrentProfile } from "@/lib/auth/roles";
import { LandingView } from "@/components/landing/landing-view";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    return <LandingView isAuthenticated={false} dashboardHref="/login" />;
  }

  const profile = await getCurrentProfile(user);
  let dashboardHref = "/dashboard";

  if (profile?.role === "admin") {
    dashboardHref = "/admin/emails";
  } else if (profile?.role === "advisor" || profile?.role === "department_head") {
    dashboardHref = "/advisor";
  }

  return <LandingView isAuthenticated={true} dashboardHref={dashboardHref} />;
}
