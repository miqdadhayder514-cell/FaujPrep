create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id uuid,
  event_name text not null check (event_name in (
    'PAGE_VIEW', 'SIGNUP_STARTED', 'SIGNUP_COMPLETED', 'LOGIN_COMPLETED',
    'BRANCH_VIEWED', 'EXAM_VIEWED', 'SUBJECT_VIEWED', 'TOPIC_VIEWED',
    'QUESTION_PRACTICE_STARTED', 'QUESTION_PRACTICE_COMPLETED',
    'MOCK_TEST_VIEWED', 'MOCK_TEST_STARTED', 'MOCK_TEST_COMPLETED',
    'STUDY_MATERIAL_VIEWED', 'CURRENT_AFFAIRS_VIEWED', 'ISSB_MODULE_VIEWED',
    'SEARCH_PERFORMED', 'PRICING_VIEWED', 'CHECKOUT_STARTED',
    'PAYMENT_SUBMITTED', 'PAYMENT_APPROVED', 'PAYMENT_REJECTED', 'PLAN_UPGRADED'
  )),
  page_path text,
  entity_type text,
  entity_id uuid,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_properties_object check (jsonb_typeof(properties) = 'object'),
  constraint analytics_events_properties_size check (octet_length(properties::text) <= 2048)
);

create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_name_created_at_idx on public.analytics_events (event_name, created_at desc);
create index if not exists analytics_events_entity_created_at_idx on public.analytics_events (entity_type, entity_id, created_at desc);
create index if not exists analytics_events_user_created_at_idx on public.analytics_events (user_id, created_at desc) where user_id is not null;
create index if not exists analytics_events_session_created_at_idx on public.analytics_events (session_id, created_at desc) where session_id is not null;
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);
create index if not exists question_attempts_created_at_idx on public.question_attempts (created_at desc);
create index if not exists mock_test_attempts_started_at_idx on public.mock_test_attempts (started_at desc);
create index if not exists mock_test_attempts_completed_at_idx on public.mock_test_attempts (submitted_at desc) where status = 'COMPLETED';
create index if not exists payment_transactions_created_at_idx on public.payment_transactions (created_at desc);
create index if not exists payment_transactions_approved_at_idx on public.payment_transactions (updated_at desc) where status = 'APPROVED';

alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;

create or replace function public.track_analytics_event(
  p_event_name text,
  p_session_id uuid default null,
  p_page_path text default null,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_properties jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_path text;
declare v_key text;
declare v_value jsonb;
declare v_session_count integer;
declare v_user_count integer;
begin
  if p_event_name not in (
    'PAGE_VIEW', 'SIGNUP_STARTED', 'SIGNUP_COMPLETED', 'LOGIN_COMPLETED',
    'BRANCH_VIEWED', 'EXAM_VIEWED', 'SUBJECT_VIEWED', 'TOPIC_VIEWED',
    'QUESTION_PRACTICE_STARTED', 'QUESTION_PRACTICE_COMPLETED',
    'MOCK_TEST_VIEWED', 'MOCK_TEST_STARTED', 'MOCK_TEST_COMPLETED',
    'STUDY_MATERIAL_VIEWED', 'CURRENT_AFFAIRS_VIEWED', 'ISSB_MODULE_VIEWED',
    'SEARCH_PERFORMED', 'PRICING_VIEWED', 'CHECKOUT_STARTED'
  ) then
    raise exception 'Unsupported client analytics event';
  end if;

  if auth.uid() is null and p_session_id is null then
    raise exception 'Anonymous analytics requires a session identifier';
  end if;

  if jsonb_typeof(coalesce(p_properties, '{}'::jsonb)) <> 'object'
    or octet_length(coalesce(p_properties, '{}'::jsonb)::text) > 2048 then
    raise exception 'Invalid analytics properties';
  end if;

  for v_key, v_value in select key, value from jsonb_each(coalesce(p_properties, '{}'::jsonb)) loop
    if v_key not in (
      'branch', 'subject', 'topic', 'difficulty', 'question_count',
      'result_count', 'content_type_filter', 'branch_filter', 'subject_filter',
      'duration_minutes', 'plan_slug'
    ) then
      raise exception 'Unsupported analytics property';
    end if;
    if jsonb_typeof(v_value) not in ('string', 'number', 'boolean')
      or length(v_value::text) > 110 then
      raise exception 'Invalid analytics property value';
    end if;
    if v_key in ('question_count', 'result_count', 'duration_minutes')
      and (jsonb_typeof(v_value) <> 'number' or (v_value #>> '{}')::numeric < 0 or (v_value #>> '{}')::numeric > 1000) then
      raise exception 'Invalid analytics numeric property';
    end if;
    if v_key = 'plan_slug' and (v_value #>> '{}') not in ('free', 'pro', 'premium') then
      raise exception 'Invalid plan property';
    end if;
  end loop;

  if p_entity_type is not null and p_entity_type not in (
    'branch', 'exam', 'subject', 'topic', 'mock_test', 'study_material', 'current_affair', 'issb_module'
  ) then
    raise exception 'Unsupported analytics entity';
  end if;

  v_path := split_part(coalesce(p_page_path, ''), '?', 1);
  if v_path = '' or v_path !~ '^/[a-zA-Z0-9/_-]{0,199}$' then
    v_path := null;
  end if;

  if p_session_id is not null then
    select count(*) into v_session_count
    from public.analytics_events
    where session_id = p_session_id and created_at > now() - interval '1 hour';
    if v_session_count >= 120 then
      return false;
    end if;
  end if;

  if auth.uid() is not null then
    select count(*) into v_user_count
    from public.analytics_events
    where user_id = auth.uid() and created_at > now() - interval '1 hour';
    if v_user_count >= 300 then
      return false;
    end if;
  end if;

  insert into public.analytics_events (user_id, session_id, event_name, page_path, entity_type, entity_id, properties)
  values (auth.uid(), p_session_id, p_event_name, v_path, p_entity_type, p_entity_id, coalesce(p_properties, '{}'::jsonb));
  return true;
end;
$$;

revoke all on function public.track_analytics_event(text, uuid, text, text, uuid, jsonb) from public;
grant execute on function public.track_analytics_event(text, uuid, text, text, uuid, jsonb) to anon, authenticated;

create or replace function public.is_analytics_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  );
$$;

revoke all on function public.is_analytics_admin() from public;
grant execute on function public.is_analytics_admin() to authenticated;

create or replace function public.log_payment_analytics_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_plan_slug text;
declare v_event_name text;
begin
  select slug into v_plan_slug from public.plans where id = new.plan_id;

  if tg_op = 'INSERT' then
    if new.payment_method is distinct from 'JAZZCASH_MANUAL' then
      return new;
    end if;
    v_event_name := 'PAYMENT_SUBMITTED';
  elsif new.status is distinct from old.status and new.status = 'APPROVED' then
    v_event_name := 'PAYMENT_APPROVED';
  elsif new.status is distinct from old.status and new.status = 'REJECTED' then
    v_event_name := 'PAYMENT_REJECTED';
  else
    return new;
  end if;

  insert into public.analytics_events (user_id, event_name, properties, created_at)
  values (
    new.user_id,
    v_event_name,
    jsonb_build_object('plan_slug', v_plan_slug, 'amount_pkr', new.amount_pkr, 'status', new.status),
    case when tg_op = 'INSERT' then new.created_at else new.updated_at end
  );
  return new;
end;
$$;

revoke all on function public.log_payment_analytics_event() from public;
drop trigger if exists payment_transactions_analytics_event on public.payment_transactions;
create trigger payment_transactions_analytics_event
after insert or update of status on public.payment_transactions
for each row execute function public.log_payment_analytics_event();

create or replace function public.log_subscription_upgrade_analytics_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_from_slug text;
declare v_to_slug text;
begin
  if new.status <> 'ACTIVE' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.plan_id is not distinct from old.plan_id then
      return new;
    end if;
    select slug into v_from_slug from public.plans where id = old.plan_id;
  else
    v_from_slug := 'free';
  end if;
  select slug into v_to_slug from public.plans where id = new.plan_id;
  if v_from_slug is null
    or v_to_slug not in ('pro', 'premium')
    or v_from_slug = v_to_slug
    or (v_to_slug = 'pro' and v_from_slug <> 'free')
    or (v_to_slug = 'premium' and v_from_slug not in ('free', 'pro')) then
    return new;
  end if;

  insert into public.analytics_events (user_id, event_name, properties, created_at)
  values (
    new.user_id,
    'PLAN_UPGRADED',
    jsonb_build_object('plan_from', v_from_slug, 'plan_to', v_to_slug),
    new.updated_at
  );
  return new;
end;
$$;

revoke all on function public.log_subscription_upgrade_analytics_event() from public;
drop trigger if exists subscriptions_analytics_upgrade_event on public.subscriptions;
create trigger subscriptions_analytics_upgrade_event
after insert or update of plan_id on public.subscriptions
for each row execute function public.log_subscription_upgrade_analytics_event();

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
    'approved_total_pkr', coalesce(sum(amount_pkr), 0),
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