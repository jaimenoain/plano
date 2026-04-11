import { StrictMode, useCallback, useEffect, useState } from "react";
import {
  Links,
  Link,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useLoaderData,
  useRevalidator,
  useRouteError,
  type LoaderFunctionArgs,
} from "react-router";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { PwaProvider } from "@/hooks/usePwaInstall";
import { useVersionNotification } from "@/hooks/useVersionNotification";
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
import {
  createSupabaseServerClient,
  getSessionForClientHydration,
} from "@/lib/supabase.server";
import { parseSidebarOpenFromRequest } from "@/lib/sidebar-cookie";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { Session } from "@supabase/supabase-js";
import { Analytics } from "@vercel/analytics/react";
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
  const session = await getSessionForClientHydration(supabase);

  return Response.json(
    {
      session,
      sidebarOpen: parseSidebarOpenFromRequest(request),
    },
    { headers: responseHeaders }
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@700;900&family=Inter:wght@300;400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        {/* Google tag (gtag.js) */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-QW7R06L5TL"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', 'G-QW7R06L5TL');
`,
          }}
        />
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#000000" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <Links />
        <Meta />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function AppShell({ initialSidebarOpen }: { initialSidebarOpen: boolean | null }) {
  const { user, loading: authLoading } = useAuth();

  const notifyVersion = useCallback((version: string) => {
    toast.info(`Plano has been updated`, {
      description: `You're now on v${version}. Reload for the latest experience.`,
      action: {
        label: "Reload",
        onClick: () => window.location.reload(),
      },
      duration: 15_000,
    });
  }, []);

  useVersionNotification(notifyVersion);

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
    <SidebarProvider
      defaultOpen={true}
      initialOpen={initialSidebarOpen ?? undefined}
    >
      <TooltipProvider>
        <PwaProvider>
          <GoogleAnalytics />
          <Analytics />
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
  const { session, sidebarOpen } = useLoaderData<typeof loader>() as {
    session: Session | null;
    sidebarOpen: boolean | null;
  };
  const [queryClient] = useState(makeQueryClient);

  return (
    <StrictMode>
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider initialSession={session}>
            <AppShell initialSidebarOpen={sidebarOpen} />
          </AuthProvider>
        </QueryClientProvider>
      </AppErrorBoundary>
    </StrictMode>
  );
}

export function HydrateFallback() {
  return <RouteLoadingFallback />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  const revalidator = useRevalidator();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-surface-default px-8 py-16 text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary">Page not found</h1>
          <p className="max-w-md text-sm text-text-secondary">
            The page you are looking for does not exist.
          </p>
          <Button variant="outline" asChild>
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-surface-default px-8 py-16 text-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-feedback-destructive" />
        <h1 className="text-2xl font-semibold text-text-primary">Something went wrong</h1>
        <p className="max-w-md text-sm text-text-secondary">
          An unexpected error occurred. Try refreshing the page.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh page
          </Button>
          <Button
            type="button"
            onClick={() => revalidator.revalidate()}
            disabled={revalidator.state === "loading"}
          >
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

