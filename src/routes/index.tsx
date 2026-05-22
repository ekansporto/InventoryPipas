import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Boxes, ShieldCheck, PackageSearch, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen">
      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2 font-bold text-lg">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <span>W Inventory</span>
        </div>
        <div className="flex gap-2">
          <Link to="/login"><Button variant="ghost">Masuk</Button></Link>
          <Link to="/login" search={{ tab: "signup" } as never}>
            <Button>Daftar</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-12 pb-24 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Sistem manajemen inventaris barang
          </div>
          <h1 className="mt-6 text-4xl sm:text-6xl font-bold tracking-tight">
            Kelola stok barang.{" "}
            <span className="text-primary">
              Pinjam tanpa ribet.
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground">
            Inventaris barang, pencatatan peminjaman, dan status kondisi — semua tersimpan rapi di satu tempat.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/login" search={{ tab: "signup" } as never}>
              <Button size="lg" className="gap-2">
                Mulai sekarang <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login"><Button size="lg" variant="outline">Masuk</Button></Link>
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-5xl gap-4 sm:grid-cols-3">
          {[
            { icon: PackageSearch, title: "Inventaris", desc: "Catat semua barang, kondisi, dan stoknya." },
            { icon: Boxes, title: "Peminjaman", desc: "Pinjam & kembalikan dengan riwayat lengkap." },
            { icon: ShieldCheck, title: "Role Admin", desc: "Admin bisa kelola barang, user bisa pinjam." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card/50 p-6 backdrop-blur transition hover:border-primary/40 hover:shadow-[var(--shadow-card)]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
