insert into public.mock_test_questions (mock_test_id, question_id, question_number)
select mt.id, q.id, row_number() over (partition by mt.id order by q.created_at, q.id)
from public.mock_tests mt
cross join lateral (
  select id, created_at
  from public.questions
  where is_active = true
  order by created_at, id
  limit mt.total_questions
) q
on conflict (mock_test_id, question_id) do nothing;

DO $$
DECLARE mock_count integer;
DECLARE linked_count integer;
BEGIN
  select count(*) into mock_count from public.mock_tests where is_active = true;
  select count(distinct mock_test_id) into linked_count from public.mock_test_questions;
  if mock_count > 0 and linked_count < mock_count then
    raise exception 'Every active mock test must have linked questions';
  end if;
END $$;

create index if not exists current_affairs_category_idx on public.current_affairs(category);
create index if not exists study_materials_type_idx on public.study_materials(material_type);
