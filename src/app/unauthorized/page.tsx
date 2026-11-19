import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <Card className="max-w-md w-full border-slate-200 dark:border-slate-800 text-center shadow-md">
        <CardHeader className="pb-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-3">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl text-slate-900 dark:text-white">
            Access Unauthorized
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
          <p>
            Your current account role does not have authorization to view this resource.
          </p>
          <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs font-mono text-left text-slate-700 dark:text-slate-300">
            Policy Check: Server-side role guard failure (403 Forbidden).
          </div>
          <p className="text-xs text-muted-foreground">
            If you are a student or faculty member and believe this to be an error, contact your departmental coordinator.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-3 pt-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Link>
          </Button>
          <Button asChild className="bg-[#006a4e] hover:bg-[#00553e] text-white">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
