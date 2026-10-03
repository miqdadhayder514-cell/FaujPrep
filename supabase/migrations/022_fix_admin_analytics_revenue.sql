begin;

create or replace function public.get_admin_analytics(p_range text default '30d')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_from timestamptz;
declare v_daily_from date;
declare v_overview jsonb;
declare v_popular jsonb;
declare v_practice jsonb;
declare v_mock jsonb;
declare v_conversion jsonb;
declare v_revenue jsonb;
declare v_daily jsonb;
declare v_has_data boolean;
begin
  if not public.is_analytics_admin() then
    raise exception 'Analytics access denied';
  end if;

  if p_range not in ('7d', '30d', '90d', 'all') then
    raise exception 'Unsupported analytics date range';
  end if;

  v_from := case p_range
    when '7d' then now() - interval '7 days'
    when '30d' then now() - interval '30 days'
    when '90d' then now() - interval '90 days'
    else null
  end;
  v_daily_from := greatest(coalesce(v_from::date, current_date - 89), current_date - 89);

  select jsonb_build_object(
    'page_views', (select count(*) from public.analytics_events where event_name = 'PAGE_VIEW' and (v_from is null or created_at >= v_from)),
    'unique_authenticated_users', (select count(distinct user_id) from public.analytics_events where event_name = 'PAGE_VIEW' and user_id is not null and (v_from is null or created_at >= v_from)),
    'practice_started', (select count(*) from public.analytics_events where event_name = 'QUESTION_PRACTICE_STARTED' and (v_from is null or created_at >= v_from)),
    'practice_completed', (select count(*) from public.analytics_events where event_name = 'QUESTION_PRACTICE_COMPLETED' and (v_from is null or created_at >= v_from)),
    'mock_started', (select count(*) from public.mock_test_attempts where (v_from is null or started_at >= v_from)),
    'mock_completed', (select count(*) from public.mock_test_attempts where status = 'COMPLETED' and submitted_at is not null and (v_from is null or submitted_at >= v_from)),
    'study_material_views', (select count(*) from public.analytics_events where event_name = 'STUDY_MATERIAL_VIEWED' and (v_from is null or created_at >= v_from)),
    'current_affairs_views', (select count(*) from public.analytics_events where event_name = 'CURRENT_AFFAIRS_VIEWED' and (v_from is null or created_at >= v_from)),
    'issb_views', (select count(*) from public.analytics_events where event_name = 'ISSB_MODULE_VIEWED' and (v_from is null or created_at >= v_from)),
    'pricing_views', (select count(*) from public.analytics_events where event_name = 'PRICING_VIEWED' and (v_from is null or created_at >= v_from)),
    'payment_submissions', (select count(*) from public.payment_transactions where payment_method = 'JAZZCASH_MANUAL' and (v_from is null or created_at >= v_from)),
    'payments_approved', (select count(*) from public.payment_transactions where status = 'APPROVED' and (v_from is null or updated_at >= v_from))
  ) into v_overview;

  select jsonb_build_object(
    'branches', coalesce((
      select jsonb_agg(jsonb_build_object('id', ranked.entity_id, 'name', coalesce(branch.name, 'Branch'), 'views', ranked.total) order by ranked.total desc)
      from (select entity_id, count(*) as total from public.analytics_events where event_name = 'BRANCH_VIEWED' and entity_id is not null and (v_from is null or created_at >= v_from) group by entity_id order by total desc limit 10) ranked
      left join public.military_branches branch on branch.id = ranked.entity_id
    ), '[]'::jsonb),
    'study_materials', coalesce((
      select jsonb_agg(jsonb_build_object('id', ranked.entity_id, 'title', coalesce(item.title, 'Study material'), 'views', ranked.total) order by ranked.total desc)
      from (select entity_id, count(*) as total from public.analytics_events where event_name = 'STUDY_MATERIAL_VIEWED' and entity_id is not null and (v_from is null or created_at >= v_from) group by entity_id order by total desc limit 10) ranked
      join public.study_materials item on item.id = ranked.entity_id and item.is_published = true
    ), '[]'::jsonb),
    'current_affairs', coalesce((
      select jsonb_agg(jsonb_build_object('id', ranked.entity_id, 'title', coalesce(item.title, 'Current affairs'), 'views', ranked.total) order by ranked.total desc)
      from (select entity_id, count(*) as total from public.analytics_events where event_name = 'CURRENT_AFFAIRS_VIEWED' and entity_id is not null and (v_from is null or created_at >= v_from) group by entity_id order by total desc limit 10) ranked
      join public.current_affairs item on item.id = ranked.entity_id and item.is_published = true
    ), '[]'::jsonb),
    'issb_modules', coalesce((
      select jsonb_agg(jsonb_build_object('id', ranked.entity_id, 'title', coalesce(item.title, 'ISSB module'), 'views', ranked.total) order by ranked.total desc)
      from (select entity_id, count(*) as total from public.analytics_events where event_name = 'ISSB_MODULE_VIEWED' and entity_id is not null and (v_from is null or created_at >= v_from) group by entity_id order by total desc limit 10) ranked
      join public.issb_modules item on item.id = ranked.entity_id and item.is_published = true
    ), '[]'::jsonb),
    'mock_tests', coalesce((
      select jsonb_agg(jsonb_build_object('id', ranked.mock_test_id, 'title', coalesce(item.title, 'Mock test'), 'views', ranked.total) order by ranked.total desc)
      from (select mock_test_id, count(*) as total from public.mock_test_attempts where (v_from is null or started_at >= v_from) group by mock_test_id order by total desc limit 10) ranked
      join public.mock_tests item on item.id = ranked.mock_test_id and item.is_active = true
    ), '[]'::jsonb),
    'subjects', coalesce((
      select jsonb_agg(jsonb_build_object('id', ranked.subject_id, 'name', coalesce(subject.name, 'Subject'), 'attempts', ranked.total) order by ranked.total desc)
      from (select question.subject_id, count(*) as total from public.question_attempts attempt join public.questions question on question.id = attempt.question_id where question.subject_id is not null and (v_from is null or attempt.created_at >= v_from) group by question.subject_id order by total desc limit 10) ranked
      join public.subjects subject on subject.id = ranked.subject_id
    ), '[]'::jsonb),
    'topics', coalesce((
      select jsonb_agg(jsonb_build_object('id', ranked.topic_id, 'name', coalesce(topic.name, 'Topic'), 'attempts', ranked.total) order by ranked.total desc)
      from (select question.topic_id, count(*) as total from public.question_attempts attempt join public.questions question on question.id = attempt.question_id where question.topic_id is not null and (v_from is null or attempt.created_at >= v_from) group by question.topic_id order by total desc limit 10) ranked
      join public.topics topic on topic.id = ranked.topic_id
    ), '[]'::jsonb)
  ) into v_popular;

  select jsonb_build_object(
    'sessions_started', (select count(*) from public.analytics_events where event_name = 'QUESTION_PRACTICE_STARTED' and (v_from is null or created_at >= v_from)),
    'sessions_completed', (select count(*) from public.analytics_events where event_name = 'QUESTION_PRACTICE_COMPLETED' and (v_from is null or created_at >= v_from)),
    'questions_attempted', (select count(*) from public.question_attempts where v_from is null or created_at >= v_from),
    'correct_answers', (select count(*) from public.question_attempts where is_correct and (v_from is null or created_at >= v_from)),
    'incorrect_answers', (select count(*) from public.question_attempts where not is_correct and (v_from is null or created_at >= v_from)),
    'subjects', v_popular->'subjects',
    'topics', v_popular->'topics'
  ) into v_practice;

  select jsonb_build_object(
    'started', (select count(*) from public.mock_test_attempts where v_from is null or started_at >= v_from),
    'completed', (select count(*) from public.mock_test_attempts where status = 'COMPLETED' and submitted_at is not null and (v_from is null or submitted_at >= v_from)),
    'completion_rate', coalesce(round(100.0 * (select count(*) from public.mock_test_attempts where status = 'COMPLETED' and submitted_at is not null and (v_from is null or submitted_at >= v_from)) / nullif((select count(*) from public.mock_test_attempts where v_from is null or started_at >= v_from), 0), 1), 0),
    'average_score', (select round(avg(score)::numeric, 1) from public.mock_test_attempts where status = 'COMPLETED' and score is not null and (v_from is null or submitted_at >= v_from)),
    'average_completion_seconds', (select round(avg(time_taken_seconds)::numeric) from public.mock_test_attempts where status = 'COMPLETED' and time_taken_seconds is not null and (v_from is null or submitted_at >= v_from)),
    'popular', v_popular->'mock_tests'
  ) into v_mock;

  select jsonb_build_object(
    'visitors', (select count(distinct session_id) from public.analytics_events where event_name = 'PAGE_VIEW' and session_id is not null and (v_from is null or created_at >= v_from)),
    'registrations', (select count(*) from public.profiles where v_from is null or created_at >= v_from),
    'pricing_views', (select count(*) from public.analytics_events where event_name = 'PRICING_VIEWED' and (v_from is null or created_at >= v_from)),
    'checkout_started', (select count(*) from public.analytics_events where event_name = 'CHECKOUT_STARTED' and (v_from is null or created_at >= v_from)),
    'payments_submitted', (select count(*) from public.payment_transactions where payment_method = 'JAZZCASH_MANUAL' and (v_from is null or created_at >= v_from)),
    'payments_approved', (select count(*) from public.payment_transactions where status = 'APPROVED' and (v_from is null or updated_at >= v_from)),
    'users_by_plan', coalesce((
      select jsonb_object_agg(plan_slug, total) from (
        select case when subscription.status = 'ACTIVE' then plan.slug else 'free' end as plan_slug, count(*) as total
        from public.profiles profile
        left join public.subscriptions subscription on subscription.user_id = profile.id
        left join public.plans plan on plan.id = subscription.plan_id
        group by case when subscription.status = 'ACTIVE' then plan.slug else 'free' end
      ) counts
    ), '{}'::jsonb),
    'upgrades', coalesce((
      select jsonb_agg(jsonb_build_object('from', upgrades.from_plan, 'to', upgrades.to_plan, 'count', upgrades.total))
      from (select properties->>'plan_from' as from_plan, properties->>'plan_to' as to_plan, count(*) as total from public.analytics_events where event_name = 'PLAN_UPGRADED' and (v_from is null or created_at >= v_from) group by 1, 2) upgrades
    ), '[]'::jsonb)
  ) into v_conversion;

  select jsonb_build_object(
    'approved_total_pkr', coalesce(sum(plan_totals.total), 0),
    'by_plan', coalesce(jsonb_agg(jsonb_build_object('plan', plan.slug, 'amount_pkr', plan_totals.total, 'transactions', plan_totals.transactions)), '[]'::jsonb)
  ) into v_revenue
  from (
    select plan_id, sum(amount_pkr) as total, count(*) as transactions
    from public.payment_transactions
    where status = 'APPROVED' and (v_from is null or updated_at >= v_from)
    group by plan_id
  ) plan_totals
  join public.plans plan on plan.id = plan_totals.plan_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'date', day_point.day::date,
    'page_views', coalesce(views.total, 0),
    'practice_started', coalesce(practice.total, 0),
    'mock_started', coalesce(mock.total, 0),
    'approved_revenue_pkr', coalesce(revenue.total, 0)
  ) order by day_point.day), '[]'::jsonb)
  into v_daily
  from generate_series(v_daily_from::timestamp, current_date::timestamp, interval '1 day') day_point(day)
  left join lateral (
    select count(*) as total from public.analytics_events where event_name = 'PAGE_VIEW' and (created_at at time zone 'UTC')::date = day_point.day::date
  ) views on true
  left join lateral (
    select count(*) as total from public.analytics_events where event_name = 'QUESTION_PRACTICE_STARTED' and (created_at at time zone 'UTC')::date = day_point.day::date
  ) practice on true
  left join lateral (
    select count(*) as total from public.mock_test_attempts where (started_at at time zone 'UTC')::date = day_point.day::date
  ) mock on true
  left join lateral (
    select coalesce(sum(amount_pkr), 0) as total from public.payment_transactions where status = 'APPROVED' and (updated_at at time zone 'UTC')::date = day_point.day::date
  ) revenue on true;

  v_has_data := coalesce((v_overview->>'page_views')::integer, 0) > 0
    or coalesce((v_overview->>'practice_started')::integer, 0) > 0
    or coalesce((v_overview->>'mock_started')::integer, 0) > 0
    or coalesce((v_overview->>'payment_submissions')::integer, 0) > 0
    or coalesce((v_practice->>'questions_attempted')::integer, 0) > 0
    or coalesce((v_conversion->>'registrations')::integer, 0) > 0;

  return jsonb_build_object(
    'range', p_range,
    'has_data', v_has_data,
    'overview', v_overview,
    'popular', v_popular,
    'practice', v_practice,
    'mock_tests', v_mock,
    'conversion', v_conversion,
    'revenue', v_revenue,
    'daily', v_daily
  );
end;
$$;

revoke all on function public.get_admin_analytics(text) from public, anon;
grant execute on function public.get_admin_analytics(text) to authenticated;

commit;
