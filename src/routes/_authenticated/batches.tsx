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
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, Trash2, CalendarClock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/batches")({ component: BatchesPage });

function BatchesPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiredAt, setExpiredAt] = useState("");
  const [quantity, setQuantity] = useState(0);

  const { data: batches, isLoading } = useQuery({
    queryKey: ["batches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("batches").select("*").order("expired_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      const [{ data: products }, { data: warehouses }] = await Promise.all([
        supabase.from("products").select("id,name"),
        supabase.from("warehouses").select("id,name"),
      ]);
      const pMap = new Map((products ?? []).map((p: any) => [p.id, p.name]));
      const wMap = new Map((warehouses ?? []).map((w: any) => [w.id, w.name]));
      return (data ?? []).map((b: any) => ({
        ...b,
        product_name: pMap.get(b.product_id) ?? "—",
        warehouse_name: wMap.get(b.warehouse_id) ?? "—",
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
      if (!productId || !warehouseId || !batchNumber) throw new Error("Lengkapi semua data yang wajib");
      const { error } = await supabase.from("batches").insert({
        product_id: productId, warehouse_id: warehouseId, batch_number: batchNumber,
        expired_at: expiredAt || null, quantity,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Batch berhasil ditambahkan");
      qc.invalidateQueries({ queryKey: ["batches"] });
      setOpen(false);
      setBatchNumber("");
      setQuantity(0);
      setExpiredAt("");
      setProductId("");
      setWarehouseId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("batches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Batch dihapus"); qc.invalidateQueries({ queryKey: ["batches"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const today = new Date();
  const soon = new Date(); soon.setDate(today.getDate() + 30);

  const expiredCount = batches?.filter((b: any) => b.expired_at && new Date(b.expired_at) < today).length ?? 0;
  const nearCount = batches?.filter((b: any) => {
    const exp = b.expired_at ? new Date(b.expired_at) : null;
    return exp && exp >= today && exp < soon;
  }).length ?? 0;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Batch & Expired Date</h1>
          <p className="text-sm text-muted-foreground">
            Lacak nomor batch dan tanggal kedaluwarsa
            {expiredCount > 0 && <span className="ml-2 text-destructive font-medium">· {expiredCount} kedaluwarsa</span>}
            {nearCount > 0 && <span className="ml-2 text-amber-600 font-medium">· {nearCount} hampir kedaluwarsa</span>}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Batch Baru</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Tambah Batch</DialogTitle></DialogHeader>
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
                  <Label>Nomor Batch *</Label>
                  <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="Mis. BATCH-001" />
                </div>
                <div>
                  <Label>Tanggal Kedaluwarsa</Label>
                  <Input type="date" value={expiredAt} onChange={(e) => setExpiredAt(e.target.value)} />
                </div>
                <div>
                  <Label>Jumlah</Label>
                  <Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
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

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat...</div>
      ) : !batches?.length ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">Belum ada data batch</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produk</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Gudang</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Batch #</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Qty</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Exp. Date</th>
                {isAdmin && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {batches.map((b: any) => {
                const exp = b.expired_at ? new Date(b.expired_at) : null;
                const expired = exp && exp < today;
                const nearExpiry = exp && !expired && exp < soon;
                return (
                  <tr key={b.id} className={`hover:bg-muted/30 transition ${expired ? "bg-destructive/5" : nearExpiry ? "bg-amber-500/5" : ""}`}>
                    <td className="px-4 py-3 font-medium">{b.product_name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{b.warehouse_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{b.batch_number}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">{b.quantity}</td>
                    <td className="px-4 py-3">
                      {exp ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{exp.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                          {expired && <Badge variant="destructive" className="text-[10px]">Kedaluwarsa</Badge>}
                          {nearExpiry && (
                            <Badge className="bg-amber-500/15 text-amber-700 text-[10px]">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Segera
                            </Badge>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
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
                              <AlertDialogTitle>Hapus batch {b.batch_number}?</AlertDialogTitle>
                              <AlertDialogDescription>Aksi ini tidak bisa dibatalkan.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(b.id)}>Hapus</AlertDialogAction>
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
