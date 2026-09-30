do $$
declare
  branch_count integer;
  subject_count integer;
  exam_count integer;
begin
  select count(*) into branch_count from public.military_branches;
  select count(*) into subject_count from public.subjects;
  select count(*) into exam_count from public.exams;

  if branch_count < 4 then raise exception 'Expected four military branches, found %', branch_count; end if;
  if subject_count < 15 then raise exception 'Expected starter subjects, found %', subject_count; end if;
  if exam_count < 6 then raise exception 'Expected starter exams, found %', exam_count; end if;

  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'questions_subject_id_idx') then
    raise exception 'questions_subject_id_idx is missing';
  end if;

  if not exists (select 1 from pg_class where relname = 'public_questions' and relkind = 'v') then
    raise exception 'public_questions view is missing';
  end if;
  if not exists (select 1 from pg_class where relname = 'public_mock_test_questions' and relkind = 'v') then
    raise exception 'public_mock_test_questions view is missing';
  end if;
end $$;

select 'branches' as entity, count(*) as total from public.military_branches
union all select 'subjects', count(*) from public.subjects
union all select 'exams', count(*) from public.exams
union all select 'topics', count(*) from public.topics
union all select 'mock_tests', count(*) from public.mock_tests;
