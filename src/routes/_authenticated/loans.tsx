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
import { Plus, Trash2, ClipboardList, RotateCcw, Search, Pencil, CalendarClock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/loans")({
  component: LoansPage,
});

type Loan = {
  id: string; equipment_id: string; user_id: string;
  borrower_name: string; kelas: string | null; quantity: number;
  borrowed_at: string; due_at: string | null; returned_at: string | null;
  status: string; notes: string | null;
  equipment?: { name: string; code: string | null } | null;
};

function LoansPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [filter, setFilter] = useState<"all" | "dipinjam" | "dikembalikan">("all");
  const [search, setSearch] = useState("");

  const { data: loans, isLoading } = useQuery({
    queryKey: ["loans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loans")
        .select("*, equipment(name, code)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Loan[];
    },
  });

  const returnMut = useMutation({
    mutationFn: async (loan: Loan) => {
      const { error: e1 } = await supabase.from("loans").update({
        status: "dikembalikan",
        returned_at: new Date().toISOString(),
      }).eq("id", loan.id);
      if (e1) throw e1;
      const { data: eq } = await supabase.from("equipment").select("available").eq("id", loan.equipment_id).single();
      if (eq) {
        await supabase.from("equipment").update({ available: (eq.available ?? 0) + loan.quantity }).eq("id", loan.equipment_id);
      }
    },
    onSuccess: () => {
      toast.success("Alat berhasil dikembalikan");
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["equipment"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (loan: Loan) => {
      // If still active, restore availability first
      if (loan.status === "dipinjam") {
        const { data: eq } = await supabase.from("equipment").select("available").eq("id", loan.equipment_id).single();
        if (eq) {
          await supabase.from("equipment").update({ available: (eq.available ?? 0) + loan.quantity }).eq("id", loan.equipment_id);
        }
      }
      const { error } = await supabase.from("loans").delete().eq("id", loan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Catatan peminjaman dihapus");
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["equipment"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = loans?.filter((l) => {
    const matchFilter = filter === "all" || l.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || l.borrower_name.toLowerCase().includes(q) || (l.kelas ?? "").toLowerCase().includes(q) || (l.equipment?.name ?? "").toLowerCase().includes(q);
    return matchFilter && matchSearch;
  }) ?? [];

  const activeCount = loans?.filter((l) => l.status === "dipinjam").length ?? 0;
  const returnedCount = loans?.filter((l) => l.status === "dikembalikan").length ?? 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Peminjaman</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeCount} sedang dipinjam · {returnedCount} dikembalikan
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Pinjam Alat</Button>
          </DialogTrigger>
          <DialogContent>
            <LoanForm editing={editing} onDone={() => { setOpen(false); setEditing(null); }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari peminjam / alat / kelas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "dipinjam", "dikembalikan"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Semua" : f === "dipinjam" ? "Dipinjam" : "Dikembalikan"}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-center py-12">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">
            {search ? "Tidak ditemukan hasil pencarian" : "Belum ada peminjaman"}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((l) => {
            const isOwner = l.user_id === user?.id;
            const canReturn = l.status === "dipinjam" && (isOwner || isAdmin);
            const isOverdue = l.due_at && l.status === "dipinjam" && new Date(l.due_at) < new Date();

            return (
              <div
                key={l.id}
                className={`rounded-xl border bg-card p-4 sm:p-5 shadow-[var(--shadow-card)] transition ${isOverdue ? "border-destructive/50" : "border-border"}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{l.equipment?.name ?? "—"}</h3>
                      <Badge variant={l.status === "dipinjam" ? "secondary" : "default"}>
                        {l.status}
                      </Badge>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">×{l.quantity}</span>
                      {isOverdue && (
                        <span className="text-xs bg-destructive/15 text-destructive px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" /> Terlambat
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium text-foreground">{l.borrower_name}</span>
                      {l.kelas && <span> · {l.kelas}</span>}
                      <span> · {new Date(l.borrowed_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                      {l.due_at && (
                        <span> · Batas: {new Date(l.due_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                      )}
                      {l.returned_at && (
                        <span className="text-emerald-600"> · Kembali: {new Date(l.returned_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                      )}
                    </div>
                    {l.notes && <p className="text-xs text-muted-foreground mt-1 italic">{l.notes}</p>}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {canReturn && (
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => returnMut.mutate(l)}>
                        <RotateCcw className="h-3.5 w-3.5" /> Kembalikan
                      </Button>
                    )}
                    {(isAdmin || isOwner) && l.status === "dipinjam" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setEditing(l); setOpen(true); }}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus catatan peminjaman?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {l.status === "dipinjam"
                                ? "Alat yang sedang dipinjam akan otomatis dikembalikan ke stok. Aksi ini tidak bisa dibatalkan."
                                : "Aksi ini tidak bisa dibatalkan."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => delMut.mutate(l)}>Hapus</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LoanForm({ editing, onDone }: { editing: Loan | null; onDone: () => void }) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: equipment } = useQuery({
    queryKey: ["equipment-available"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, name, available, quantity")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const [equipmentId, setEquipmentId] = useState(editing?.equipment_id ?? "");
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);
  const [borrowerName, setBorrowerName] = useState(editing?.borrower_name ?? profile?.full_name ?? "");
  const [kelas, setKelas] = useState(editing?.kelas ?? profile?.kelas ?? "");
  const [dueAt, setDueAt] = useState(editing?.due_at ? editing.due_at.substring(0, 10) : "");
  const [notes, setNotes] = useState(editing?.notes ?? "");

  const selected = equipment?.find((e) => e.id === equipmentId);
  const maxQty = editing
    ? selected
      ? selected.available + editing.quantity  // when editing, add back current qty
      : editing.quantity
    : selected?.available ?? 1;

  const mut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Tidak terautentikasi");
      if (!equipmentId) throw new Error("Pilih alat terlebih dahulu");

      if (editing) {
        // Handle qty change: adjust available stock
        const qtyDiff = quantity - editing.quantity;
        const { data: eq } = await supabase.from("equipment").select("available").eq("id", editing.equipment_id).single();
        if (eq) {
          const newAvailable = (eq.available ?? 0) - qtyDiff;
          if (newAvailable < 0) throw new Error("Jumlah melebihi stok tersedia");
          await supabase.from("equipment").update({ available: newAvailable }).eq("id", editing.equipment_id);
        }
        const { error } = await supabase.from("loans").update({
          borrower_name: borrowerName,
          kelas: kelas || null,
          quantity,
          due_at: dueAt || null,
          notes: notes || null,
        }).eq("id", editing.id);
        if (error) throw error;
      } else {
        if (!selected) throw new Error("Pilih alat terlebih dahulu");
        if (quantity > selected.available) throw new Error("Jumlah melebihi stok tersedia");
        const { error } = await supabase.from("loans").insert({
          equipment_id: equipmentId,
          user_id: user.id,
          borrower_name: borrowerName,
          kelas: kelas || null,
          quantity,
          due_at: dueAt || null,
          notes: notes || null,
        });
        if (error) throw error;
        await supabase.from("equipment").update({ available: selected.available - quantity }).eq("id", equipmentId);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Peminjaman diperbarui" : "Peminjaman dicatat");
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["equipment"] });
      qc.invalidateQueries({ queryKey: ["equipment-available"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit Peminjaman" : "Pinjam Alat"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label>Alat</Label>
          <select
            required={!editing}
            disabled={!!editing}
            className="w-full h-9 rounded-md border border-input bg-input px-3 text-sm disabled:opacity-60"
            value={equipmentId}
            onChange={(e) => { setEquipmentId(e.target.value); setQuantity(1); }}
          >
            <option value="">— pilih alat —</option>
            {equipment?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} {!editing ? `(tersedia: ${e.available})` : ""}
              </option>
            ))}
          </select>
          {selected && !editing && (
            <p className="text-xs text-muted-foreground">Tersedia: {selected.available} unit</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Jumlah</Label>
            <Input
              type="number"
              min={1}
              max={maxQty}
              required
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="space-y-2">
            <Label>Kelas</Label>
            <Input value={kelas} onChange={(e) => setKelas(e.target.value)} placeholder="XII RPL 1" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Nama peminjam</Label>
          <Input required value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Batas pengembalian (opsional)</Label>
          <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Catatan</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={mut.isPending}>
          {mut.isPending ? "Menyimpan..." : editing ? "Perbarui" : "Pinjam"}
        </Button>
      </DialogFooter>
    </form>
  );
}
