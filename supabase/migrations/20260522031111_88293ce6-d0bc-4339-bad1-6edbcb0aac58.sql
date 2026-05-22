CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL UNIQUE,
  supplier_id uuid,
  warehouse_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  received_date date,
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  batch_number text,
  expired_at date,
  serial_numbers text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  so_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  warehouse_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  serial_numbers text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_warehouse ON public.purchase_orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_order ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON public.purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_warehouse ON public.sales_orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_order ON public.sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_product ON public.sales_order_items(product_id);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_stock(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role) OR public.has_role(_user_id, 'staff'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, full_name, kelas)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'kelas')
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO is_first;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first THEN 'admin'::app_role ELSE 'staff'::app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS set_purchase_orders_updated_at ON public.purchase_orders;
CREATE TRIGGER set_purchase_orders_updated_at
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_sales_orders_updated_at ON public.sales_orders;
CREATE TRIGGER set_sales_orders_updated_at
BEFORE UPDATE ON public.sales_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER set_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "purchase orders read authed" ON public.purchase_orders;
CREATE POLICY "purchase orders read authed" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "purchase orders staff insert" ON public.purchase_orders;
CREATE POLICY "purchase orders staff insert" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (public.can_manage_stock(auth.uid()));
DROP POLICY IF EXISTS "purchase orders staff update" ON public.purchase_orders;
CREATE POLICY "purchase orders staff update" ON public.purchase_orders FOR UPDATE TO authenticated USING (public.can_manage_stock(auth.uid())) WITH CHECK (public.can_manage_stock(auth.uid()));
DROP POLICY IF EXISTS "purchase orders admin delete" ON public.purchase_orders;
CREATE POLICY "purchase orders admin delete" ON public.purchase_orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "purchase items read authed" ON public.purchase_order_items;
CREATE POLICY "purchase items read authed" ON public.purchase_order_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "purchase items staff insert" ON public.purchase_order_items;
CREATE POLICY "purchase items staff insert" ON public.purchase_order_items FOR INSERT TO authenticated WITH CHECK (public.can_manage_stock(auth.uid()));
DROP POLICY IF EXISTS "purchase items staff update" ON public.purchase_order_items;
CREATE POLICY "purchase items staff update" ON public.purchase_order_items FOR UPDATE TO authenticated USING (public.can_manage_stock(auth.uid())) WITH CHECK (public.can_manage_stock(auth.uid()));
DROP POLICY IF EXISTS "purchase items admin delete" ON public.purchase_order_items;
CREATE POLICY "purchase items admin delete" ON public.purchase_order_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "sales orders read authed" ON public.sales_orders;
CREATE POLICY "sales orders read authed" ON public.sales_orders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sales orders staff insert" ON public.sales_orders;
CREATE POLICY "sales orders staff insert" ON public.sales_orders FOR INSERT TO authenticated WITH CHECK (public.can_manage_stock(auth.uid()));
DROP POLICY IF EXISTS "sales orders staff update" ON public.sales_orders;
CREATE POLICY "sales orders staff update" ON public.sales_orders FOR UPDATE TO authenticated USING (public.can_manage_stock(auth.uid())) WITH CHECK (public.can_manage_stock(auth.uid()));
DROP POLICY IF EXISTS "sales orders admin delete" ON public.sales_orders;
CREATE POLICY "sales orders admin delete" ON public.sales_orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "sales items read authed" ON public.sales_order_items;
CREATE POLICY "sales items read authed" ON public.sales_order_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sales items staff insert" ON public.sales_order_items;
CREATE POLICY "sales items staff insert" ON public.sales_order_items FOR INSERT TO authenticated WITH CHECK (public.can_manage_stock(auth.uid()));
DROP POLICY IF EXISTS "sales items staff update" ON public.sales_order_items;
CREATE POLICY "sales items staff update" ON public.sales_order_items FOR UPDATE TO authenticated USING (public.can_manage_stock(auth.uid())) WITH CHECK (public.can_manage_stock(auth.uid()));
DROP POLICY IF EXISTS "sales items admin delete" ON public.sales_order_items;
CREATE POLICY "sales items admin delete" ON public.sales_order_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "api keys admin read" ON public.api_keys;
CREATE POLICY "api keys admin read" ON public.api_keys FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "api keys admin insert" ON public.api_keys;
CREATE POLICY "api keys admin insert" ON public.api_keys FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "api keys admin update" ON public.api_keys;
CREATE POLICY "api keys admin update" ON public.api_keys FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "api keys admin delete" ON public.api_keys;
CREATE POLICY "api keys admin delete" ON public.api_keys FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "movements admin insert" ON public.stock_movements;
DROP POLICY IF EXISTS "movements admin update" ON public.stock_movements;
DROP POLICY IF EXISTS "movements admin delete" ON public.stock_movements;
DROP POLICY IF EXISTS "movements staff insert" ON public.stock_movements;
CREATE POLICY "movements staff insert" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (public.can_manage_stock(auth.uid()));
DROP POLICY IF EXISTS "movements staff update" ON public.stock_movements;
CREATE POLICY "movements staff update" ON public.stock_movements FOR UPDATE TO authenticated USING (public.can_manage_stock(auth.uid())) WITH CHECK (public.can_manage_stock(auth.uid()));
CREATE POLICY "movements admin delete" ON public.stock_movements FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "batches admin insert" ON public.batches;
DROP POLICY IF EXISTS "batches admin update" ON public.batches;
DROP POLICY IF EXISTS "batches admin delete" ON public.batches;
DROP POLICY IF EXISTS "batches staff insert" ON public.batches;
CREATE POLICY "batches staff insert" ON public.batches FOR INSERT TO authenticated WITH CHECK (public.can_manage_stock(auth.uid()));
DROP POLICY IF EXISTS "batches staff update" ON public.batches;
CREATE POLICY "batches staff update" ON public.batches FOR UPDATE TO authenticated USING (public.can_manage_stock(auth.uid())) WITH CHECK (public.can_manage_stock(auth.uid()));
CREATE POLICY "batches admin delete" ON public.batches FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "serials admin insert" ON public.serial_numbers;
DROP POLICY IF EXISTS "serials admin update" ON public.serial_numbers;
DROP POLICY IF EXISTS "serials admin delete" ON public.serial_numbers;
DROP POLICY IF EXISTS "serials staff insert" ON public.serial_numbers;
CREATE POLICY "serials staff insert" ON public.serial_numbers FOR INSERT TO authenticated WITH CHECK (public.can_manage_stock(auth.uid()));
DROP POLICY IF EXISTS "serials staff update" ON public.serial_numbers;
CREATE POLICY "serials staff update" ON public.serial_numbers FOR UPDATE TO authenticated USING (public.can_manage_stock(auth.uid())) WITH CHECK (public.can_manage_stock(auth.uid()));
CREATE POLICY "serials admin delete" ON public.serial_numbers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));