import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Boxes, LayoutDashboard, Package, ClipboardList, LogOut, ShieldCheck,
  Tags, Truck, Warehouse, ArrowLeftRight, History, CalendarClock, Barcode,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

const masterItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Produk", url: "/products", icon: Package },
  { title: "Kategori", url: "/categories", icon: Tags },
  { title: "Supplier", url: "/suppliers", icon: Truck },
  { title: "Gudang", url: "/warehouses", icon: Warehouse },
];

const stockItems = [
  { title: "Pergerakan Stok", url: "/stock-movement", icon: ArrowLeftRight },
  { title: "Riwayat Stok", url: "/movements", icon: History },
  { title: "Batch & Expired", url: "/batches", icon: CalendarClock },
  { title: "Serial Number", url: "/serials", icon: Barcode },
];

const assetItems = [
  { title: "Inventaris Alat", url: "/equipment", icon: Package },
  { title: "Peminjaman", url: "/loans", icon: ClipboardList },
];

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/products": "Produk",
  "/categories": "Kategori Produk",
  "/suppliers": "Supplier",
  "/warehouses": "Gudang",
  "/stock-movement": "Pergerakan Stok",
  "/movements": "Riwayat Stok",
  "/batches": "Batch & Expired",
  "/serials": "Serial Number",
  "/equipment": "Inventaris Alat",
  "/loans": "Peminjaman",
};

function AuthLayout() {
  const { user, loading, signOut, isAdmin, profile } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Boxes className="h-8 w-8 animate-pulse text-primary" />
          <span className="text-sm">Memuat...</span>
        </div>
      </div>
    );
  }

  const pageLabel = PAGE_LABELS[pathname] ?? pathname.replace("/", "").replace(/-/g, " ");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar collapsible="icon">
          <SidebarContent>
            <div className="p-4 flex items-center gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Boxes className="h-4 w-4" />
              </div>
              <span className="font-bold tracking-tight group-data-[collapsible=icon]:hidden">W Inventory</span>
            </div>

            <SidebarGroup>
              <SidebarGroupLabel>Master Data</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {masterItems.map((it) => (
                    <SidebarMenuItem key={it.url}>
                      <SidebarMenuButton asChild isActive={pathname === it.url}>
                        <Link to={it.url}>
                          <it.icon />
                          <span>{it.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Operasi Stok</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {stockItems.map((it) => (
                    <SidebarMenuItem key={it.url}>
                      <SidebarMenuButton asChild isActive={pathname === it.url}>
                        <Link to={it.url}>
                          <it.icon />
                          <span>{it.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Aset & Peminjaman</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {assetItems.map((it) => (
                    <SidebarMenuItem key={it.url}>
                      <SidebarMenuButton asChild isActive={pathname === it.url}>
                        <Link to={it.url}>
                          <it.icon />
                          <span>{it.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
              <div className="rounded-lg bg-sidebar-accent p-3 text-xs">
                <div className="font-medium truncate">{profile?.full_name || user.email}</div>
                <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                  {isAdmin
                    ? <><ShieldCheck className="h-3 w-3 text-primary" /> Admin</>
                    : profile?.kelas
                      ? <span>{profile.kelas}</span>
                      : "Pengguna"
                  }
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="justify-start gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Keluar</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border flex items-center px-4 gap-3 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger />
            <div className="h-4 w-px bg-border" />
            <div className="font-semibold text-sm capitalize">{pageLabel}</div>
          </header>
          <main className="flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
