import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="flex min-h-screen flex-col bg-surface-default">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border-default bg-surface-card px-8">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
