import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Package } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/equipment")({
  component: EquipmentPage,
});

type Equipment = {
  id: string; name: string; category: string; code: string | null;
  condition: string; quantity: number; available: number; notes: string | null;
};

const CONDITION_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  "Baik": "default",
  "Perlu Perbaikan": "secondary",
  "Rusak": "destructive",
};

function EquipmentPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment").select("*").order("name");
      if (error) throw error;
      return data as Equipment[];
    },
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alat dihapus");
      qc.invalidateQueries({ queryKey: ["equipment"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = data?.filter((e) => {
    const matchSearch = !search || [e.name, e.category, e.code].join(" ").toLowerCase().includes(search.toLowerCase());
    const matchCond = conditionFilter === "all" || e.condition === conditionFilter;
    return matchSearch && matchCond;
  }) ?? [];

  const totalUnits = data?.reduce((s, e) => s + e.quantity, 0) ?? 0;
  const availableUnits = data?.reduce((s, e) => s + e.available, 0) ?? 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Inventaris Alat</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data?.length ?? 0} jenis · {totalUnits} unit total · {availableUnits} tersedia
          </p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Tambah Alat</Button>
            </DialogTrigger>
            <DialogContent>
              <EquipmentForm editing={editing} onDone={() => { setOpen(false); setEditing(null); }} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama / kategori / kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-input px-3 text-sm"
          value={conditionFilter}
          onChange={(e) => setConditionFilter(e.target.value)}
        >
          <option value="all">Semua kondisi</option>
          <option value="Baik">Baik</option>
          <option value="Perlu Perbaikan">Perlu Perbaikan</option>
          <option value="Rusak">Rusak</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-center py-12">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">
            {search || conditionFilter !== "all" ? "Tidak ditemukan hasil pencarian" : "Belum ada alat tercatat"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => {
            const pct = e.quantity > 0 ? (e.available / e.quantity) * 100 : 0;
            return (
              <div
                key={e.id}
                className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] hover:border-primary/40 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{e.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {e.category}{e.code && ` · ${e.code}`}
                    </p>
                  </div>
                  <Badge variant={CONDITION_COLORS[e.condition] ?? "outline"}>
                    {e.condition}
                  </Badge>
                </div>

                <div className="mt-4">
                  <div className="flex items-end justify-between mb-1.5">
                    <div>
                      <span className="text-2xl font-bold">{e.available}</span>
                      <span className="text-sm font-normal text-muted-foreground">/{e.quantity}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">tersedia</div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-destructive"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {e.notes && <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{e.notes}</p>}

                {isAdmin && (
                  <div className="flex gap-1 mt-3 pt-3 border-t border-border">
                    <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={() => { setEditing(e); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus {e.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Aksi ini tidak bisa dibatalkan. Semua riwayat peminjaman terkait akan ikut terhapus.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => delMut.mutate(e.id)}>Hapus</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EquipmentForm({ editing, onDone }: { editing: Equipment | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(editing?.name ?? "");
  const [category, setCategory] = useState(editing?.category ?? "");
  const [code, setCode] = useState(editing?.code ?? "");
  const [condition, setCondition] = useState(editing?.condition ?? "Baik");
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);
  const [notes, setNotes] = useState(editing?.notes ?? "");

  const mut = useMutation({
    mutationFn: async () => {
      if (editing) {
        // Adjust available if quantity changed
        const qtyDiff = quantity - editing.quantity;
        const newAvailable = Math.max(0, editing.available + qtyDiff);
        const { error } = await supabase.from("equipment").update({
          name, category, code: code || null, condition, quantity,
          available: newAvailable,
          notes: notes || null,
        }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("equipment").insert({
          name, category, code: code || null, condition, quantity, available: quantity, notes: notes || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Alat diperbarui" : "Alat ditambahkan");
      qc.invalidateQueries({ queryKey: ["equipment"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit Alat" : "Tambah Alat Baru"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label>Nama alat *</Label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Mis. Kabel HDMI" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Komputer, Elektronik, dll" />
          </div>
          <div className="space-y-2">
            <Label>Kode</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="opsional" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Kondisi</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-input px-3 text-sm"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option>Baik</option>
              <option>Perlu Perbaikan</option>
              <option>Rusak</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Jumlah *</Label>
            <Input type="number" min={1} required value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
          </div>
        </div>
        {editing && quantity !== editing.quantity && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            Stok tersedia akan disesuaikan: {Math.max(0, editing.available + (quantity - editing.quantity))} unit
          </p>
        )}
        <div className="space-y-2">
          <Label>Catatan</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Opsional" />
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
