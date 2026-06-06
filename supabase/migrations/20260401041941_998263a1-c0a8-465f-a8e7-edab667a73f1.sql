DROP POLICY "System can insert meal history" ON public.meal_edit_history;
CREATE POLICY "Authenticated can insert meal history" ON public.meal_edit_history FOR INSERT TO authenticated WITH CHECK (
  changed_by = auth.uid()
);