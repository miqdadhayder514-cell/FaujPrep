begin;

update public.plans
set price_pkr = 1200,
    updated_at = now()
where slug = 'pro';

notify pgrst, 'reload schema';

commit;