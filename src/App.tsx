import { Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route, Outlet, ScrollRestoration } from "react-router";
import { AuthProvider, useAuth } from "@/features/auth/hooks/useAuth";

import Index from "@/features/feed/pages/Index";
import Auth from "@/features/auth/pages/Auth";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";

import { lazyWithRetry } from "@/utils/lazyWithRetry";
import { RouteLoadingFallback } from "@/components/common/RouteLoadingFallback";
import { AppErrorBoundary } from "@/components/common/AppErrorBoundary";
import { RouteErrorBoundary } from "@/components/common/RouteErrorBoundary";

const UpdatePassword = lazyWithRetry(() => import("@/features/auth/pages/UpdatePassword"));
const Onboarding = lazyWithRetry(() => import("@/features/auth/pages/Onboarding"));
const Explore = lazyWithRetry(() => import("@/features/explore/pages/Explore"));
const Search = lazyWithRetry(() => import("@/features/search/SearchPage"));
const Post = lazyWithRetry(() => import("./pages/Post"));
const Profile = lazyWithRetry(() => import("@/features/profile/pages/Profile"));
const UserPhotoGallery = lazyWithRetry(() => import("@/features/profile/pages/UserPhotoGallery"));
const Settings = lazyWithRetry(() => import("@/features/profile/pages/Settings"));
const BuildingDetails = lazyWithRetry(() => import("@/features/buildings/pages/BuildingDetails"));
const ArchitectDashboard = lazyWithRetry(() => import("@/features/architect/pages/ArchitectDashboard"));
const ArchitectDetails = lazyWithRetry(() => import("@/features/architect/pages/ArchitectDetails"));
const EditArchitect = lazyWithRetry(() => import("@/features/architect/pages/EditArchitect"));
const ReviewDetails = lazyWithRetry(() => import("@/features/buildings/pages/ReviewDetails"));
const Notifications = lazyWithRetry(() => import("@/features/notifications/pages/Notifications"));
const Connect = lazyWithRetry(() => import("@/features/connect/pages/Connect"));
const AddBuilding = lazyWithRetry(() => import("@/features/buildings/pages/AddBuilding"));
const EditBuilding = lazyWithRetry(() => import("@/features/buildings/pages/EditBuilding"));
const WriteReview = lazyWithRetry(() => import("@/features/buildings/pages/WriteReview"));
const CollectionMap = lazyWithRetry(() => import("@/features/collections/components/CollectionMapPage"));
const FolderView = lazyWithRetry(() => import("@/features/profile/pages/FolderView"));

const AdminDashboard = lazyWithRetry(() => import("@/features/admin/pages/Dashboard"));
const Buildings = lazyWithRetry(() => import("@/features/admin/pages/Buildings"));
const MergeBuildings = lazyWithRetry(() => import("@/features/admin/pages/MergeBuildings"));
const MergeComparison = lazyWithRetry(() => import("@/features/admin/pages/MergeComparison"));
const Users = lazyWithRetry(() => import("@/features/admin/pages/Users"));
const Moderation = lazyWithRetry(() => import("@/features/admin/pages/Moderation"));
const ImageWall = lazyWithRetry(() => import("@/features/admin/pages/ImageWall"));
const PhotoAnalytics = lazyWithRetry(() => import("@/features/admin/pages/PhotoAnalytics"));
const BuildingAudit = lazyWithRetry(() => import("@/features/admin/pages/BuildingAudit"));
const StorageJobs = lazyWithRetry(() => import("@/features/admin/pages/StorageJobs"));
const ArchitectClaims = lazyWithRetry(() => import("@/features/admin/pages/ArchitectClaims"));
const Unauthorized = lazyWithRetry(() => import("@/features/admin/pages/Unauthorized"));

import { AdminGuard } from "@/features/admin/components/AdminGuard";
import AdminLayout from "@/features/admin/components/AdminLayout";
import { MainLayout } from "@/components/layout/MainLayout";

import { PwaPrompt } from "@/components/pwa/PwaPrompt";
import { PwaProvider } from "@/hooks/usePwaInstall";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { CookieConsent } from "@/components/common/CookieConsent";
import { useLoginTracker } from "@/features/auth/hooks/useLoginTracker";
import { usePresenceTracker } from "@/features/auth/hooks/usePresenceTracker";
import { logDiagnosticError } from "@/features/admin/api/diagnostics";
import { setSentryUser } from "@/lib/sentry";

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

const RootLayout = () => (
  <>
    <ScrollRestoration />
    <Outlet />
  </>
);

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      {/* Public / Standalone Routes */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/admin/unauthorized" element={<Unauthorized />} />

      {/* Accessible Merge Tools */}
      <Route path="/admin/merge" element={<MergeBuildings />} />
      <Route path="/admin/merge/:targetId/:sourceId" element={<MergeComparison />} />

      {/* Admin Routes */}
      <Route element={
        <AdminGuard>
          <AdminLayout />
        </AdminGuard>
      }>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/buildings" element={<Buildings />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/moderation" element={<Moderation />} />
        <Route path="/admin/images" element={<ImageWall />} />
        <Route path="/admin/photos" element={<PhotoAnalytics />} />
        <Route path="/admin/audit" element={<BuildingAudit />} />
        <Route path="/admin/claims" element={<ArchitectClaims />} />
        {/* Storage management tool */}
        <Route path="/admin/storage-jobs" element={<StorageJobs />} />
        <Route path="/admin/system" element={<div>System (Coming Soon)</div>} />
      </Route>

      {/* Main App Routes (Wrapped in Sidebar) */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Index />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/search" element={<Search />} />
        <Route path="/post" element={<Post />} />
        <Route path="/notifications" element={<Notifications />} />

        <Route path="/add-building" element={<AddBuilding />} />

        <Route path="/connect" element={<Connect />} />

        {/* Explicit 404: avoid matching /groups/* as /:username/folders/:slug (username = "groups") */}
        <Route path="/groups/*" element={<NotFound />} />

        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:username" element={<Profile />} />
        <Route path="/profile/photos" element={<UserPhotoGallery />} />
        <Route path="/profile/:username/photos" element={<UserPhotoGallery />} />
        <Route path="/settings" element={<Settings />} />

        <Route path="/:username/map/:slug" element={<CollectionMap />} />
        <Route path="/:username/folders/:slug" element={<FolderView />} />

        <Route path="/building/:id/:slug" element={<BuildingDetails />} />
        <Route path="/building/:id" element={<BuildingDetails />} />

        <Route path="/building/:id/:slug/edit" element={<EditBuilding />} />
        <Route path="/building/:id/edit" element={<EditBuilding />} />

        <Route path="/architect/dashboard" element={<ArchitectDashboard />} />
        <Route path="/architect/:id" element={<ArchitectDetails />} />
        <Route path="/architect/:id/edit" element={<EditArchitect />} />
        {/* Review Flow */}
        <Route path="/building/:id/:slug/review" element={<WriteReview />} />
        <Route path="/building/:id/review" element={<WriteReview />} />
        <Route path="/review/:id" element={<ReviewDetails />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Route>
  )
);

const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  useLoginTracker();
  usePresenceTracker();

  useEffect(() => {
    if (authLoading) return;
    setSentryUser(user?.id ?? null);
  }, [user, authLoading]);

  useEffect(() => {
    // Global error handler for diagnostic logging
    const handleError = (event: ErrorEvent) => {
      // Filter out noisy errors if needed, or log everything
      logDiagnosticError('GlobalError', event.message, event.error?.stack);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logDiagnosticError('UnhandledRejection', String(event.reason));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <TooltipProvider>
      <PwaProvider>
        <GoogleAnalytics />
        <CookieConsent />
        <PwaPrompt />
        <Toaster />
        <Sonner />
        <RouteErrorBoundary>
          <Suspense fallback={<RouteLoadingFallback />}>
            <RouterProvider router={router} />
          </Suspense>
        </RouteErrorBoundary>
      </PwaProvider>
    </TooltipProvider>
  );
};

const App = () => {
  const [queryClient] = useState(makeQueryClient);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
};

export default App;
