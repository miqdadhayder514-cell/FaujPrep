import { supabase, isSupabaseConfigured, SUPABASE_SETUP_MESSAGE } from './supabase';

async function read(table, columns, options = {}) {
  if (!isSupabaseConfigured) {
    throw new Error(SUPABASE_SETUP_MESSAGE);
  }

  let query = supabase.from(table).select(columns);
  if (options.eq) query = query.eq(options.eq[0], options.eq[1]);
  if (options.order) query = query.order(options.order[0], { ascending: options.order[1] ?? true });
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export const getBranches = () => read('military_branches', 'id,name,slug,short_description,description,logo_url,banner_image_url,is_active,display_order', { order: ['display_order', true] });
export const getExams = () => read('exams', 'id,branch_id,name,slug,short_description,description,exam_type,difficulty,duration_minutes,total_questions,is_active', { order: ['name', true] });
export const getSubjects = () => read('subjects', 'id,name,slug,description,icon_name,is_active,display_order', { order: ['display_order', true] });
export const getTopics = (subjectId) => read('topics', 'id,subject_id,name,slug,description,difficulty,is_active,display_order', subjectId ? { eq: ['subject_id', subjectId], order: ['display_order', true] } : { order: ['display_order', true] });
export async function getSubjectsForBranch(branchId) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data: exams, error: examsError } = await supabase.from('exams').select('id').eq('branch_id', branchId).eq('is_active', true);
  if (examsError) throw examsError;
  const examIds = (exams || []).map((exam) => exam.id);
  if (!examIds.length) return [];
  const { data: links, error: linksError } = await supabase.from('exam_subjects').select('subject_id').in('exam_id', examIds);
  if (linksError) throw linksError;
  const subjectIds = [...new Set((links || []).map((link) => link.subject_id))];
  if (!subjectIds.length) return [];
  const { data: subjects, error: subjectsError } = await supabase.from('subjects').select('id,name,slug,description,icon_name,is_active,display_order').in('id', subjectIds).eq('is_active', true).order('display_order');
  if (subjectsError) throw subjectsError;
  return subjects || [];
}
export const getMockTests = () => read('mock_tests', 'id,title,slug,description,branch_id,exam_id,duration_minutes,total_questions,difficulty,category,is_premium,is_active', { order: ['created_at', false] });
export const getStudyMaterials = () => read('study_materials', 'id,title,slug,description,content,material_type,subject_id,topic_id,branch_id,cover_image_url,pdf_url,is_premium,is_published,created_at,updated_at,subjects(id,name,slug),topics(id,name,slug),military_branches(id,name,slug)', { eq: ['is_published', true], order: ['created_at', false] });
export const getCurrentAffairs = () => read('current_affairs', 'id,title,slug,summary,content,category,published_at,source_name,source_url,image_url,is_published', { eq: ['is_published', true], order: ['published_at', false] });
export async function getStudyMaterialsPage({ branchId = 'All', subjectId = 'All', topicId = 'All', materialType = 'All', searchTerm = '', page = 1, pageSize = 9 } = {}) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);

  let query = supabase
    .from('study_materials')
    .select('id,title,slug,description,content,material_type,subject_id,topic_id,branch_id,cover_image_url,pdf_url,is_premium,is_published,created_at,updated_at,subjects(id,name,slug),topics(id,name,slug),military_branches(id,name,slug)', { count: 'exact' })
    .eq('is_published', true);

  if (branchId !== 'All') query = query.eq('branch_id', branchId);
  if (subjectId !== 'All') query = query.eq('subject_id', subjectId);
  if (topicId !== 'All') query = query.eq('topic_id', topicId);
  if (materialType !== 'All') query = query.eq('material_type', materialType);

  const normalizedTerm = String(searchTerm || '').trim().replace(/[%,]/g, ' ');
  if (normalizedTerm) {
    const pattern = `%${normalizedTerm}%`;
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern},content.ilike.${pattern}`);
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(start, end);
  if (error) throw error;

  return {
    items: data || [],
    count: count ?? 0,
    hasMore: ((data || []).length === pageSize) && ((count ?? 0) > end + 1),
  };
}

export async function getStudyMaterialBySlug(slug) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data, error } = await supabase
    .from('study_materials')
    .select('id,title,slug,description,content,material_type,subject_id,topic_id,branch_id,cover_image_url,pdf_url,is_premium,is_published,created_at,updated_at,subjects(id,name,slug),topics(id,name,slug),military_branches(id,name,slug)')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getCurrentAffairsPage({ category = 'All', searchTerm = '', page = 1, pageSize = 6 } = {}) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);

  let query = supabase
    .from('current_affairs')
    .select('id,title,slug,summary,content,category,published_at,source_name,source_url,image_url,is_published', { count: 'exact' })
    .eq('is_published', true);

  if (category !== 'All') query = query.eq('category', category);

  const normalizedTerm = String(searchTerm || '').trim().replace(/[%,]/g, ' ');
  if (normalizedTerm) {
    const pattern = `%${normalizedTerm}%`;
    query = query.or(`title.ilike.${pattern},summary.ilike.${pattern},content.ilike.${pattern},category.ilike.${pattern}`);
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const { data, error, count } = await query.order('published_at', { ascending: false }).range(start, end);
  if (error) throw error;

  return {
    items: data || [],
    count: count ?? 0,
    hasMore: ((data || []).length === pageSize) && ((count ?? 0) > end + 1),
  };
}

export async function getCurrentAffairBySlug(slug) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data, error } = await supabase
    .from('current_affairs')
    .select('id,title,slug,summary,content,category,published_at,source_name,source_url,image_url,is_published')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export const getISSBModules = () => read('issb_modules', 'id,title,slug,description,content,module_type,display_order,is_published', { eq: ['is_published', true], order: ['display_order', true] });
export async function getISSBModuleBySlug(slug) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data, error } = await supabase
    .from('issb_modules')
    .select('id,title,slug,description,content,module_type,display_order,is_published')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}
export const getMockTestQuestions = (mockTestId) => read('public_mock_test_questions', 'mock_test_id,question_id,question_number,subject_id,topic_id,question_text,question_type,difficulty,option_a,option_b,option_c,option_d,image_url,category,priority,visual_data', { eq: ['mock_test_id', mockTestId], order: ['question_number', true] });

export async function searchContent({ term: searchTerm, contentType = 'All', branchId = 'All', subjectId = 'All', topicId = 'All', difficulty = 'All', page = 1, pageSize = 8 } = {}) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const normalizedTerm = String(searchTerm || '').trim().replace(/[%,]/g, ' ');
  if (normalizedTerm.length < 2) return { results: [], hasMore: false };
  const pattern = `%${normalizedTerm}%`;
  const start = Math.max(0, page - 1) * pageSize;
  const end = start + pageSize - 1;
  const wants = (type) => contentType === 'All' || contentType === type;
  const requests = [];

  if (wants('Branch')) requests.push(supabase.from('military_branches').select('id,name,slug,short_description').eq('is_active', true).ilike('name', pattern).range(start, end).then((result) => ({ type: 'Branch', result })));
  if (wants('Exam')) { let query = supabase.from('exams').select('id,name,slug,short_description,branch_id,difficulty').eq('is_active', true).ilike('name', pattern); if (branchId !== 'All') query = query.eq('branch_id', branchId); requests.push(query.range(start, end).then((result) => ({ type: 'Exam', result }))); }
  if (wants('Subject')) requests.push(supabase.from('subjects').select('id,name,slug,description').eq('is_active', true).ilike('name', pattern).range(start, end).then((result) => ({ type: 'Subject', result })));
  if (wants('Topic')) { let query = supabase.from('topics').select('id,name,slug,description,difficulty,subject_id,subjects(slug)').eq('is_active', true).ilike('name', pattern); if (subjectId !== 'All') query = query.eq('subject_id', subjectId); if (difficulty !== 'All') query = query.eq('difficulty', difficulty); requests.push(query.range(start, end).then((result) => ({ type: 'Topic', result }))); }
  if (wants('Mock Test')) { let query = supabase.from('mock_tests').select('id,title,slug,description,category,difficulty,is_premium,branch_id,exam_id').eq('is_active', true).or(`title.ilike.${pattern},slug.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern}`); if (branchId !== 'All') query = query.eq('branch_id', branchId); if (difficulty !== 'All') query = query.eq('difficulty', difficulty); requests.push(query.range(start, end).then((result) => ({ type: 'Mock Test', result }))); }
  if (wants('Study Material')) { let query = supabase.from('study_materials').select('id,title,slug,description,material_type,branch_id,subject_id,topic_id').eq('is_published', true).or(`title.ilike.${pattern},description.ilike.${pattern},content.ilike.${pattern}`); if (branchId !== 'All') query = query.eq('branch_id', branchId); if (subjectId !== 'All') query = query.eq('subject_id', subjectId); if (topicId !== 'All') query = query.eq('topic_id', topicId); requests.push(query.range(start, end).then((result) => ({ type: 'Study Material', result }))); }
  if (wants('Current Affairs')) requests.push(supabase.from('current_affairs').select('id,title,slug,summary,category,source_url').eq('is_published', true).or(`title.ilike.${pattern},summary.ilike.${pattern},category.ilike.${pattern}`).range(start, end).then((result) => ({ type: 'Current Affairs', result })));
  if (wants('ISSB')) requests.push(supabase.from('issb_modules').select('id,title,slug,description,content,module_type').eq('is_published', true).or(`title.ilike.${pattern},description.ilike.${pattern},content.ilike.${pattern},module_type.ilike.${pattern}`).range(start, end).then((result) => ({ type: 'ISSB', result })));

  const responses = await Promise.all(requests);
  const failure = responses.find(({ result }) => result.error);
  if (failure) throw failure.result.error;
  const results = responses.flatMap(({ type, result }) => (result.data || []).map((item) => ({ ...item, subject_slug: item.subjects?.slug, type, title: item.title || item.name })));
  return { results, hasMore: responses.some(({ result }) => (result.data || []).length === pageSize) };
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getDashboardSummary() {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const [{ data, error }, { data: completedAttempts, error: attemptsError }] = await Promise.all([
    supabase.rpc('get_dashboard_data'),
    supabase.from('mock_test_attempts').select('id').eq('status', 'COMPLETED'),
  ]);
  if (error) throw error;
  if (attemptsError) throw attemptsError;
  const attemptIds = (completedAttempts || []).map((attempt) => attempt.id);
  let mockAnswers = [];
  if (attemptIds.length) {
    const { data: answerRows, error: answersError } = await supabase.from('mock_test_answers').select('id,is_correct').in('attempt_id', attemptIds);
    if (answersError) throw answersError;
    mockAnswers = answerRows || [];
  }
  const practiceAttempted = Number(data?.stats?.questions_attempted || 0);
  const practiceCorrect = Number(data?.stats?.correct_answers || 0);
  const totalAttempted = practiceAttempted + mockAnswers.length;
  const totalCorrect = practiceCorrect + mockAnswers.filter((answer) => answer.is_correct).length;
  return {
    profile: data?.profile || null,
    stats: { ...(data?.stats || {}), questions_attempted: totalAttempted, correct_answers: totalCorrect, accuracy: totalAttempted ? Number(((totalCorrect / totalAttempted) * 100).toFixed(1)) : 0 },
    recentPractice: data?.recent_practice || [],
    recentMock: data?.recent_mock || [],
    subjectPerformance: data?.subject_performance || [],
    topicPerformance: data?.topic_performance || [],
  };
}

export async function updateProfile(userId, values) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name: values.fullName, target_branch_id: values.targetBranchId || null, target_exam_id: values.targetExamId || null, experience_level: values.experienceLevel || null })
    .eq('id', userId)
    .select('id,full_name,target_branch_id,target_exam_id,experience_level')
    .single();
  if (error) throw error;
  return data;
}

export async function getAdminDashboardStats() {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const [questions, mockTests, materials, affairs, issbModules] = await Promise.all([
    supabase.from('questions').select('id', { count: 'exact' }),
    supabase.from('mock_tests').select('id', { count: 'exact' }),
    supabase.from('study_materials').select('id', { count: 'exact' }),
    supabase.from('current_affairs').select('id', { count: 'exact' }),
    supabase.from('issb_modules').select('id', { count: 'exact' }),
  ]);

  const counts = {
    questions: questions.count ?? 0,
    activeQuestions: 0,
    mockTests: mockTests.count ?? 0,
    studyMaterials: materials.count ?? 0,
    currentAffairs: affairs.count ?? 0,
    issbModules: issbModules.count ?? 0,
  };

  const [{ data: activeQuestionRows, error: activeQuestionError }, { data: activeMockRows, error: activeMockError }, { data: activeMaterialRows, error: activeMaterialError }, { data: activeAffairRows, error: activeAffairError }, { data: activeModuleRows, error: activeModuleError }] = await Promise.all([
    supabase.from('questions').select('id').eq('is_active', true),
    supabase.from('mock_tests').select('id').eq('is_active', true),
    supabase.from('study_materials').select('id').eq('is_published', true),
    supabase.from('current_affairs').select('id').eq('is_published', true),
    supabase.from('issb_modules').select('id').eq('is_published', true),
  ]);

  if (activeQuestionError) throw activeQuestionError;
  if (activeMockError) throw activeMockError;
  if (activeMaterialError) throw activeMaterialError;
  if (activeAffairError) throw activeAffairError;
  if (activeModuleError) throw activeModuleError;

  counts.activeQuestions = activeQuestionRows?.length ?? 0;
  counts.activeMockTests = activeMockRows?.length ?? 0;
  counts.activeStudyMaterials = activeMaterialRows?.length ?? 0;
  counts.activeCurrentAffairs = activeAffairRows?.length ?? 0;
  counts.activeISSBModules = activeModuleRows?.length ?? 0;

  return counts;
}

export async function getAdminQuestions({ search = '', subjectId = 'All', topicId = 'All', difficulty = 'All', priority = 'All', category = 'All', paperId = 'All', status = 'All', page = 1, pageSize = 20 } = {}) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  let query = supabase
    .from('questions')
    .select('id,subject_id,topic_id,question_text,question_type,difficulty,option_a,option_b,option_c,option_d,correct_option,explanation,source,source_type,source_reference,priority,category,content_key,visual_data,image_url,is_active,is_verified,created_at,updated_at,subjects(id,name,slug),topics(id,name,slug)', { count: 'exact' });

  if (subjectId !== 'All') query = query.eq('subject_id', subjectId);
  if (topicId !== 'All') query = query.eq('topic_id', topicId);
  if (difficulty !== 'All') query = query.eq('difficulty', difficulty);
  if (priority !== 'All') query = query.eq('priority', priority);
  if (category !== 'All') query = query.eq('category', category);
  if (paperId !== 'All') {
    const { data: links, error: linksError } = await supabase.from('mock_test_questions').select('question_id').eq('mock_test_id', paperId);
    if (linksError) throw linksError;
    const questionIds = (links || []).map((link) => link.question_id);
    if (!questionIds.length) return { items: [], count: 0, hasMore: false };
    query = query.in('id', questionIds);
  }
  if (status !== 'All') {
    const activeStatus = status === 'ACTIVE';
    query = query.eq('is_active', activeStatus);
  }
  if (search.trim()) {
    const pattern = `%${search.trim()}%`;
    query = query.or(`question_text.ilike.${pattern},explanation.ilike.${pattern},source.ilike.${pattern},source_reference.ilike.${pattern},source_type.ilike.${pattern},category.ilike.${pattern}`);
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(start, end);
  if (error) throw error;

  return {
    items: data || [],
    count: count ?? 0,
    hasMore: ((data || []).length === pageSize) && ((count ?? 0) > end + 1),
  };
}

export async function createAdminQuestion(question) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const payload = { ...question };
  if (!payload.subject_id) throw new Error('A valid subject is required.');
  if (!payload.question_text || !payload.question_text.trim()) throw new Error('Question text is required.');
  if (!['MCQ', 'TRUE_FALSE', 'DESCRIPTIVE', 'NON_VERBAL'].includes(payload.question_type || 'MCQ')) throw new Error('Question type is invalid.');
  const optionValues = ['option_a', 'option_b', 'option_c', 'option_d'].map((key) => (payload[key] || '').trim());
  if (optionValues.some((value) => !value)) throw new Error('All answer options are required.');
  if (!['A', 'B', 'C', 'D'].includes(payload.correct_option || '')) throw new Error('A valid correct option is required.');
  if (payload.question_type !== 'DESCRIPTIVE' && !['EASY', 'MEDIUM', 'HARD'].includes(payload.difficulty || '')) throw new Error('Difficulty must be EASY, MEDIUM, or HARD.');
  const { data, error } = await supabase.from('questions').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateAdminQuestion(questionId, question) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const payload = { ...question };
  if (!payload.subject_id) throw new Error('A valid subject is required.');
  if (!payload.question_text || !payload.question_text.trim()) throw new Error('Question text is required.');
  if (!['MCQ', 'TRUE_FALSE', 'DESCRIPTIVE', 'NON_VERBAL'].includes(payload.question_type || 'MCQ')) throw new Error('Question type is invalid.');
  const optionValues = ['option_a', 'option_b', 'option_c', 'option_d'].map((key) => (payload[key] || '').trim());
  if (optionValues.some((value) => !value)) throw new Error('All answer options are required.');
  if (!['A', 'B', 'C', 'D'].includes(payload.correct_option || '')) throw new Error('A valid correct option is required.');
  if (payload.question_type !== 'DESCRIPTIVE' && !['EASY', 'MEDIUM', 'HARD'].includes(payload.difficulty || '')) throw new Error('Difficulty must be EASY, MEDIUM, or HARD.');
  const { data, error } = await supabase.from('questions').update(payload).eq('id', questionId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteAdminQuestion(questionId) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { error } = await supabase.from('questions').delete().eq('id', questionId);
  if (error) throw error;
}

export async function toggleAdminQuestionStatus(questionId, isActive) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data, error } = await supabase.from('questions').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', questionId).select().single();
  if (error) throw error;
  return data;
}

export async function getAdminMockTests({ search = '', branchId = 'All', examId = 'All', difficulty = 'All', status = 'All', page = 1, pageSize = 20 } = {}) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  let query = supabase
    .from('mock_tests')
    .select('id,title,slug,description,branch_id,exam_id,duration_minutes,total_questions,difficulty,category,is_premium,is_active,created_at,updated_at,military_branches(id,name,slug),exams(id,name,slug)', { count: 'exact' });

  if (branchId !== 'All') query = query.eq('branch_id', branchId);
  if (examId !== 'All') query = query.eq('exam_id', examId);
  if (difficulty !== 'All') query = query.eq('difficulty', difficulty);
  if (status !== 'All') query = query.eq('is_active', status === 'ACTIVE');
  if (search.trim()) {
    const pattern = `%${search.trim()}%`;
    query = query.or(`title.ilike.${pattern},slug.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern}`);
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(start, end);
  if (error) throw error;

  return {
    items: data || [],
    count: count ?? 0,
    hasMore: ((data || []).length === pageSize) && ((count ?? 0) > end + 1),
  };
}

export async function createAdminMockTest(mockTest) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const payload = { ...mockTest };
  if (!payload.title || !payload.title.trim()) throw new Error('Mock test title is required.');
  if (!payload.branch_id) throw new Error('A valid branch is required.');
  if (!payload.exam_id) throw new Error('A valid exam is required.');
  if (!payload.duration_minutes || Number(payload.duration_minutes) <= 0) throw new Error('Duration must be greater than zero.');
  if (!payload.total_questions || Number(payload.total_questions) <= 0) throw new Error('Total questions must be greater than zero.');
  if (!payload.slug) payload.slug = payload.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { data, error } = await supabase.from('mock_tests').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateAdminMockTest(mockTestId, mockTest) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const payload = { ...mockTest };
  if (!payload.title || !payload.title.trim()) throw new Error('Mock test title is required.');
  if (!payload.branch_id) throw new Error('A valid branch is required.');
  if (!payload.exam_id) throw new Error('A valid exam is required.');
  if (!payload.duration_minutes || Number(payload.duration_minutes) <= 0) throw new Error('Duration must be greater than zero.');
  if (!payload.total_questions || Number(payload.total_questions) <= 0) throw new Error('Total questions must be greater than zero.');
  if (!payload.slug) payload.slug = payload.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { data, error } = await supabase.from('mock_tests').update(payload).eq('id', mockTestId).select().single();
  if (error) throw error;
  return data;
}

export async function toggleAdminMockTestStatus(mockTestId, isActive) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data, error } = await supabase.from('mock_tests').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', mockTestId).select().single();
  if (error) throw error;
  return data;
}

export async function getAdminMockTestQuestions(mockTestId) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data, error } = await supabase
    .from('mock_test_questions')
    .select('id, mock_test_id, question_id, question_number, questions(id,subject_id,topic_id,question_text,difficulty,option_a,option_b,option_c,option_d,correct_option,explanation,is_active)')
    .eq('mock_test_id', mockTestId)
    .order('question_number', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addQuestionToMockTest(mockTestId, questionId, questionNumber) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data, error } = await supabase.from('mock_test_questions').insert({ mock_test_id: mockTestId, question_id: questionId, question_number: questionNumber }).select().single();
  if (error) throw error;
  return data;
}

export async function removeQuestionFromMockTest(mockTestId, questionId) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { error } = await supabase.from('mock_test_questions').delete().eq('mock_test_id', mockTestId).eq('question_id', questionId);
  if (error) throw error;
}

export async function getAdminStudyMaterials({ search = '', subjectId = 'All', topicId = 'All', branchId = 'All', materialType = 'All', status = 'All', page = 1, pageSize = 20 } = {}) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  let query = supabase
    .from('study_materials')
    .select('id,title,slug,description,content,material_type,subject_id,topic_id,branch_id,pdf_url,cover_image_url,is_premium,is_published,created_at,updated_at,subjects(id,name,slug),topics(id,name,slug),military_branches(id,name,slug)', { count: 'exact' });

  if (subjectId !== 'All') query = query.eq('subject_id', subjectId);
  if (topicId !== 'All') query = query.eq('topic_id', topicId);
  if (branchId !== 'All') query = query.eq('branch_id', branchId);
  if (materialType !== 'All') query = query.eq('material_type', materialType);
  if (status !== 'All') query = query.eq('is_published', status === 'PUBLISHED');
  if (search.trim()) {
    const pattern = `%${search.trim()}%`;
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern},content.ilike.${pattern}`);
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(start, end);
  if (error) throw error;

  return {
    items: data || [],
    count: count ?? 0,
    hasMore: ((data || []).length === pageSize) && ((count ?? 0) > end + 1),
  };
}

export async function createAdminStudyMaterial(material) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const payload = { ...material };
  if (!payload.title || !payload.title.trim()) throw new Error('Study material title is required.');
  if (!payload.slug) payload.slug = payload.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (payload.subject_id && !payload.topic_id) payload.topic_id = null;
  const { data, error } = await supabase.from('study_materials').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateAdminStudyMaterial(materialId, material) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const payload = { ...material };
  if (!payload.title || !payload.title.trim()) throw new Error('Study material title is required.');
  if (!payload.slug) payload.slug = payload.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (payload.subject_id && !payload.topic_id) payload.topic_id = null;
  const { data, error } = await supabase.from('study_materials').update(payload).eq('id', materialId).select().single();
  if (error) throw error;
  return data;
}

export async function toggleAdminStudyMaterialStatus(materialId, isPublished) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data, error } = await supabase.from('study_materials').update({ is_published: isPublished, updated_at: new Date().toISOString() }).eq('id', materialId).select().single();
  if (error) throw error;
  return data;
}

export async function getAdminCurrentAffairs({ search = '', category = 'All', status = 'All', page = 1, pageSize = 20 } = {}) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  let query = supabase.from('current_affairs').select('id,title,slug,summary,content,category,published_at,source_name,source_url,image_url,is_published,created_at,updated_at', { count: 'exact' });

  if (category !== 'All') query = query.eq('category', category);
  if (status !== 'All') query = query.eq('is_published', status === 'PUBLISHED');
  if (search.trim()) {
    const pattern = `%${search.trim()}%`;
    query = query.or(`title.ilike.${pattern},summary.ilike.${pattern},content.ilike.${pattern},source_name.ilike.${pattern}`);
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const { data, error, count } = await query.order('published_at', { ascending: false }).range(start, end);
  if (error) throw error;

  return {
    items: data || [],
    count: count ?? 0,
    hasMore: ((data || []).length === pageSize) && ((count ?? 0) > end + 1),
  };
}

export async function createAdminCurrentAffair(item) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const payload = { ...item };
  if (!payload.title || !payload.title.trim()) throw new Error('Current affairs title is required.');
  if (!payload.summary || !payload.summary.trim()) throw new Error('Current affairs summary is required.');
  if (!payload.published_at) throw new Error('Published date is required.');
  if (!payload.slug) payload.slug = payload.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { data, error } = await supabase.from('current_affairs').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateAdminCurrentAffair(itemId, item) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const payload = { ...item };
  if (!payload.title || !payload.title.trim()) throw new Error('Current affairs title is required.');
  if (!payload.summary || !payload.summary.trim()) throw new Error('Current affairs summary is required.');
  if (!payload.published_at) throw new Error('Published date is required.');
  if (!payload.slug) payload.slug = payload.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { data, error } = await supabase.from('current_affairs').update(payload).eq('id', itemId).select().single();
  if (error) throw error;
  return data;
}

export async function toggleAdminCurrentAffairStatus(itemId, isPublished) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data, error } = await supabase.from('current_affairs').update({ is_published: isPublished, updated_at: new Date().toISOString() }).eq('id', itemId).select().single();
  if (error) throw error;
  return data;
}

export async function getAdminISSBModules({ search = '', status = 'All', page = 1, pageSize = 20 } = {}) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  let query = supabase.from('issb_modules').select('id,title,slug,description,content,module_type,display_order,is_published,created_at,updated_at', { count: 'exact' });

  if (status !== 'All') query = query.eq('is_published', status === 'PUBLISHED');
  if (search.trim()) {
    const pattern = `%${search.trim()}%`;
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern},content.ilike.${pattern},module_type.ilike.${pattern}`);
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const { data, error, count } = await query.order('display_order', { ascending: true }).range(start, end);
  if (error) throw error;

  return {
    items: data || [],
    count: count ?? 0,
    hasMore: ((data || []).length === pageSize) && ((count ?? 0) > end + 1),
  };
}

export async function createAdminISSBModule(module) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const payload = { ...module };
  if (!payload.title || !payload.title.trim()) throw new Error('ISSB module title is required.');
  if (!payload.slug) payload.slug = payload.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { data, error } = await supabase.from('issb_modules').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateAdminISSBModule(moduleId, module) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const payload = { ...module };
  if (!payload.title || !payload.title.trim()) throw new Error('ISSB module title is required.');
  if (!payload.slug) payload.slug = payload.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { data, error } = await supabase.from('issb_modules').update(payload).eq('id', moduleId).select().single();
  if (error) throw error;
  return data;
}

export async function toggleAdminISSBModuleStatus(moduleId, isPublished) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data, error } = await supabase.from('issb_modules').update({ is_published: isPublished, updated_at: new Date().toISOString() }).eq('id', moduleId).select().single();
  if (error) throw error;
  return data;
}

export async function getPracticeQuestions({ subjectId, topicId, difficulty, limit = 20 } = {}) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  let query = supabase
    .from('public_questions')
    .select('id,subject_id,topic_id,question_text,question_type,difficulty,option_a,option_b,option_c,option_d,explanation,image_url')
    .limit(limit);
  if (subjectId) query = query.eq('subject_id', subjectId);
  if (topicId) query = query.eq('topic_id', topicId);
  if (difficulty) query = query.eq('difficulty', difficulty);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function evaluateQuestionAnswer(questionId, selectedOption, timeTakenSeconds = null) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data, error } = await supabase.rpc('evaluate_question_answer', {
    p_question_id: questionId,
    p_selected_option: selectedOption,
    p_time_taken_seconds: timeTakenSeconds,
  });
  if (error) throw error;
  return data?.[0] || null;
}

export async function signIn(email, password) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp({ email, password, fullName, targetBranchId }) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, target_branch_id: targetBranchId || null } },
  });
  if (error) throw error;
  return data;
}

export const signOut = async () => {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export async function startMockTest(mockTestId) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data, error } = await supabase.rpc('start_mock_test', { p_mock_test_id: mockTestId });
  if (error) throw error;
  return data?.[0];
}

export async function saveMockTestAnswer(attemptId, questionId, selectedOption, timeTakenSeconds = null) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { error } = await supabase.rpc('save_mock_test_answer', {
    p_attempt_id: attemptId,
    p_question_id: questionId,
    p_selected_option: selectedOption,
    p_time_taken_seconds: timeTakenSeconds,
  });
  if (error) throw error;
}

export async function submitMockTest(attemptId, timeTakenSeconds = null) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data, error } = await supabase.rpc('submit_mock_test', {
    p_attempt_id: attemptId,
    p_time_taken_seconds: timeTakenSeconds,
  });
  if (error) throw error;
  return data?.[0];
}

export async function getMockTestReview(attemptId) {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_SETUP_MESSAGE);
  const { data, error } = await supabase.rpc('get_mock_test_review', { p_attempt_id: attemptId });
  if (error) throw error;
  return data || [];
}
