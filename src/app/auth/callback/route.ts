import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Validate authenticated user domain
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "diu.edu.bd";
      if (user && user.email) {
        const userDomain = user.email.split("@")[1]?.toLowerCase();
        // Domain enforcement check
        if (process.env.NODE_ENV === "production" && userDomain !== allowedDomain) {
          await supabase.auth.signOut();
          const redirectUrl = new URL("/login", requestUrl.origin);
          redirectUrl.searchParams.set("error", "invalid_domain");
          return NextResponse.redirect(redirectUrl);
        }
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Return to login with error parameter if code exchange failed
  const errorRedirect = new URL("/login", requestUrl.origin);
  errorRedirect.searchParams.set("error", "oauth_failed");
  return NextResponse.redirect(errorRedirect);
}
