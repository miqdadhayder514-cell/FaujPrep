begin;

alter table public.paid_mock_test_question_banks
  drop constraint if exists paid_mock_test_question_banks_test_slug_check;

alter table public.paid_mock_test_question_banks
  add constraint paid_mock_test_question_banks_test_slug_check
  check (test_slug in (
    'pma-long-course-159-mock-test-2',
    'pma-long-course-159-most-repeated-questions-bank',
    'academic-portion-mock-test-2'
  ));

alter table public.mock_test_purchase_requests
  drop constraint if exists mock_test_purchase_requests_test_slug_check;

alter table public.mock_test_purchase_requests
  add constraint mock_test_purchase_requests_test_slug_check
  check (test_slug in (
    'pma-long-course-159-mock-test-2',
    'pma-long-course-159-most-repeated-questions-bank',
    'academic-portion-mock-test-2'
  ));

alter table public.mock_test_purchase_requests
  drop constraint if exists mock_test_purchase_requests_amount_pkr_check;

alter table public.mock_test_purchase_requests
  add constraint mock_test_purchase_requests_amount_pkr_check
  check (
    (test_slug = 'pma-long-course-159-mock-test-2' and amount_pkr = 49)
    or (test_slug = 'pma-long-course-159-most-repeated-questions-bank' and amount_pkr = 79)
    or (test_slug = 'academic-portion-mock-test-2' and amount_pkr = 20)
  );

commit;
