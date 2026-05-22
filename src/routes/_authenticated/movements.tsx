import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, ArrowRightLeft, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/movements")({ component: MovementsPage });

const typeMeta: Record<string, { label: string; icon: any; color: string; badge: string }> = {
  in: { label: "Masuk", icon: ArrowDownToLine, color: "bg-emerald-500/10 text-emerald-700", badge: "bg-emerald-500/15 text-emerald-700" },
  out: { label: "Keluar", icon: ArrowUpFromLine, color: "bg-rose-500/10 text-rose-700", badge: "bg-rose-500/15 text-rose-700" },
  opname: { label: "Opname", icon: ClipboardCheck, color: "bg-amber-500/10 text-amber-700", badge: "bg-amber-500/15 text-amber-700" },
  transfer: { label: "Transfer", icon: ArrowRightLeft, color: "bg-blue-500/10 text-blue-700", badge: "bg-blue-500/15 text-blue-700" },
};

const PAGE_SIZE = 20;

function MovementsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("id,movement_type,quantity,reference,notes,created_at,product_id,warehouse_id,destination_warehouse_id,recorded_by")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const [{ data: products }, { data: warehouses }] = await Promise.all([
        supabase.from("products").select("id,name"),
        supabase.from("warehouses").select("id,name"),
      ]);
      const pMap = new Map((products ?? []).map((p: any) => [p.id, p.name]));
      const wMap = new Map((warehouses ?? []).map((w: any) => [w.id, w.name]));
      return (data ?? []).map((m: any) => ({
        ...m,
        product_name: pMap.get(m.product_id) ?? "—",
        warehouse_name: wMap.get(m.warehouse_id) ?? "—",
        dest_name: m.destination_warehouse_id ? wMap.get(m.destination_warehouse_id) : null,
      }));
    },
  });

  const filtered = useMemo(() => {
    return (data ?? []).filter((m: any) => {
      const matchType = typeFilter === "all" || m.movement_type === typeFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || m.product_name.toLowerCase().includes(q) || m.warehouse_name.toLowerCase().includes(q) || (m.reference ?? "").toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [data, typeFilter, search]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleSearch = (v: string) => { setSearch(v); setPage(0); };
  const handleType = (v: string) => { setTypeFilter(v); setPage(0); };

  // Summary counts
  const summary = useMemo(() => {
    const counts: Record<string, number> = { in: 0, out: 0, opname: 0, transfer: 0 };
    (data ?? []).forEach((m: any) => { counts[m.movement_type] = (counts[m.movement_type] ?? 0) + 1; });
    return counts;
  }, [data]);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Riwayat Pergerakan Stok</h1>
        <p className="text-sm text-muted-foreground">500 transaksi terakhir</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.keys(typeMeta) as string[]).map((t) => {
          const meta = typeMeta[t];
          const Icon = meta.icon;
          return (
            <button
              key={t}
              onClick={() => handleType(typeFilter === t ? "all" : t)}
              className={`text-left rounded-xl border p-3 transition ${typeFilter === t ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
            >
              <Icon className={`h-4 w-4 mb-2 ${meta.color.split(" ")[1]}`} />
              <div className="font-semibold text-lg">{summary[t] ?? 0}</div>
              <div className="text-xs text-muted-foreground">{meta.label}</div>
            </button>
          );
        })}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari produk / gudang / referensi..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-input px-3 text-sm"
          value={typeFilter}
          onChange={(e) => handleType(e.target.value)}
        >
          <option value="all">Semua tipe</option>
          {Object.entries(typeMeta).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-center py-12">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          Tidak ada data pergerakan stok
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipe</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produk</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Gudang</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Qty</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Referensi</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((m: any) => {
                  const meta = typeMeta[m.movement_type] ?? typeMeta.in;
                  const Icon = meta.icon;
                  return (
                    <tr key={m.id} className="hover:bg-muted/30 transition">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${meta.badge}`}>
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium max-w-[160px] truncate">{m.product_name}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {m.warehouse_name}{m.dest_name ? <span className="text-xs"> → {m.dest_name}</span> : ""}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{m.quantity}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{m.reference ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap hidden lg:table-cell">
                        {new Date(m.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} dari {filtered.length}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  ← Sebelumnya
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  Berikutnya →
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
