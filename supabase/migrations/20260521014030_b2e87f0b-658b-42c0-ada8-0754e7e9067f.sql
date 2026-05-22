-- Ensure unique constraint on product_stock first
ALTER TABLE public.product_stock ADD CONSTRAINT product_stock_product_warehouse_key UNIQUE (product_id, warehouse_id);

-- stock_movements
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  warehouse_id UUID NOT NULL,
  destination_warehouse_id UUID,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in','out','opname','transfer')),
  quantity INTEGER NOT NULL,
  reference TEXT,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_movements_product ON public.stock_movements(product_id);
CREATE INDEX idx_movements_warehouse ON public.stock_movements(warehouse_id);
CREATE INDEX idx_movements_created ON public.stock_movements(created_at DESC);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movements read authed" ON public.stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "movements admin insert" ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "movements admin update" ON public.stock_movements FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "movements admin delete" ON public.stock_movements FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

-- batches
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  warehouse_id UUID NOT NULL,
  batch_number TEXT NOT NULL,
  expired_at DATE,
  quantity INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_batches_product ON public.batches(product_id);
CREATE INDEX idx_batches_expired ON public.batches(expired_at);

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "batches read authed" ON public.batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "batches admin insert" ON public.batches FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "batches admin update" ON public.batches FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "batches admin delete" ON public.batches FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER batches_set_updated BEFORE UPDATE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- serial_numbers
CREATE TABLE public.serial_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  warehouse_id UUID NOT NULL,
  serial_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','sold','damaged','reserved')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_serials_product ON public.serial_numbers(product_id);
CREATE INDEX idx_serials_status ON public.serial_numbers(status);

ALTER TABLE public.serial_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "serials read authed" ON public.serial_numbers FOR SELECT TO authenticated USING (true);
CREATE POLICY "serials admin insert" ON public.serial_numbers FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "serials admin update" ON public.serial_numbers FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "serials admin delete" ON public.serial_numbers FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER serials_set_updated BEFORE UPDATE ON public.serial_numbers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-update product_stock on movements
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.movement_type = 'in' THEN
    INSERT INTO public.product_stock (product_id, warehouse_id, quantity)
    VALUES (NEW.product_id, NEW.warehouse_id, NEW.quantity)
    ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = public.product_stock.quantity + NEW.quantity, updated_at = now();
  ELSIF NEW.movement_type = 'out' THEN
    INSERT INTO public.product_stock (product_id, warehouse_id, quantity)
    VALUES (NEW.product_id, NEW.warehouse_id, -NEW.quantity)
    ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = public.product_stock.quantity - NEW.quantity, updated_at = now();
  ELSIF NEW.movement_type = 'opname' THEN
    INSERT INTO public.product_stock (product_id, warehouse_id, quantity)
    VALUES (NEW.product_id, NEW.warehouse_id, NEW.quantity)
    ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = NEW.quantity, updated_at = now();
  ELSIF NEW.movement_type = 'transfer' AND NEW.destination_warehouse_id IS NOT NULL THEN
    INSERT INTO public.product_stock (product_id, warehouse_id, quantity)
    VALUES (NEW.product_id, NEW.warehouse_id, -NEW.quantity)
    ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = public.product_stock.quantity - NEW.quantity, updated_at = now();
    INSERT INTO public.product_stock (product_id, warehouse_id, quantity)
    VALUES (NEW.product_id, NEW.destination_warehouse_id, NEW.quantity)
    ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = public.product_stock.quantity + NEW.quantity, updated_at = now();
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER stock_movements_apply AFTER INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();