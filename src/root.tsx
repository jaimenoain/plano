import { StrictMode, useEffect, useState } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { PwaProvider } from "@/hooks/usePwaInstall";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { CookieConsent } from "@/components/common/CookieConsent";
import { PwaPrompt } from "@/components/pwa/PwaPrompt";
import { AppErrorBoundary } from "@/components/common/AppErrorBoundary";
import { RouteLoadingFallback } from "@/components/common/RouteLoadingFallback";
import { AuthProvider, useAuth } from "@/features/auth/hooks/useAuth";
import { useLoginTracker } from "@/features/auth/hooks/useLoginTracker";
import { usePresenceTracker } from "@/features/auth/hooks/usePresenceTracker";
import { logDiagnosticError } from "@/features/admin/api/diagnostics";
import { setSentryUser } from "@/lib/sentry";
import { createSupabaseServerClient } from "@/lib/supabase.server";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { Session } from "@supabase/supabase-js";
import "./index.css";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const responseHeaders = new Headers();
  const supabase = createSupabaseServerClient(request, responseHeaders);

  // getSession() is safe here — we only need the session for initial hydration.
  // Privileged server operations in loaders (Phase 4+) will use getUser() instead.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return Response.json(
    { session },
    { headers: responseHeaders }
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function AppShell() {
  const { user, loading: authLoading } = useAuth();

  useLoginTracker();
  usePresenceTracker();

  useEffect(() => {
    if (authLoading) return;
    setSentryUser(user?.id ?? null);
  }, [user, authLoading]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logDiagnosticError("GlobalError", event.message, event.error?.stack);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logDiagnosticError("UnhandledRejection", String(event.reason));
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return (
    <SidebarProvider defaultOpen={true}>
      <TooltipProvider>
        <PwaProvider>
          <GoogleAnalytics />
          <CookieConsent />
          <PwaPrompt />
          <Toaster />
          <Sonner />
          <Outlet />
        </PwaProvider>
      </TooltipProvider>
    </SidebarProvider>
  );
}

export default function Root() {
  const { session } = useLoaderData<typeof loader>() as { session: Session | null };
  const [queryClient] = useState(makeQueryClient);

  return (
    <StrictMode>
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider initialSession={session}>
            <AppShell />
          </AuthProvider>
        </QueryClientProvider>
      </AppErrorBoundary>
    </StrictMode>
  );
}

export function HydrateFallback() {
  return <RouteLoadingFallback />;
}

