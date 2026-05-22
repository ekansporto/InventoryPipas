Saya akan membangun **W Inventory** menjadi sistem manajemen inventaris yang lengkap. Karena cakupannya sangat besar (30 fitur), saya bagi ke dalam **5 fase** agar bisa dibangun bertahap dan stabil. Setiap fase langsung berfungsi.

---

## Fase 1 — Fondasi Data & Master Data
Membangun struktur database inti & CRUD master.

- **Manajemen Kategori Produk** — tambah/edit/hapus kategori
- **Manajemen Supplier** — data pemasok (nama, kontak, alamat)
- **Manajemen Gudang + Multi Gudang** — beberapa gudang/lokasi
- **Manajemen Data Produk** — produk dengan SKU, barcode, kategori, supplier, harga beli/jual, min stock
- **Manajemen Aset Barang** — kategori khusus untuk aset (non-konsumsi)
- **Hak Akses Pengguna (Admin / Staff / Viewer)** — role-based access

## Fase 2 — Operasional Stok
- **Stok Masuk** (penerimaan barang per gudang)
- **Stok Keluar** (pengeluaran barang)
- **Stok Opname** (penyesuaian fisik vs sistem)
- **Riwayat Transaksi Stok** (semua mutasi tercatat)
- **Minimum Stock Alert + Notifikasi Stok Menipis** (badge & toast)
- **Manajemen Batch & Expired Date**
- **Serial Number Tracking**

## Fase 3 — Pembelian & Penjualan
- **Manajemen Pembelian** (PO ke supplier → otomatis update stok masuk)
- **Manajemen Penjualan** (invoice → otomatis update stok keluar)

## Fase 4 — Scan & Dashboard
- **Scan Barcode & QR Code Produk** (library `html5-qrcode`)
- **Auto Scan Kamera** (kamera HP/laptop)
- **Dashboard Monitoring Stok** (kartu KPI, grafik)
- **Laporan Stok Real Time** + grafik per gudang

## Fase 5 — Laporan & Integrasi
- **Laporan Barang Masuk / Keluar / Persediaan Gudang**
- **Export Excel & PDF** (xlsx + jsPDF)
- **Integrasi API** — endpoint publik `/api/public/*` dengan API key untuk POS / ERP

---

## Detail Teknis (untuk referensi)

**Database (Supabase)** — tabel baru:
`categories`, `suppliers`, `warehouses`, `products`, `product_stock` (qty per gudang), `stock_movements` (in/out/adjustment), `purchase_orders` + `purchase_items`, `sales_orders` + `sales_items`, `batches` (batch + expired), `serial_numbers`, `api_keys` (untuk integrasi).

Role: enum `app_role` diperluas → `admin`, `staff`, `viewer`.
RLS: semua tabel pakai `has_role()`.

**Stack tambahan:**
- `html5-qrcode` — scan barcode/QR via kamera
- `xlsx` — export Excel
- `jspdf` + `jspdf-autotable` — export PDF
- `recharts` (sudah ada) — grafik dashboard

**Halaman baru** (di bawah `_authenticated/`):
`/products`, `/categories`, `/suppliers`, `/warehouses`, `/stock-in`, `/stock-out`, `/stock-opname`, `/movements`, `/purchases`, `/sales`, `/batches`, `/serials`, `/scan`, `/reports`, `/users`, `/api-keys`.

Halaman lama (`/equipment`, `/loans`) tetap ada sebagai modul **Aset & Peminjaman**.

---

## Rekomendasi
Saya sarankan kita **mulai dari Fase 1** dulu (fondasi data). Setelah berjalan baik, kita lanjut Fase 2, dst. Membangun semua sekaligus berisiko tinggi error dan sulit di-debug.

**Apakah Anda setuju mulai dari Fase 1?** Atau Anda ingin urutan fase yang berbeda?