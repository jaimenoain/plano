import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarGroup,
  SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarFooter,
} from 'plano';
import { Map, Building2, Bookmark, Users, Settings } from 'lucide-react';

export const AppShell = () => (
  <div style={{ height: 560, border: '1px solid var(--border-default)', overflow: 'hidden', display: 'flex' }}>
    <SidebarProvider style={{ minHeight: 0 }}>
      <Sidebar>
        <SidebarHeader>
          <div style={{ padding: '4px 8px' }}>
            <div style={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: 18 }}>Plano</div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-secondary)' }}>
              Architecture archive
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Discover</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem><SidebarMenuButton isActive><Map />Map</SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton><Building2 />Buildings</SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton><Bookmark />Collections</SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton><Users />Curators</SidebarMenuButton></SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem><SidebarMenuButton><Settings />Settings</SidebarMenuButton></SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <main style={{ marginLeft: '18rem', flex: 1, background: 'var(--surface-card)', padding: 28 }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-secondary)' }}>
          Helsinki · 1962
        </div>
        <h2 style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.02em', margin: '4px 0 0' }}>Villa Saarinen</h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)', maxWidth: 440, marginTop: 12 }}>
          A monolithic concrete residence set into the Finnish hillside, its cantilevered volumes framing the lake below.
        </p>
      </main>
    </SidebarProvider>
  </div>
);
