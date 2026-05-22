
-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories read authed" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories admin insert" ON public.categories FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "categories admin update" ON public.categories FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "categories admin delete" ON public.categories FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SUPPLIERS
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers read authed" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers admin insert" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "suppliers admin update" ON public.suppliers FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "suppliers admin delete" ON public.suppliers FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- WAREHOUSES
CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "warehouses read authed" ON public.warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "warehouses admin insert" ON public.warehouses FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "warehouses admin update" ON public.warehouses FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "warehouses admin delete" ON public.warehouses FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE TRIGGER warehouses_updated_at BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE,
  barcode text,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  unit text NOT NULL DEFAULT 'pcs',
  purchase_price numeric(14,2) NOT NULL DEFAULT 0,
  selling_price numeric(14,2) NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'product', -- 'product' | 'asset'
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_barcode_idx ON public.products(barcode);
CREATE INDEX products_category_idx ON public.products(category_id);
CREATE INDEX products_supplier_idx ON public.products(supplier_id);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products read authed" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products admin insert" ON public.products FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "products admin update" ON public.products FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "products admin delete" ON public.products FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PRODUCT STOCK (per warehouse)
CREATE TABLE public.product_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, warehouse_id)
);
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock read authed" ON public.product_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "stock admin insert" ON public.product_stock FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "stock admin update" ON public.product_stock FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "stock admin delete" ON public.product_stock FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE TRIGGER product_stock_updated_at BEFORE UPDATE ON public.product_stock FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default warehouse
INSERT INTO public.warehouses (name, code, address) VALUES ('Gudang Utama', 'GD-01', 'Lokasi utama');
