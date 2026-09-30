insert into public.study_materials (title, slug, description, content, material_type, subject_id, topic_id, branch_id, cover_image_url, pdf_url, is_premium, is_published)
select x.title, x.slug, x.description, x.content, x.material_type, s.id, t.id, b.id, x.cover_image_url, x.pdf_url, x.is_premium, x.is_published
from (values
  (
    'ISSB Psychological Preparation Overview',
    'issb-psychological-preparation-overview',
    'An overview for ISSB psychological preparation without implying official selection guarantees.',
    'This brief overview explains the purpose of psychological preparation and how candidates can structure practice in a calm, disciplined way. It is intended for educational support and revision, not as an official ISSB assessment sheet.',
    'ARTICLE',
    'issb',
    'issb-psychological-preparation',
    'psychological-preparation',
    null,
    null,
    false,
    true
  ),
  (
    'Interview Preparation Reflection Guide',
    'interview-preparation-reflection-guide',
    'A structured guide to prepare for personal interviews and self-awareness questions.',
    'The guide introduces a disciplined approach to personal interviews, helping candidates reflect on their background, motives, and communication style. It focuses on balanced preparation rather than memorized scripts.',
    'GUIDE',
    'issb',
    'issb-interview',
    'interview-practice',
    null,
    null,
    false,
    true
  ),
  (
    'GTO Group Planning Preparation',
    'gto-group-planning-preparation',
    'A practical overview of group planning and team coordination expectations.',
    'This study material explains the broader logic behind group tasks and planning exercises, including communication, task allocation, and calm leadership patterns. It supports preparation without claiming official scoring models.',
    'NOTES',
    'issb',
    'issb-gto',
    'group-planning',
    null,
    null,
    false,
    true
  )
) as x(title, slug, description, content, material_type, branch_slug, subject_slug, topic_slug, cover_image_url, pdf_url, is_premium, is_published)
join public.military_branches b on b.slug = x.branch_slug
join public.subjects s on s.slug = x.subject_slug
left join public.topics t on t.subject_id = s.id and t.slug = x.topic_slug
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  content = excluded.content,
  material_type = excluded.material_type,
  subject_id = excluded.subject_id,
  topic_id = excluded.topic_id,
  branch_id = excluded.branch_id,
  cover_image_url = excluded.cover_image_url,
  pdf_url = excluded.pdf_url,
  is_premium = excluded.is_premium,
  is_published = excluded.is_published,
  updated_at = now();

insert into public.current_affairs (title, slug, summary, content, category, published_at, source_name, source_url, image_url, is_published)
values
  (
    'Pakistan Defence and Security Priorities',
    'pakistan-defence-and-security-priorities',
    'A concise look at Pakistan’s defence and strategic priorities for disciplined preparation and awareness.',
    'Defence and security discussions remain central to national policy and public discourse in Pakistan. Candidates preparing for military entry tests should stay informed about strategic priorities, border security, force readiness, and public-sector modernization initiatives through reliable and contemporary sources.',
    'Defence',
    now() - interval '18 days',
    'Dawn',
    'https://www.dawn.com/',
    null,
    true
  ),
  (
    'Regional Security and Strategic Outlook',
    'regional-security-and-strategic-outlook',
    'An overview of regional strategic developments and their broader implications for Pakistan’s security environment.',
    'Regional security affairs in South Asia are shaped by geopolitical competition, military modernization, border management, and diplomatic engagement. For candidate preparation, the focus should remain on understanding how these developments affect national security, military readiness, and strategic policy planning.',
    'International',
    now() - interval '32 days',
    'The Express Tribune',
    'https://tribune.com.pk/',
    null,
    true
  ),
  (
    'Economic and Infrastructure Update',
    'economic-and-infrastructure-update',
    'A general awareness update on national infrastructure, development goals, and economic planning.',
    'Economic planning and infrastructure development are key themes in public policy discussions. Candidates preparing for general knowledge and current-affairs sections should understand how fiscal planning, transport networks, agriculture, and urban development influence the wider national outlook.',
    'Economy',
    now() - interval '46 days',
    'Business Recorder',
    'https://www.brecorder.com/',
    null,
    true
  )
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  category = excluded.category,
  published_at = excluded.published_at,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  image_url = excluded.image_url,
  is_published = excluded.is_published,
  updated_at = now();
