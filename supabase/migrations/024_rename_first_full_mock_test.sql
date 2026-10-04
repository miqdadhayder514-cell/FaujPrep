begin;

update public.mock_tests
set title = 'PMA Long Course 159 Mock Test 1',
    updated_at = now()
where slug = 'first-full-mock-test';

commit;