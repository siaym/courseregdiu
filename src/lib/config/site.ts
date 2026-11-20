/**
 * Site & Application Domain Configuration
 * 
 * Provides dynamic base URL resolution for Google OAuth consent,
 * public callbacks, and canonical links.
 * 
 * In the future, if you change your custom domain:
 * 1. Update NEXT_PUBLIC_APP_URL in .env.local and your production hosting environment (e.g. Vercel)
 * 2. Update Authorized Domains in Google Cloud Console
 * 3. Update Redirect URLs in Supabase Auth -> URL Configuration
 */

export function getAppUrl(): string {
  // 1. Explicit environment variable (Primary)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // 2. Vercel deployment URL fallback
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`.replace(/\/$/, "");
  }

  // 3. Client-side browser runtime origin
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  // 4. Default production domain fallback
  return "https://courseregdiu.asf.run";
}

export const SITE_CONFIG = {
  name: "DIU Course Registration System",
  shortName: "DIU Course Registration",
  institution: "Daffodil International University",
  campus: "Daffodil Smart City, Birulia, Savar, Dhaka-1216, Bangladesh",
  contactEmail: "support@diu.edu.bd",
  registrarEmail: "registrar@diu.edu.bd",
  phone: "+880 2 224441833",
  allowedDomain: "diu.edu.bd",
  defaultAppUrl: "https://courseregdiu.asf.run",
  
  get homeUrl() {
    return `${getAppUrl()}/`;
  },
  get privacyUrl() {
    return `${getAppUrl()}/privacy`;
  },
  get termsUrl() {
    return `${getAppUrl()}/terms`;
  },
  get loginUrl() {
    return `${getAppUrl()}/login`;
  },
};
