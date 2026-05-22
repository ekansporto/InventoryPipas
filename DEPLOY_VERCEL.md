# Deploy ke Vercel

Project ini sudah dikonfigurasi untuk Vercel (target `vercel` di `vite.config.ts`).

## Langkah
1. Push repo ini ke GitHub.
2. Di Vercel: New Project → import repo.
3. Framework Preset: **Other** (vercel.json sudah mengatur build).
4. Build Command: `vite build` (sudah di vercel.json).
5. Output: `.vercel/output` (otomatis dihasilkan oleh TanStack Start Vercel preset).
6. Tambahkan Environment Variables yang dibutuhkan (mis. `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, dst).
7. Deploy.

## Catatan
- File `wrangler.jsonc` dan plugin `@cloudflare/vite-plugin` dihapus karena target sudah pindah ke Vercel.
- `src/server.ts` sekarang re-export handler default TanStack Start (kompatibel dengan Vercel Functions).
