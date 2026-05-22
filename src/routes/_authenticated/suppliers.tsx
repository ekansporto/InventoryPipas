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
import { Plus, Pencil, Trash2, Truck, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/suppliers")({ component: SuppliersPage });

type Supplier = { id: string; name: string; contact_person: string | null; phone: string | null; email: string | null; address: string | null; notes: string | null };

function SuppliersPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data as Supplier[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("suppliers").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Supplier dihapus"); qc.invalidateQueries({ queryKey: ["suppliers"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Supplier</h1>
          <p className="text-muted-foreground text-sm mt-1">Data pemasok barang</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Tambah</Button></DialogTrigger>
            <DialogContent><SupForm editing={editing} onDone={() => { setOpen(false); setEditing(null); }} /></DialogContent>
          </Dialog>
        )}
      </div>
      {isLoading ? <div className="text-center py-12 text-muted-foreground">Memuat...</div>
        : !data?.length ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <Truck className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">Belum ada supplier</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{s.name}</h3>
                    {s.contact_person && <p className="text-xs text-muted-foreground mt-0.5">PIC: {s.contact_person}</p>}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Hapus {s.name}?</AlertDialogTitle><AlertDialogDescription>Produk yang terkait akan kehilangan referensi supplier.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => del.mutate(s.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  {s.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {s.phone}</div>}
                  {s.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {s.email}</div>}
                  {s.address && <div className="flex items-start gap-2"><MapPin className="h-3 w-3 mt-0.5" /> <span className="line-clamp-2">{s.address}</span></div>}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

function SupForm({ editing, onDone }: { editing: Supplier | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: editing?.name ?? "", contact_person: editing?.contact_person ?? "",
    phone: editing?.phone ?? "", email: editing?.email ?? "",
    address: editing?.address ?? "", notes: editing?.notes ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: f.name,
        contact_person: f.contact_person || null,
        phone: f.phone || null,
        email: f.email || null,
        address: f.address || null,
        notes: f.notes || null,
      };
      if (editing) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editing ? "Diperbarui" : "Ditambahkan"); qc.invalidateQueries({ queryKey: ["suppliers"] }); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
      <DialogHeader><DialogTitle>{editing ? "Edit Supplier" : "Tambah Supplier"}</DialogTitle></DialogHeader>
      <div className="grid gap-3 py-4">
        <div className="space-y-2"><Label>Nama supplier</Label><Input required value={f.name} onChange={set("name")} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Kontak PIC</Label><Input value={f.contact_person} onChange={set("contact_person")} /></div>
          <div className="space-y-2"><Label>Telepon</Label><Input value={f.phone} onChange={set("phone")} /></div>
        </div>
        <div className="space-y-2"><Label>Email</Label><Input type="email" value={f.email} onChange={set("email")} /></div>
        <div className="space-y-2"><Label>Alamat</Label><Textarea value={f.address} onChange={set("address")} rows={2} /></div>
        <div className="space-y-2"><Label>Catatan</Label><Textarea value={f.notes} onChange={set("notes")} rows={2} /></div>
      </div>
      <DialogFooter><Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
    </form>
  );
}
