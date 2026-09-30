create or replace function public.get_dashboard_data()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select jsonb_build_object(
    'profile', coalesce((select to_jsonb(profile_row) from public.profiles profile_row where profile_row.id = auth.uid()), '{}'::jsonb),
    'stats', jsonb_build_object(
      'questions_attempted', (select count(*) from public.question_attempts where user_id = auth.uid()),
      'correct_answers', (select count(*) from public.question_attempts where user_id = auth.uid() and is_correct = true),
      'accuracy', coalesce((select round(100.0 * count(*) filter (where is_correct) / nullif(count(*), 0), 1) from public.question_attempts where user_id = auth.uid()), 0),
      'tests_completed', (select count(*) from public.mock_test_attempts where user_id = auth.uid() and status = 'COMPLETED'),
      'best_score', coalesce((select max(score) from public.mock_test_attempts where user_id = auth.uid() and status = 'COMPLETED'), 0),
      'average_score', coalesce((select round(avg(100.0 * score / nullif(total_questions, 0)), 1) from public.mock_test_attempts where user_id = auth.uid() and status = 'COMPLETED'), 0)
    ),
    'recent_practice', coalesce((
      select jsonb_agg(to_jsonb(practice_row) order by practice_row.created_at desc)
      from (
        select qa.id, qa.created_at, qa.is_correct, qa.selected_option, q.question_text,
               s.name as subject_name, t.name as topic_name
        from public.question_attempts qa
        join public.questions q on q.id = qa.question_id
        left join public.subjects s on s.id = q.subject_id
        left join public.topics t on t.id = q.topic_id
        where qa.user_id = auth.uid()
        order by qa.created_at desc
        limit 10
      ) practice_row
    ), '[]'::jsonb),
    'recent_mock', coalesce((
      select jsonb_agg(to_jsonb(mock_row) order by mock_row.submitted_at desc)
      from (
        select a.id, a.submitted_at, a.score, a.total_questions, a.correct_answers,
               a.incorrect_answers, a.unanswered, a.time_taken_seconds, m.title
        from public.mock_test_attempts a
        join public.mock_tests m on m.id = a.mock_test_id
        where a.user_id = auth.uid() and a.status = 'COMPLETED'
        order by a.submitted_at desc
        limit 10
      ) mock_row
    ), '[]'::jsonb),
    'subject_performance', coalesce((
      select jsonb_agg(to_jsonb(subject_row) order by subject_row.attempted desc)
      from (
        select s.id, s.name, count(*) as attempted,
               count(*) filter (where qa.is_correct) as correct,
               round(100.0 * count(*) filter (where qa.is_correct) / nullif(count(*), 0), 1) as accuracy
        from public.question_attempts qa
        join public.questions q on q.id = qa.question_id
        join public.subjects s on s.id = q.subject_id
        where qa.user_id = auth.uid()
        group by s.id, s.name
      ) subject_row
    ), '[]'::jsonb),
    'topic_performance', coalesce((
      select jsonb_agg(to_jsonb(topic_row) order by topic_row.attempted desc)
      from (
        select t.id, t.name, s.name as subject_name, count(*) as attempted,
               count(*) filter (where qa.is_correct) as correct,
               round(100.0 * count(*) filter (where qa.is_correct) / nullif(count(*), 0), 1) as accuracy
        from public.question_attempts qa
        join public.questions q on q.id = qa.question_id
        join public.topics t on t.id = q.topic_id
        left join public.subjects s on s.id = q.subject_id
        where qa.user_id = auth.uid()
        group by t.id, t.name, s.name
      ) topic_row
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_dashboard_data() to authenticated;

DO $$
BEGIN
  if not exists (select 1 from pg_proc where proname = 'get_dashboard_data') then
    raise exception 'Dashboard aggregation function was not created';
  end if;
END $$;
