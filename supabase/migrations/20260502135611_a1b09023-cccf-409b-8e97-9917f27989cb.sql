
-- Hostels table
CREATE TABLE public.hostels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  amount NUMERIC DEFAULT 0,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  notified_3day BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_subscriptions_hostel ON public.subscriptions(hostel_id);
CREATE INDEX idx_subscriptions_end_date ON public.subscriptions(end_date);

-- Add hostel_id to existing tables
ALTER TABLE public.profiles ADD COLUMN hostel_id UUID REFERENCES public.hostels(id) ON DELETE SET NULL;
ALTER TABLE public.meals ADD COLUMN hostel_id UUID REFERENCES public.hostels(id) ON DELETE CASCADE;
ALTER TABLE public.expenses ADD COLUMN hostel_id UUID REFERENCES public.hostels(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD COLUMN hostel_id UUID REFERENCES public.hostels(id) ON DELETE CASCADE;

-- Create default hostel
INSERT INTO public.hostels (id, name, address, contact_email)
VALUES ('00000000-0000-0000-0000-000000000001', 'Main Hostel', 'Default Address', 'admin@hostel.local');

-- Backfill all existing data with default hostel
UPDATE public.profiles SET hostel_id = '00000000-0000-0000-0000-000000000001' WHERE hostel_id IS NULL;
UPDATE public.meals SET hostel_id = '00000000-0000-0000-0000-000000000001' WHERE hostel_id IS NULL;
UPDATE public.expenses SET hostel_id = '00000000-0000-0000-0000-000000000001' WHERE hostel_id IS NULL;
UPDATE public.payments SET hostel_id = '00000000-0000-0000-0000-000000000001' WHERE hostel_id IS NULL;

-- Make hostel_id NOT NULL on transactional tables
ALTER TABLE public.meals ALTER COLUMN hostel_id SET NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN hostel_id SET NOT NULL;
ALTER TABLE public.payments ALTER COLUMN hostel_id SET NOT NULL;

-- Create default subscription (1 year)
INSERT INTO public.subscriptions (hostel_id, plan, start_date, end_date, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'yearly', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'active');

-- Promote dev.naimurrahman@gmail.com to super_admin
UPDATE public.profiles SET role = 'super_admin' WHERE email = 'dev.naimurrahman@gmail.com';
DELETE FROM public.user_roles WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'dev.naimurrahman@gmail.com');
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role FROM public.profiles WHERE email = 'dev.naimurrahman@gmail.com';

-- Helper: get user's hostel
CREATE OR REPLACE FUNCTION public.get_user_hostel(_user_id UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT hostel_id FROM public.profiles WHERE id = _user_id
$$;

-- Helper: subscription active?
CREATE OR REPLACE FUNCTION public.is_hostel_subscription_active(_hostel_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE hostel_id = _hostel_id
      AND status = 'active'
      AND end_date >= CURRENT_DATE
  )
$$;

-- Updated_at triggers
CREATE TRIGGER update_hostels_updated_at BEFORE UPDATE ON public.hostels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== RLS POLICIES =====

-- Hostels
CREATE POLICY "Super admin full access hostels" ON public.hostels
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Members view own hostel" ON public.hostels
  FOR SELECT TO authenticated
  USING (id = get_user_hostel(auth.uid()));

-- Subscriptions
CREATE POLICY "Super admin full access subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Hostel admins view own subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (hostel_id = get_user_hostel(auth.uid()));

-- Profiles: super admin can manage all
CREATE POLICY "Super admin manage all profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Restrict view-all-profiles to same hostel (replace existing permissive view-all)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users view profiles in own hostel" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    hostel_id = get_user_hostel(auth.uid())
    OR id = auth.uid()
    OR has_role(auth.uid(), 'super_admin')
  );

-- Meals: scope to hostel
DROP POLICY IF EXISTS "Admins/managers can view all meals" ON public.meals;
CREATE POLICY "Admins/managers view hostel meals" ON public.meals
  FOR SELECT TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
    AND hostel_id = get_user_hostel(auth.uid())
  );
CREATE POLICY "Super admin view all meals" ON public.meals
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Expenses: scope to hostel
DROP POLICY IF EXISTS "Authenticated can view expenses" ON public.expenses;
CREATE POLICY "View expenses in own hostel" ON public.expenses
  FOR SELECT TO authenticated
  USING (hostel_id = get_user_hostel(auth.uid()) OR has_role(auth.uid(), 'super_admin'));

-- Payments: scope to hostel
DROP POLICY IF EXISTS "Admins/managers can view all payments" ON public.payments;
CREATE POLICY "Admins/managers view hostel payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
    AND hostel_id = get_user_hostel(auth.uid())
  );
CREATE POLICY "Super admin view all payments" ON public.payments
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Update handle_new_user to also accept hostel_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, hostel_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user'),
    NULLIF(NEW.raw_user_meta_data->>'hostel_id','')::uuid
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user')
  );
  RETURN NEW;
END;
$$;
