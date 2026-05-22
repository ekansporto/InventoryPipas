import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, ClipboardList, CheckCircle2, AlertCircle,
  TrendingUp, AlertTriangle, Warehouse, ArrowLeftRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [eq, loans, active, products, movements, warehouses, stockRows] = await Promise.all([
        supabase.from("equipment").select("id, quantity, available"),
        supabase.from("loans").select("id, status"),
        supabase.from("loans").select("id").eq("status", "dipinjam"),
        supabase.from("products").select("id, name, min_stock, is_active"),
        supabase.from("stock_movements").select("id").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from("warehouses").select("id"),
        supabase.from("product_stock").select("product_id, quantity"),
      ]);

      const totalUnits = eq.data?.reduce((s, e) => s + (e.quantity ?? 0), 0) ?? 0;
      const availableUnits = eq.data?.reduce((s, e) => s + (e.available ?? 0), 0) ?? 0;

      // compute stock per product
      const stockMap = new Map<string, number>();
      stockRows.data?.forEach((r) => stockMap.set(r.product_id, (stockMap.get(r.product_id) ?? 0) + r.quantity));
      const lowStockCount = products.data?.filter((p) => (stockMap.get(p.id) ?? 0) <= p.min_stock).length ?? 0;

      return {
        equipmentCount: eq.data?.length ?? 0,
        totalUnits,
        availableUnits,
        loansTotal: loans.data?.length ?? 0,
        loansActive: active.data?.length ?? 0,
        productCount: products.data?.length ?? 0,
        lowStockCount,
        movementsThisWeek: movements.data?.length ?? 0,
        warehouseCount: warehouses.data?.length ?? 0,
      };
    },
  });

  // Recent loans
  const { data: recentLoans } = useQuery({
    queryKey: ["recent-loans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loans")
        .select("id, borrower_name, kelas, status, borrowed_at, equipment(name)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as any[];
    },
  });

  // Low stock products
  const { data: lowStockProducts } = useQuery({
    queryKey: ["low-stock-products"],
    queryFn: async () => {
      const { data: products, error } = await supabase.from("products").select("id, name, min_stock, unit");
      if (error) throw error;
      const { data: stockRows } = await supabase.from("product_stock").select("product_id, quantity");
      const stockMap = new Map<string, number>();
      stockRows?.forEach((r) => stockMap.set(r.product_id, (stockMap.get(r.product_id) ?? 0) + r.quantity));
      return products
        ?.filter((p) => (stockMap.get(p.id) ?? 0) <= p.min_stock)
        .map((p) => ({ ...p, stock: stockMap.get(p.id) ?? 0 }))
        .slice(0, 5);
    },
  });

  const topCards = [
    { label: "Total Produk", value: stats?.productCount ?? 0, icon: Package, color: "text-primary", bg: "bg-primary/10" },
    { label: "Gudang Aktif", value: stats?.warehouseCount ?? 0, icon: Warehouse, color: "text-sky-500", bg: "bg-sky-500/10" },
    { label: "Stok Rendah", value: stats?.lowStockCount ?? 0, icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Gerak 7 Hari", value: stats?.movementsThisWeek ?? 0, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  const assetCards = [
    { label: "Jenis Alat", value: stats?.equipmentCount ?? 0, icon: Package, color: "text-primary" },
    { label: "Total Unit", value: stats?.totalUnits ?? 0, icon: Package, color: "text-sky-500" },
    { label: "Tersedia", value: stats?.availableUnits ?? 0, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Dipinjam", value: stats?.loansActive ?? 0, icon: AlertCircle, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Ringkasan inventaris & peminjaman</p>
      </div>

      {/* Inventory Stats */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Stok Produk</h2>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {topCards.map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] hover:border-primary/40 transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <div className={`rounded-md p-1.5 ${c.bg}`}>
                  <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold">{c.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Asset / Loan Stats */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Aset & Peminjaman</h2>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {assetCards.map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] hover:border-primary/40 transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <div className="text-2xl font-bold">{c.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two column: recent loans + low stock */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Recent Loans */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Peminjaman Terbaru</h3>
            <Link to="/loans" className="text-xs text-primary hover:underline">Lihat semua →</Link>
          </div>
          {!recentLoans?.length ? (
            <p className="text-xs text-muted-foreground">Belum ada peminjaman</p>
          ) : (
            <div className="space-y-2">
              {recentLoans.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium truncate block">{l.borrower_name}</span>
                    <span className="text-xs text-muted-foreground truncate block">{l.equipment?.name ?? "—"}</span>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${l.status === "dipinjam" ? "bg-amber-500/15 text-amber-700" : "bg-emerald-500/15 text-emerald-700"}`}>
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Stok Rendah</h3>
            <Link to="/products" className="text-xs text-primary hover:underline">Kelola →</Link>
          </div>
          {!lowStockProducts?.length ? (
            <p className="text-xs text-muted-foreground text-emerald-600">✓ Semua stok aman</p>
          ) : (
            <div className="space-y-2">
              {lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-medium">{p.name}</span>
                  <span className="shrink-0 text-xs text-amber-700 font-semibold bg-amber-500/15 px-2 py-0.5 rounded-full">
                    {p.stock} / {p.min_stock} {p.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Aksi Cepat</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/stock-movement" className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-[var(--shadow-card)] transition group">
            <ArrowLeftRight className="h-5 w-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-medium text-sm">Catat Stok</div>
            <div className="text-xs text-muted-foreground mt-0.5">Masuk / keluar / opname</div>
          </Link>
          <Link to="/products" className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-[var(--shadow-card)] transition group">
            <Package className="h-5 w-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-medium text-sm">Kelola Produk</div>
            <div className="text-xs text-muted-foreground mt-0.5">Tambah atau edit produk</div>
          </Link>
          <Link to="/equipment" className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-[var(--shadow-card)] transition group">
            <Package className="h-5 w-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-medium text-sm">Inventaris Alat</div>
            <div className="text-xs text-muted-foreground mt-0.5">Tambah, edit, hapus alat</div>
          </Link>
          <Link to="/loans" className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-[var(--shadow-card)] transition group">
            <ClipboardList className="h-5 w-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-medium text-sm">Pinjam Alat</div>
            <div className="text-xs text-muted-foreground mt-0.5">Catat peminjaman baru</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
