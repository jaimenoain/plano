import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/features/auth/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PwaProvider } from "@/hooks/usePwaInstall";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { CookieConsent } from "@/components/common/CookieConsent";
import { PwaPrompt } from "@/components/pwa/PwaPrompt";
import { AppErrorBoundary } from "@/components/common/AppErrorBoundary";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return Response.json({ session }, { headers });
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#ffffff" />
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

export default function Root() {
  const [queryClient] = useState(makeQueryClient);
  const { session } = useLoaderData<typeof loader>();

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider initialSession={session}>
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
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

