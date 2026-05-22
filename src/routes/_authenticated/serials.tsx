import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Barcode, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/serials")({ component: SerialsPage });

const statusMeta: Record<string, { label: string; color: string }> = {
  available: { label: "Tersedia", color: "bg-emerald-500/15 text-emerald-700" },
  sold: { label: "Terjual", color: "bg-blue-500/15 text-blue-700" },
  damaged: { label: "Rusak", color: "bg-rose-500/15 text-rose-700" },
  reserved: { label: "Reserved", color: "bg-amber-500/15 text-amber-700" },
};

function SerialsPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [status, setStatus] = useState("available");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: serials, isLoading } = useQuery({
    queryKey: ["serials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("serial_numbers").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      const [{ data: products }, { data: warehouses }] = await Promise.all([
        supabase.from("products").select("id,name"),
        supabase.from("warehouses").select("id,name"),
      ]);
      const pMap = new Map((products ?? []).map((p: any) => [p.id, p.name]));
      const wMap = new Map((warehouses ?? []).map((w: any) => [w.id, w.name]));
      return (data ?? []).map((s: any) => ({
        ...s,
        product_name: pMap.get(s.product_id) ?? "—",
        warehouse_name: wMap.get(s.warehouse_id) ?? "—",
      }));
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-min"],
    queryFn: async () => (await supabase.from("products").select("id,name").order("name")).data ?? [],
  });
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-min"],
    queryFn: async () => (await supabase.from("warehouses").select("id,name").order("name")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!productId || !warehouseId || !serialNumber) throw new Error("Lengkapi semua data yang wajib");
      const { error } = await supabase.from("serial_numbers").insert({
        product_id: productId, warehouse_id: warehouseId, serial_number: serialNumber, status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Serial number ditambahkan");
      qc.invalidateQueries({ queryKey: ["serials"] });
      setOpen(false);
      setSerialNumber("");
      setProductId("");
      setWarehouseId("");
      setStatus("available");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("serial_numbers").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status diperbarui");
      qc.invalidateQueries({ queryKey: ["serials"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("serial_numbers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Serial number dihapus"); qc.invalidateQueries({ queryKey: ["serials"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = serials?.filter((s: any) => {
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || s.serial_number.toLowerCase().includes(q) || s.product_name?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Serial Number Tracking</h1>
          <p className="text-sm text-muted-foreground">Lacak unit per nomor seri · {serials?.length ?? 0} SN terdaftar</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Tambah SN</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Tambah Serial Number</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label>Produk *</Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                    <SelectContent>{products?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Gudang *</Label>
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger><SelectValue placeholder="Pilih gudang" /></SelectTrigger>
                    <SelectContent>{warehouses?.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Serial Number *</Label>
                  <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="SN-XXXXXXXX" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusMeta).map(([v, m]) => (
                        <SelectItem key={v} value={v}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => create.mutate()} disabled={create.isPending}>
                  {create.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari serial number atau produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-input px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Semua status</option>
          {Object.entries(statusMeta).map(([v, m]) => (
            <option key={v} value={v}>{m.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat...</div>
      ) : !filtered?.length ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Barcode className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">
            {search || statusFilter !== "all" ? "Tidak ada hasil" : "Belum ada serial number"}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Serial Number</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produk</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Gudang</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                {isAdmin && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s: any) => {
                const meta = statusMeta[s.status] ?? statusMeta.available;
                return (
                  <tr key={s.id} className="hover:bg-muted/30 transition">
                    <td className="px-4 py-3 font-mono font-medium">{s.serial_number}</td>
                    <td className="px-4 py-3">{s.product_name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.warehouse_name}</td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <Select value={s.status} onValueChange={(v) => updateStatus.mutate({ id: s.id, status: v })}>
                          <SelectTrigger className="w-28 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusMeta).map(([v, m]) => (
                              <SelectItem key={v} value={v}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                          {meta.label}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus SN {s.serial_number}?</AlertDialogTitle>
                              <AlertDialogDescription>Aksi ini tidak bisa dibatalkan.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(s.id)}>Hapus</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
