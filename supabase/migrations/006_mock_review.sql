create or replace function public.get_mock_test_review(p_attempt_id uuid)
returns table (
  question_number integer,
  question_id uuid,
  question_text text,
  selected_option text,
  correct_option text,
  explanation text,
  is_correct boolean
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.mock_test_attempts
    where id = p_attempt_id and user_id = auth.uid() and status = 'COMPLETED'
  ) then
    raise exception 'You do not have permission to view this result';
  end if;

  return query
  select mtq.question_number, q.id, q.question_text, a.selected_option,
         q.correct_option, q.explanation, coalesce(a.is_correct, false)
  from public.mock_test_attempts attempt
  join public.mock_test_questions mtq on mtq.mock_test_id = attempt.mock_test_id
  join public.questions q on q.id = mtq.question_id
  left join public.mock_test_answers a on a.attempt_id = attempt.id and a.question_id = q.id
  where attempt.id = p_attempt_id
  order by mtq.question_number;
end;
$$;

grant execute on function public.get_mock_test_review(uuid) to authenticated;
