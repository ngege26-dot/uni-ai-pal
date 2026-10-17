CREATE TABLE public.class_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  subject text NOT NULL,
  days smallint[] NOT NULL,
  start_minute smallint NOT NULL,
  end_minute smallint NOT NULL,
  location text,
  color text NOT NULL DEFAULT 'blue',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_schedule TO authenticated;
GRANT ALL ON public.class_schedule TO service_role;
ALTER TABLE public.class_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own schedule select" ON public.class_schedule FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own schedule insert" ON public.class_schedule FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own schedule update" ON public.class_schedule FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own schedule delete" ON public.class_schedule FOR DELETE TO authenticated USING (auth.uid() = user_id);