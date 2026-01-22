import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route, Outlet, ScrollRestoration } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { HelmetProvider } from "react-helmet-async";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import UpdatePassword from "./pages/UpdatePassword";
import Onboarding from "./pages/Onboarding";
import Terms from "./pages/Terms";
import Search from "@/features/search/SearchPage";
import Post from "./pages/Post";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import GroupSettings from "./pages/GroupSettings";
import NotFound from "./pages/NotFound";
import BuildingDetails from "./pages/BuildingDetails";
import ReviewDetails from "./pages/ReviewDetails";
import Notifications from "./pages/Notifications";
import Groups from "./pages/Groups";
import CreateSession from "./pages/CreateSession";
import AddBuilding from "./pages/AddBuilding";
import EditBuilding from "./pages/EditBuilding";

import GroupLayout from "./pages/groups/GroupLayout";
import GroupSessions from "./pages/groups/GroupSessions";
import GroupFeed from "./pages/groups/GroupFeed";
import GroupMembers from "./pages/groups/GroupMembers";
import GroupBucketList from "./pages/groups/GroupBucketList";
// import GroupStatsView from "./pages/groups/GroupStatsView";
import GroupCycles from "./pages/groups/cycles/GroupCycles";
import CycleDetails from "./pages/groups/cycles/CycleDetails";
import PollsTab from "./components/groups/polls/PollsTab";
import PollDetails from "./pages/groups/polls/PollDetails";
import LivePollAdmin from "./pages/groups/live/LivePollAdmin";
import LivePollParticipant from "./pages/groups/live/LivePollParticipant";
import LivePollProjector from "./pages/groups/live/LivePollProjector";
import TinderSession from "./pages/groups/live/TinderSession";
import { PipelineTabWrapper } from "./components/groups/pipeline/PipelineTabWrapper";
import SessionDetails from "./pages/groups/sessions/SessionDetails";
import { PwaPrompt } from "./components/pwa/PwaPrompt";
import { PwaProvider } from "@/hooks/usePwaInstall";
import { GoogleAnalytics } from "./components/GoogleAnalytics";
import { useLoginTracker } from "./hooks/useLoginTracker";
import { usePresenceTracker } from "./hooks/usePresenceTracker";
import { logDiagnosticError } from "./api/diagnostics";

// Admin Imports
import AdminDashboard from "./pages/admin/Dashboard";
import { AdminGuard } from "./components/admin/AdminGuard";

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
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/search" element={<Search />} />
      <Route path="/post" element={<Post />} />
      <Route path="/notifications" element={<Notifications />} />

      <Route path="/add-building" element={<AddBuilding />} />

      <Route path="/groups" element={<Groups />} />
      
      {/* Admin Route */}
      <Route path="/admin" element={
        <AdminGuard>
          <AdminDashboard />
        </AdminGuard>
      } />

      {/* NESTED GROUP ROUTES */}
      <Route path="/groups/:slug" element={<GroupLayout />}>
        <Route index element={<GroupSessions />} />
        <Route path="cycles" element={<GroupCycles />} />
        <Route path="cycles/:cycleSlug" element={<CycleDetails />} />
        <Route path="feed" element={<GroupFeed />} />
        <Route path="polls" element={<PollsTab />} />
        <Route path="polls/:pollSlug" element={<PollDetails />} />
        <Route path="watchlist" element={<GroupBucketList />} />
        <Route path="pipeline" element={<PipelineTabWrapper />} />
        <Route path="members" element={<GroupMembers />} />
        {/* <Route path="stats" element={<GroupStatsView />} /> */}
      </Route>

      <Route path="/groups/:slug/session/create" element={<CreateSession />} />
      <Route path="/groups/:slug/session/:sessionId/edit" element={<CreateSession />} />
      <Route path="/groups/:slug/live/:pollSlug/admin" element={<LivePollAdmin />} />
      <Route path="/groups/:slug/live/:pollSlug/projector" element={<LivePollProjector />} />
      <Route path="/groups/:slug/live/:pollSlug/tinder" element={<TinderSession />} />
      <Route path="/groups/:slug/live/:pollSlug" element={<LivePollParticipant />} />
      <Route path="/groups/:slug/settings" element={<GroupSettings />} />
      <Route path="/groups/:slug/sessions/:sessionSlug/:sessionId" element={<GroupLayout />}>
        <Route index element={<SessionDetails />} />
      </Route>
      {/* Fallback for old links */}
      <Route path="/groups/:slug/sessions/:sessionId" element={<GroupLayout />}>
        <Route index element={<SessionDetails />} />
      </Route>

      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:username" element={<Profile />} />
      <Route path="/settings" element={<Settings />} />

      <Route path="/building/:id" element={<BuildingDetails />} />
      <Route path="/building/:id/edit" element={<EditBuilding />} />
      <Route path="/review/:id" element={<ReviewDetails />} />

      <Route path="*" element={<NotFound />} />
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
