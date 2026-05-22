import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Warehouse as WarehouseIcon, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/warehouses")({ component: WarehousesPage });

type Warehouse = { id: string; name: string; code: string | null; address: string | null; notes: string | null };

function WarehousesPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("warehouses").select("*").order("name");
      if (error) throw error;
      return data as Warehouse[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("warehouses").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Gudang dihapus"); qc.invalidateQueries({ queryKey: ["warehouses"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Gudang</h1>
          <p className="text-muted-foreground text-sm mt-1">Lokasi penyimpanan barang (multi-gudang)</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Tambah Gudang</Button></DialogTrigger>
            <DialogContent><WForm editing={editing} onDone={() => { setOpen(false); setEditing(null); }} /></DialogContent>
          </Dialog>
        )}
      </div>
      {isLoading ? <div className="text-center py-12 text-muted-foreground">Memuat...</div>
        : !data?.length ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <WarehouseIcon className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">Belum ada gudang</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((w) => (
              <div key={w.id} className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><WarehouseIcon className="h-4 w-4 text-primary" /><h3 className="font-semibold truncate">{w.name}</h3></div>
                    {w.code && <p className="text-xs text-muted-foreground mt-1">Kode: {w.code}</p>}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(w); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Hapus {w.name}?</AlertDialogTitle><AlertDialogDescription>Stok di gudang ini akan ikut terhapus.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => del.mutate(w.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
                {w.address && <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3 mt-0.5" /><span className="line-clamp-2">{w.address}</span></div>}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

function WForm({ editing, onDone }: { editing: Warehouse | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: editing?.name ?? "", code: editing?.code ?? "",
    address: editing?.address ?? "", notes: editing?.notes ?? "",
  });
  const mut = useMutation({
    mutationFn: async () => {
      const payload = { name: f.name, code: f.code || null, address: f.address || null, notes: f.notes || null };
      if (editing) {
        const { error } = await supabase.from("warehouses").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("warehouses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editing ? "Diperbarui" : "Ditambahkan"); qc.invalidateQueries({ queryKey: ["warehouses"] }); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
      <DialogHeader><DialogTitle>{editing ? "Edit Gudang" : "Tambah Gudang"}</DialogTitle></DialogHeader>
      <div className="grid gap-3 py-4">
        <div className="space-y-2"><Label>Nama gudang</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="space-y-2"><Label>Kode</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="opsional" /></div>
        <div className="space-y-2"><Label>Alamat</Label><Textarea value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} rows={2} /></div>
        <div className="space-y-2"><Label>Catatan</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={2} /></div>
      </div>
      <DialogFooter><Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
    </form>
  );
}
