import { Outlet, type MetaFunction } from "react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";

export const meta: MetaFunction = () => [{ name: "robots", content: "noindex, nofollow" }];

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="flex min-h-screen flex-col bg-surface-default">
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
