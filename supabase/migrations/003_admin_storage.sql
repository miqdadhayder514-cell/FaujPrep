create or replace function public.is_editor_or_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('EDITOR', 'ADMIN')
  );
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'military_branches', 'exams', 'subjects', 'exam_subjects', 'topics',
    'questions', 'question_tags', 'question_tag_map', 'mock_tests',
    'mock_test_questions', 'study_materials', 'current_affairs', 'issb_modules'
  ] LOOP
    EXECUTE format('drop policy if exists %I_admin_write on public.%I', table_name, table_name);
    EXECUTE format('create policy %I_admin_write on public.%I for all to authenticated using (public.is_editor_or_admin()) with check (public.is_editor_or_admin())', table_name, table_name);
  END LOOP;
END $$;

insert into storage.buckets (id, name, public)
values
  ('logos', 'logos', true),
  ('branch-images', 'branch-images', true),
  ('study-materials', 'study-materials', false),
  ('question-images', 'question-images', true),
  ('avatars', 'avatars', false),
  ('current-affairs-images', 'current-affairs-images', true)
on conflict (id) do update set public = excluded.public;

DROP POLICY IF EXISTS public_read_faujprep_assets ON storage.objects;
CREATE POLICY public_read_faujprep_assets
ON storage.objects FOR SELECT TO public
USING (bucket_id IN ('logos', 'branch-images', 'question-images', 'current-affairs-images'));

DROP POLICY IF EXISTS admins_manage_faujprep_assets ON storage.objects;
CREATE POLICY admins_manage_faujprep_assets
ON storage.objects FOR ALL TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

DROP POLICY IF EXISTS users_manage_own_avatar ON storage.objects;
CREATE POLICY users_manage_own_avatar
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'avatars' AND (owner_id = auth.uid()::text OR public.is_editor_or_admin()))
WITH CHECK (bucket_id = 'avatars' AND (owner_id = auth.uid()::text OR public.is_editor_or_admin()));

DO $$
BEGIN
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'questions' and policyname = 'questions_admin_write') then
    raise exception 'Admin question policy was not created';
  end if;
  if not exists (select 1 from storage.buckets where id = 'study-materials') then
    raise exception 'Storage buckets were not created';
  end if;
END $$;
