import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
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
import {
  createSupabaseServerClient,
  getSessionForClientHydration,
} from "~/lib/supabase.server";

export const meta: MetaFunction = () => [
  { title: "Plano — Architectural Discovery" },
  { name: "description", content: "Discover and review remarkable architecture from around the world." },
  { property: "og:site_name", content: "Plano" },
  { property: "og:type", content: "website" },
  { property: "og:title", content: "Plano — Architectural Discovery" },
  { property: "og:description", content: "Discover and review remarkable architecture from around the world." },
  { property: "og:image", content: "https://plano.app/og-default.jpg" },
  { property: "og:image:width", content: "1200" },
  { property: "og:image:height", content: "630" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:site", content: "@planoapp" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  const session = await getSessionForClientHydration(supabase);
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
        <meta name="description" content="Discover, document and share the world's most remarkable architecture. Plano is the community-maintained catalogue of notable buildings, architects and studios worldwide." />
        <meta property="og:site_name" content="Plano" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:type" content="website" />
        <meta name="twitter:site" content="@planoapp" />
        <meta name="twitter:card" content="summary_large_image" />
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

