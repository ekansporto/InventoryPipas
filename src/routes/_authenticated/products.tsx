import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/products")({ component: ProductsPage });

type Product = {
  id: string; sku: string | null; barcode: string | null; name: string; description: string | null;
  category_id: string | null; supplier_id: string | null; unit: string;
  purchase_price: number; selling_price: number; min_stock: number; type: string; is_active: boolean;
};
type Stock = { product_id: string; quantity: number };

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function ProductsPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "product" | "asset">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low">("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: stockRows } = useQuery({
    queryKey: ["product_stock_totals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_stock").select("product_id,quantity");
      if (error) throw error;
      return data as Stock[];
    },
  });

  const stockMap = useMemo(() => {
    const m = new Map<string, number>();
    stockRows?.forEach((r) => m.set(r.product_id, (m.get(r.product_id) ?? 0) + r.quantity));
    return m;
  }, [stockRows]);

  const catMap = useMemo(() => new Map(categories?.map((c) => [c.id, c.name])), [categories]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Produk dihapus"); qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = products?.filter((p) => {
    const s = search.toLowerCase();
    const matchSearch = !s || [p.name, p.sku, p.barcode].filter(Boolean).join(" ").toLowerCase().includes(s);
    const matchType = typeFilter === "all" || p.type === typeFilter;
    const stock = stockMap.get(p.id) ?? 0;
    const matchStock = stockFilter === "all" || stock <= p.min_stock;
    return matchSearch && matchType && matchStock;
  }) ?? [];

  const lowCount = products?.filter((p) => (stockMap.get(p.id) ?? 0) <= p.min_stock).length ?? 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Produk</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Master data produk & aset
            {lowCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-medium">
                <AlertTriangle className="h-3 w-3" /> {lowCount} stok rendah
              </span>
            )}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Tambah Produk</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <PForm editing={editing} onDone={() => { setOpen(false); setEditing(null); }} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nama / SKU / barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-input px-3 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
        >
          <option value="all">Semua tipe</option>
          <option value="product">Produk</option>
          <option value="asset">Aset</option>
        </select>
        <select
          className="h-9 rounded-md border border-input bg-input px-3 text-sm"
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as any)}
        >
          <option value="all">Semua stok</option>
          <option value="low">Stok rendah</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat...</div>
      ) : !filtered.length ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">
            {search || typeFilter !== "all" || stockFilter !== "all" ? "Tidak ada hasil" : "Belum ada produk"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const total = stockMap.get(p.id) ?? 0;
            const low = total <= p.min_stock;
            return (
              <div key={p.id} className={`rounded-xl border bg-card p-5 hover:border-primary/40 transition shadow-[var(--shadow-card)] ${low ? "border-amber-400/50" : "border-border"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{p.name}</h3>
                      {p.type === "asset" && <Badge variant="secondary" className="text-[10px]">Aset</Badge>}
                      {!p.is_active && <Badge variant="outline" className="text-[10px]">Nonaktif</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.sku ? `SKU: ${p.sku}` : "—"}
                      {p.category_id && ` · ${catMap.get(p.category_id) ?? "?"}`}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus {p.name}?</AlertDialogTitle>
                            <AlertDialogDescription>Semua stok di semua gudang akan ikut terhapus.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => del.mutate(p.id)}>Hapus</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold flex items-center gap-1.5">
                      {total}
                      <span className="text-sm font-normal text-muted-foreground">{p.unit}</span>
                      {low && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    </div>
                    <div className="text-xs text-muted-foreground">Min stok: {p.min_stock}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{formatIDR(p.selling_price)}</div>
                    <div className="text-[10px] text-muted-foreground">Beli {formatIDR(p.purchase_price)}</div>
                  </div>
                </div>
                {p.barcode && <p className="mt-2 text-[10px] font-mono text-muted-foreground">{p.barcode}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PForm({ editing, onDone }: { editing: Product | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: editing?.name ?? "",
    sku: editing?.sku ?? "",
    barcode: editing?.barcode ?? "",
    description: editing?.description ?? "",
    category_id: editing?.category_id ?? "",
    supplier_id: editing?.supplier_id ?? "",
    unit: editing?.unit ?? "pcs",
    purchase_price: editing?.purchase_price ?? 0,
    selling_price: editing?.selling_price ?? 0,
    min_stock: editing?.min_stock ?? 0,
    type: editing?.type ?? "product",
    is_active: editing?.is_active ?? true,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id,name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: f.name, sku: f.sku || null, barcode: f.barcode || null,
        description: f.description || null,
        category_id: f.category_id || null, supplier_id: f.supplier_id || null,
        unit: f.unit, purchase_price: f.purchase_price, selling_price: f.selling_price,
        min_stock: f.min_stock, type: f.type, is_active: f.is_active,
      };
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Produk diperbarui" : "Produk ditambahkan");
      qc.invalidateQueries({ queryKey: ["products"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto pr-1">
        <div className="space-y-2">
          <Label>Nama produk *</Label>
          <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>SKU</Label><Input value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></div>
          <div className="space-y-2"><Label>Barcode</Label><Input value={f.barcode} onChange={(e) => setF({ ...f, barcode: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Kategori</Label>
            <select className="w-full h-9 rounded-md border border-input bg-input px-3 text-sm" value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>
              <option value="">— pilih —</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Supplier</Label>
            <select className="w-full h-9 rounded-md border border-input bg-input px-3 text-sm" value={f.supplier_id} onChange={(e) => setF({ ...f, supplier_id: e.target.value })}>
              <option value="">— pilih —</option>
              {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2"><Label>Satuan</Label><Input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Tipe</Label>
            <select className="w-full h-9 rounded-md border border-input bg-input px-3 text-sm" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              <option value="product">Produk</option>
              <option value="asset">Aset</option>
            </select>
          </div>
          <div className="space-y-2"><Label>Min Stok</Label><Input type="number" min={0} value={f.min_stock} onChange={(e) => setF({ ...f, min_stock: parseInt(e.target.value) || 0 })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Harga Beli (Rp)</Label><Input type="number" min={0} value={f.purchase_price} onChange={(e) => setF({ ...f, purchase_price: parseFloat(e.target.value) || 0 })} /></div>
          <div className="space-y-2"><Label>Harga Jual (Rp)</Label><Input type="number" min={0} value={f.selling_price} onChange={(e) => setF({ ...f, selling_price: parseFloat(e.target.value) || 0 })} /></div>
        </div>
        <div className="space-y-2"><Label>Deskripsi</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} /></div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_active"
            checked={f.is_active}
            onChange={(e) => setF({ ...f, is_active: e.target.checked })}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="is_active" className="cursor-pointer">Produk aktif</Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={mut.isPending}>
          {mut.isPending ? "Menyimpan..." : "Simpan"}
        </Button>
      </DialogFooter>
    </form>
  );
}
