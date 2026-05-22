CREATE OR REPLACE FUNCTION public.can_manage_stock(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role) OR public.has_role(_user_id, 'staff'::app_role)
$$;

REVOKE EXECUTE ON FUNCTION public.can_manage_stock(uuid) FROM PUBLIC, anon, authenticated;