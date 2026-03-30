import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route, Outlet, ScrollRestoration } from "react-router-dom";
import { AuthProvider } from "@/features/auth/hooks/useAuth";
import { HelmetProvider } from "react-helmet-async";

import Index from "@/features/feed/pages/Index";
import Auth from "@/features/auth/pages/Auth";
import UpdatePassword from "@/features/auth/pages/UpdatePassword";
import Onboarding from "@/features/auth/pages/Onboarding";
import Terms from "./pages/Terms";
import Explore from "@/features/explore/pages/Explore";
import Search from "@/features/search/SearchPage";
import Post from "./pages/Post";
import Profile from "@/features/profile/pages/Profile";
import UserPhotoGallery from "@/features/profile/pages/UserPhotoGallery";
import Settings from "@/features/profile/pages/Settings";
import NotFound from "./pages/NotFound";
import BuildingDetails from "@/features/buildings/pages/BuildingDetails";
import ArchitectDashboard from "@/features/architect/pages/ArchitectDashboard";
import ArchitectDetails from "@/features/architect/pages/ArchitectDetails";
import EditArchitect from "@/features/architect/pages/EditArchitect";
import ReviewDetails from "@/features/buildings/pages/ReviewDetails";
import Notifications from "@/features/notifications/pages/Notifications";
import Connect from "@/features/connect/pages/Connect";
import AddBuilding from "@/features/buildings/pages/AddBuilding";
import EditBuilding from "@/features/buildings/pages/EditBuilding";
import WriteReview from "@/features/buildings/pages/WriteReview";
import CollectionMap from "@/features/collections/components/CollectionMapPage";
import FolderView from "@/features/profile/pages/FolderView";

import { PwaPrompt } from "@/components/pwa/PwaPrompt";
import { PwaProvider } from "@/hooks/usePwaInstall";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { useLoginTracker } from "@/features/auth/hooks/useLoginTracker";
import { usePresenceTracker } from "@/features/auth/hooks/usePresenceTracker";
import { logDiagnosticError } from "@/features/admin/api/diagnostics";

// Admin Imports
import AdminDashboard from "@/features/admin/pages/Dashboard";
import Buildings from "@/features/admin/pages/Buildings";
import MergeBuildings from "@/features/admin/pages/MergeBuildings";
import MergeComparison from "@/features/admin/pages/MergeComparison";
import Users from "@/features/admin/pages/Users";
import Moderation from "@/features/admin/pages/Moderation";
import ImageWall from "@/features/admin/pages/ImageWall";
import PhotoAnalytics from "@/features/admin/pages/PhotoAnalytics";
import BuildingAudit from "@/features/admin/pages/BuildingAudit";
import StorageJobs from "@/features/admin/pages/StorageJobs";
import ArchitectClaims from "@/features/admin/pages/ArchitectClaims";
import { AdminGuard } from "@/features/admin/components/AdminGuard";
import AdminLayout from "@/features/admin/components/AdminLayout";
import { MainLayout } from "@/components/layout/MainLayout";
import Unauthorized from "@/features/admin/pages/Unauthorized";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

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
  useLoginTracker();
  usePresenceTracker();

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
        <PwaPrompt />
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </PwaProvider>
    </TooltipProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
