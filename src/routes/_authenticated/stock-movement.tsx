import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, ArrowRightLeft, ShieldOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/stock-movement")({ component: StockMovementPage });

type MovementType = "in" | "out" | "opname" | "transfer";

const typeMeta: Record<MovementType, { label: string; desc: string; icon: any; color: string; bg: string }> = {
  in: { label: "Stok Masuk", desc: "Tambahkan stok produk ke gudang", icon: ArrowDownToLine, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  out: { label: "Stok Keluar", desc: "Kurangi stok produk dari gudang", icon: ArrowUpFromLine, color: "text-rose-600", bg: "bg-rose-500/10" },
  opname: { label: "Stok Opname", desc: "Set jumlah stok aktual hasil pemeriksaan fisik", icon: ClipboardCheck, color: "text-amber-600", bg: "bg-amber-500/10" },
  transfer: { label: "Transfer Gudang", desc: "Pindahkan stok antar gudang", icon: ArrowRightLeft, color: "text-blue-600", bg: "bg-blue-500/10" },
};

function StockMovementPage() {
  const { canManageStock, user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [type, setType] = useState<MovementType>("in");
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [destWarehouseId, setDestWarehouseId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const { data: products } = useQuery({
    queryKey: ["products-min"],
    queryFn: async () => (await supabase.from("products").select("id,name,sku").order("name")).data ?? [],
  });
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-min"],
    queryFn: async () => (await supabase.from("warehouses").select("id,name").order("name")).data ?? [],
  });

  // Current stock for selected product+warehouse (for opname/out)
  const { data: currentStock } = useQuery({
    queryKey: ["current-stock", productId, warehouseId],
    enabled: !!(productId && warehouseId),
    queryFn: async () => {
      const { data } = await supabase
        .from("product_stock")
        .select("quantity")
        .eq("product_id", productId)
        .eq("warehouse_id", warehouseId)
        .maybeSingle();
      return data?.quantity ?? 0;
    },
  });

  const m = useMutation({
    mutationFn: async () => {
      if (!productId || !warehouseId || !quantity) throw new Error("Lengkapi produk, gudang, dan jumlah");
      if (type === "transfer" && !destWarehouseId) throw new Error("Pilih gudang tujuan");
      if (type === "transfer" && destWarehouseId === warehouseId) throw new Error("Gudang asal dan tujuan tidak boleh sama");
      const { error } = await supabase.from("stock_movements").insert({
        product_id: productId,
        warehouse_id: warehouseId,
        destination_warehouse_id: type === "transfer" ? destWarehouseId : null,
        movement_type: type,
        quantity,
        reference: reference || null,
        notes: notes || null,
        recorded_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pergerakan stok berhasil dicatat");
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["product_stock_totals"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["current-stock", productId, warehouseId] });
      setQuantity(1);
      setReference("");
      setNotes("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!canManageStock) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldOff className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <h2 className="font-semibold">Akses Terbatas</h2>
        <p className="text-sm text-muted-foreground mt-1">Hanya admin atau staf yang dapat mencatat pergerakan stok.</p>
      </div>
    );
  }

  const Meta = typeMeta[type];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Pergerakan Stok</h1>
        <p className="text-sm text-muted-foreground">Catat stok masuk, keluar, opname, dan transfer antar gudang.</p>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(typeMeta) as MovementType[]).map((t) => {
          const Icon = typeMeta[t].icon;
          const active = t === type;
          return (
            <button
              key={t}
              onClick={() => { setType(t); setDestWarehouseId(""); }}
              className={`text-left rounded-xl border p-3.5 transition ${active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
            >
              <div className={`inline-flex p-1.5 rounded-md ${typeMeta[t].bg} mb-2`}>
                <Icon className={`h-4 w-4 ${typeMeta[t].color}`} />
              </div>
              <div className="font-medium text-sm">{typeMeta[t].label}</div>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5 text-base">
            <div className={`p-1.5 rounded-md ${Meta.bg}`}>
              <Meta.icon className={`h-4 w-4 ${Meta.color}`} />
            </div>
            {Meta.label}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{Meta.desc}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Produk *</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                <SelectContent>
                  {products?.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{type === "transfer" ? "Gudang Asal *" : "Gudang *"}</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger><SelectValue placeholder="Pilih gudang" /></SelectTrigger>
                <SelectContent>
                  {warehouses?.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {type === "transfer" && (
              <div className="space-y-2">
                <Label>Gudang Tujuan *</Label>
                <Select value={destWarehouseId} onValueChange={setDestWarehouseId}>
                  <SelectTrigger><SelectValue placeholder="Pilih gudang tujuan" /></SelectTrigger>
                  <SelectContent>
                    {warehouses?.filter((w: any) => w.id !== warehouseId).map((w: any) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>{type === "opname" ? "Jumlah Aktual *" : "Jumlah *"}</Label>
              <Input
                type="number"
                min={type === "opname" ? 0 : 1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
              {(type === "out" || type === "opname") && currentStock !== undefined && productId && warehouseId && (
                <p className="text-xs text-muted-foreground">Stok saat ini: {currentStock} unit</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Referensi (opsional)</Label>
              <Input placeholder="No. PO, faktur, dsb" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Catatan</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>

          <Button onClick={() => m.mutate()} disabled={m.isPending} className="w-full sm:w-auto">
            {m.isPending ? "Menyimpan..." : "Catat Pergerakan"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
