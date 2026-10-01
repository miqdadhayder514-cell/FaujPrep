import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ClipboardList,
  FileText,
  Layers3,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  createAdminCurrentAffair,
  createAdminISSBModule,
  createAdminMockTest,
  createAdminQuestion,
  createAdminStudyMaterial,
  getAdminCurrentAffairs,
  getAdminDashboardStats,
  getAdminISSBModules,
  getAdminMockTestQuestions,
  getAdminMockTests,
  getAdminQuestions,
  getAdminStudyMaterials,
  getTopics,
  removeQuestionFromMockTest,
  toggleAdminCurrentAffairStatus,
  toggleAdminISSBModuleStatus,
  toggleAdminMockTestStatus,
  toggleAdminQuestionStatus,
  toggleAdminStudyMaterialStatus,
  updateAdminCurrentAffair,
  updateAdminISSBModule,
  updateAdminMockTest,
  updateAdminQuestion,
  updateAdminStudyMaterial,
} from '../lib/queries';

const tabOptions = [
  { value: 'questions', label: 'Questions' },
  { value: 'mock-tests', label: 'Mock Tests' },
  { value: 'study-materials', label: 'Study Materials' },
  { value: 'current-affairs', label: 'Current Affairs' },
  { value: 'issb', label: 'ISSB Modules' },
];

const emptyQuestion = {
  subject_id: '',
  topic_id: '',
  question_text: '',
  question_type: 'MCQ',
  difficulty: 'MEDIUM',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 'A',
  explanation: '',
  source: '',
  source_type: 'ORIGINAL_VARIATION',
  source_reference: '',
  content_key: '',
  category: '',
  priority: 'MEDIUM',
  visual_data: null,
  image_url: '',
  is_active: true,
  is_verified: false,
};

const emptyMockTest = {
  title: '',
  slug: '',
  description: '',
  category: '',
  branch_id: '',
  exam_id: '',
  duration_minutes: 30,
  total_questions: 10,
  difficulty: 'MEDIUM',
  is_premium: false,
  is_active: true,
};

const emptyStudyMaterial = {
  title: '',
  slug: '',
  description: '',
  content: '',
  material_type: 'GUIDE',
  subject_id: '',
  topic_id: '',
  branch_id: '',
  pdf_url: '',
  cover_image_url: '',
  is_premium: false,
  is_published: true,
};

const emptyCurrentAffair = {
  title: '',
  slug: '',
  summary: '',
  content: '',
  category: 'General',
  published_at: new Date().toISOString().slice(0, 10),
  source_name: '',
  source_url: '',
  image_url: '',
  is_published: true,
};

const emptyISSBModule = {
  title: '',
  slug: '',
  description: '',
  content: '',
  module_type: 'PREPARATION',
  display_order: 1,
  is_published: true,
};

const slugify = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

export default function AdminContentManager({ branches, exams, subjects, addToast }) {
  const [activeTab, setActiveTab] = useState('questions');
  const [stats, setStats] = useState({
    questions: 0,
    activeQuestions: 0,
    mockTests: 0,
    activeMockTests: 0,
    studyMaterials: 0,
    activeStudyMaterials: 0,
    currentAffairs: 0,
    activeCurrentAffairs: 0,
    issbModules: 0,
    activeISSBModules: 0,
  });

  const [questionState, setQuestionState] = useState({ items: [], loading: true, error: '', search: '', subjectId: 'All', topicId: 'All', difficulty: 'All', priority: 'All', category: 'All', paperId: 'All', status: 'All', page: 1, hasMore: false });
  const [questionPapers, setQuestionPapers] = useState([]);
  const [mockState, setMockState] = useState({ items: [], loading: true, error: '', search: '', branchId: 'All', examId: 'All', difficulty: 'All', status: 'All', page: 1, hasMore: false });
  const [materialState, setMaterialState] = useState({ items: [], loading: true, error: '', search: '', subjectId: 'All', topicId: 'All', branchId: 'All', materialType: 'All', status: 'All', page: 1, hasMore: false });
  const [affairState, setAffairState] = useState({ items: [], loading: true, error: '', search: '', category: 'All', status: 'All', page: 1, hasMore: false });
  const [issbState, setIssbState] = useState({ items: [], loading: true, error: '', search: '', status: 'All', page: 1, hasMore: false });

  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [visualDataText, setVisualDataText] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [questionTopics, setQuestionTopics] = useState([]);

  const [mockForm, setMockForm] = useState(emptyMockTest);
  const [editingMockId, setEditingMockId] = useState(null);
  const [selectedMockId, setSelectedMockId] = useState(null);
  const [mockAssignments, setMockAssignments] = useState([]);

  const [materialForm, setMaterialForm] = useState(emptyStudyMaterial);
  const [editingMaterialId, setEditingMaterialId] = useState(null);
  const [materialTopics, setMaterialTopics] = useState([]);

  const [affairForm, setAffairForm] = useState(emptyCurrentAffair);
  const [editingAffairId, setEditingAffairId] = useState(null);

  const [issbForm, setIssbForm] = useState(emptyISSBModule);
  const [editingISSBId, setEditingISSBId] = useState(null);

  const subjectOptions = useMemo(() => subjects || [], [subjects]);
  const branchOptions = useMemo(() => branches || [], [branches]);
  const examOptions = useMemo(() => exams || [], [exams]);

  const loadStats = async () => {
    try {
      const nextStats = await getAdminDashboardStats();
      setStats(nextStats);
    } catch (error) {
      addToast(error.message || 'Unable to load dashboard counts.', 'error');
    }
  };

  const loadQuestionTopics = async (subjectId) => {
    if (!subjectId) {
      setQuestionTopics([]);
      return;
    }
    try {
      const nextTopics = await getTopics(subjectId);
      setQuestionTopics(nextTopics || []);
    } catch (error) {
      addToast(error.message || 'Unable to load question topics.', 'error');
    }
  };

  const loadMaterialTopics = async (subjectId) => {
    if (!subjectId) {
      setMaterialTopics([]);
      return;
    }
    try {
      const nextTopics = await getTopics(subjectId);
      setMaterialTopics(nextTopics || []);
    } catch (error) {
      addToast(error.message || 'Unable to load material topics.', 'error');
    }
  };

  const loadQuestions = async (page = 1) => {
    setQuestionState((previous) => ({ ...previous, loading: true, error: '' }));
    try {
      const response = await getAdminQuestions({
        search: questionState.search,
        subjectId: questionState.subjectId,
        topicId: questionState.topicId,
        difficulty: questionState.difficulty,
        priority: questionState.priority,
        category: questionState.category,
        paperId: questionState.paperId,
        status: questionState.status,
        page,
      });
      setQuestionState((previous) => ({
        ...previous,
        items: response.items,
        loading: false,
        error: '',
        page,
        hasMore: response.hasMore,
      }));
    } catch (error) {
      setQuestionState((previous) => ({ ...previous, loading: false, error: error.message || 'Unable to load questions.' }));
      addToast(error.message || 'Unable to load questions.', 'error');
    }
  };

  useEffect(() => {
    getAdminMockTests({ page: 1, pageSize: 100 }).then((response) => setQuestionPapers(response.items)).catch((error) => {
      addToast(error.message || 'Unable to load question paper filters.', 'error');
    });
  }, []);

  const loadMockTests = async (page = 1) => {
    setMockState((previous) => ({ ...previous, loading: true, error: '' }));
    try {
      const response = await getAdminMockTests({
        search: mockState.search,
        branchId: mockState.branchId,
        examId: mockState.examId,
        difficulty: mockState.difficulty,
        status: mockState.status,
        page,
      });
      setMockState((previous) => ({
        ...previous,
        items: response.items,
        loading: false,
        error: '',
        page,
        hasMore: response.hasMore,
      }));
    } catch (error) {
      setMockState((previous) => ({ ...previous, loading: false, error: error.message || 'Unable to load mock tests.' }));
      addToast(error.message || 'Unable to load mock tests.', 'error');
    }
  };

  const loadMaterials = async (page = 1) => {
    setMaterialState((previous) => ({ ...previous, loading: true, error: '' }));
    try {
      const response = await getAdminStudyMaterials({
        search: materialState.search,
        subjectId: materialState.subjectId,
        topicId: materialState.topicId,
        branchId: materialState.branchId,
        materialType: materialState.materialType,
        status: materialState.status,
        page,
      });
      setMaterialState((previous) => ({
        ...previous,
        items: response.items,
        loading: false,
        error: '',
        page,
        hasMore: response.hasMore,
      }));
    } catch (error) {
      setMaterialState((previous) => ({ ...previous, loading: false, error: error.message || 'Unable to load study materials.' }));
      addToast(error.message || 'Unable to load study materials.', 'error');
    }
  };

  const loadAffairs = async (page = 1) => {
    setAffairState((previous) => ({ ...previous, loading: true, error: '' }));
    try {
      const response = await getAdminCurrentAffairs({
        search: affairState.search,
        category: affairState.category,
        status: affairState.status,
        page,
      });
      setAffairState((previous) => ({
        ...previous,
        items: response.items,
        loading: false,
        error: '',
        page,
        hasMore: response.hasMore,
      }));
    } catch (error) {
      setAffairState((previous) => ({ ...previous, loading: false, error: error.message || 'Unable to load current affairs.' }));
      addToast(error.message || 'Unable to load current affairs.', 'error');
    }
  };

  const loadISSB = async (page = 1) => {
    setIssbState((previous) => ({ ...previous, loading: true, error: '' }));
    try {
      const response = await getAdminISSBModules({ search: issbState.search, status: issbState.status, page });
      setIssbState((previous) => ({
        ...previous,
        items: response.items,
        loading: false,
        error: '',
        page,
        hasMore: response.hasMore,
      }));
    } catch (error) {
      setIssbState((previous) => ({ ...previous, loading: false, error: error.message || 'Unable to load ISSB modules.' }));
      addToast(error.message || 'Unable to load ISSB modules.', 'error');
    }
  };

  const loadMockAssignments = async (mockTestId) => {
    if (!mockTestId) {
      setMockAssignments([]);
      return;
    }
    try {
      const assignments = await getAdminMockTestQuestions(mockTestId);
      setMockAssignments(assignments || []);
    } catch (error) {
      addToast(error.message || 'Unable to load mock test assignments.', 'error');
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'questions') {
      loadQuestions(1);
    }
  }, [activeTab, questionState.search, questionState.subjectId, questionState.topicId, questionState.difficulty, questionState.priority, questionState.category, questionState.paperId, questionState.status]);

  useEffect(() => {
    if (activeTab === 'mock-tests') {
      loadMockTests(1);
    }
  }, [activeTab, mockState.search, mockState.branchId, mockState.examId, mockState.difficulty, mockState.status]);

  useEffect(() => {
    if (activeTab === 'study-materials') {
      loadMaterials(1);
    }
  }, [activeTab, materialState.search, materialState.subjectId, materialState.topicId, materialState.branchId, materialState.materialType, materialState.status]);

  useEffect(() => {
    if (activeTab === 'current-affairs') {
      loadAffairs(1);
    }
  }, [activeTab, affairState.search, affairState.category, affairState.status]);

  useEffect(() => {
    if (activeTab === 'issb') {
      loadISSB(1);
    }
  }, [activeTab, issbState.search, issbState.status]);

  useEffect(() => {
    if (questionForm.subject_id) {
      loadQuestionTopics(questionForm.subject_id);
    } else {
      setQuestionTopics([]);
    }
  }, [questionForm.subject_id]);

  useEffect(() => {
    if (materialForm.subject_id) {
      loadMaterialTopics(materialForm.subject_id);
    } else {
      setMaterialTopics([]);
    }
  }, [materialForm.subject_id]);

  const handleQuestionSubmit = async (event) => {
    event.preventDefault();
    try {
      const visualData = visualDataText.trim() ? JSON.parse(visualDataText) : null;
      const questionPayload = { ...questionForm, visual_data: visualData, topic_id: questionForm.topic_id || null };
      if (editingQuestionId) {
        await updateAdminQuestion(editingQuestionId, questionPayload);
        addToast('Question updated.', 'success');
      } else {
        await createAdminQuestion(questionPayload);
        addToast('Question created.', 'success');
      }
      setQuestionForm(emptyQuestion);
      setVisualDataText('');
      setEditingQuestionId(null);
      await loadQuestions(1);
      await loadStats();
    } catch (error) {
      addToast(error.message || 'Unable to save question.', 'error');
    }
  };

  const handleMockSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...mockForm, slug: mockForm.slug || slugify(mockForm.title) };
      if (editingMockId) {
        await updateAdminMockTest(editingMockId, payload);
        addToast('Mock test updated.', 'success');
      } else {
        await createAdminMockTest(payload);
        addToast('Mock test created.', 'success');
      }
      setMockForm(emptyMockTest);
      setEditingMockId(null);
      await loadMockTests(1);
      await loadStats();
    } catch (error) {
      addToast(error.message || 'Unable to save mock test.', 'error');
    }
  };

  const handleMaterialSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...materialForm, slug: materialForm.slug || slugify(materialForm.title) };
      if (editingMaterialId) {
        await updateAdminStudyMaterial(editingMaterialId, payload);
        addToast('Study material updated.', 'success');
      } else {
        await createAdminStudyMaterial(payload);
        addToast('Study material created.', 'success');
      }
      setMaterialForm(emptyStudyMaterial);
      setEditingMaterialId(null);
      await loadMaterials(1);
      await loadStats();
    } catch (error) {
      addToast(error.message || 'Unable to save study material.', 'error');
    }
  };

  const handleAffairSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...affairForm, slug: affairForm.slug || slugify(affairForm.title) };
      if (editingAffairId) {
        await updateAdminCurrentAffair(editingAffairId, payload);
        addToast('Current affair updated.', 'success');
      } else {
        await createAdminCurrentAffair(payload);
        addToast('Current affair created.', 'success');
      }
      setAffairForm(emptyCurrentAffair);
      setEditingAffairId(null);
      await loadAffairs(1);
      await loadStats();
    } catch (error) {
      addToast(error.message || 'Unable to save current affair.', 'error');
    }
  };

  const handleISSBSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...issbForm, slug: issbForm.slug || slugify(issbForm.title) };
      if (editingISSBId) {
        await updateAdminISSBModule(editingISSBId, payload);
        addToast('ISSB module updated.', 'success');
      } else {
        await createAdminISSBModule(payload);
        addToast('ISSB module created.', 'success');
      }
      setIssbForm(emptyISSBModule);
      setEditingISSBId(null);
      await loadISSB(1);
      await loadStats();
    } catch (error) {
      addToast(error.message || 'Unable to save ISSB module.', 'error');
    }
  };

  const renderQuestionPanel = () => (
    <div className="space-y-6">
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-100">Question management</h2>
          <span className="text-[10px] font-mono uppercase text-emerald-400">{stats.questions} total</span>
        </div>
        <form onSubmit={handleQuestionSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={questionForm.subject_id} onChange={(event) => setQuestionForm((previous) => ({ ...previous, subject_id: event.target.value, topic_id: '' }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="">Select subject</option>
              {subjectOptions.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
            <select value={questionForm.topic_id || ''} onChange={(event) => setQuestionForm((previous) => ({ ...previous, topic_id: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="">Select topic</option>
              {questionTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
            </select>
            <select value={questionForm.difficulty} onChange={(event) => setQuestionForm((previous) => ({ ...previous, difficulty: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select value={questionForm.question_type} onChange={(event) => setQuestionForm((previous) => ({ ...previous, question_type: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="MCQ">MCQ</option>
              <option value="TRUE_FALSE">True / False</option>
              <option value="DESCRIPTIVE">Descriptive</option>
              <option value="NON_VERBAL">Non-verbal visual</option>
            </select>
            <select value={questionForm.correct_option} onChange={(event) => setQuestionForm((previous) => ({ ...previous, correct_option: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="A">Correct: A</option>
              <option value="B">Correct: B</option>
              <option value="C">Correct: C</option>
              <option value="D">Correct: D</option>
            </select>
          </div>
          <textarea value={questionForm.question_text} onChange={(event) => setQuestionForm((previous) => ({ ...previous, question_text: event.target.value }))} rows="3" placeholder="Question text" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100" required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {['option_a', 'option_b', 'option_c', 'option_d'].map((optionKey) => (
              <input key={optionKey} value={questionForm[optionKey] || ''} onChange={(event) => setQuestionForm((previous) => ({ ...previous, [optionKey]: event.target.value }))} placeholder={`Option ${optionKey.slice(-1).toUpperCase()}`} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={questionForm.source || ''} onChange={(event) => setQuestionForm((previous) => ({ ...previous, source: event.target.value }))} placeholder="Source" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
            <input value={questionForm.image_url || ''} onChange={(event) => setQuestionForm((previous) => ({ ...previous, image_url: event.target.value }))} placeholder="Image URL" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={questionForm.category || ''} onChange={(event) => setQuestionForm((previous) => ({ ...previous, category: event.target.value }))} placeholder="Category / topic" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
            <select value={questionForm.priority || 'MEDIUM'} onChange={(event) => setQuestionForm((previous) => ({ ...previous, priority: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"><option value="HIGH">High priority</option><option value="MEDIUM">Medium priority</option><option value="LOW">Low priority</option></select>
            <select value={questionForm.source_type || 'ORIGINAL_VARIATION'} onChange={(event) => setQuestionForm((previous) => ({ ...previous, source_type: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"><option value="PAST_PAPER_REPORTED">Reported past-paper item</option><option value="PAST_PAPER_PATTERN">Past-paper pattern</option><option value="CANDIDATE_RECALLED">Candidate recalled</option><option value="PREPARATION_PATTERN">Preparation pattern</option><option value="ORIGINAL_VARIATION">Original variation</option></select>
            <input value={questionForm.source_reference || ''} onChange={(event) => setQuestionForm((previous) => ({ ...previous, source_reference: event.target.value }))} placeholder="Source reference (URL or note)" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
            <input value={questionForm.content_key || ''} onChange={(event) => setQuestionForm((previous) => ({ ...previous, content_key: event.target.value }))} placeholder="Stable content key" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
          </div>
          <textarea value={visualDataText} onChange={(event) => {
            setVisualDataText(event.target.value);
            try {
              setQuestionForm((previous) => ({ ...previous, visual_data: event.target.value.trim() ? JSON.parse(event.target.value) : null }));
            } catch {
              return;
            }
          }} rows="5" placeholder="Structured visual JSON" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100" />
          <textarea value={questionForm.explanation || ''} onChange={(event) => setQuestionForm((previous) => ({ ...previous, explanation: event.target.value }))} rows="2" placeholder="Explanation" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={questionForm.is_active} onChange={(event) => setQuestionForm((previous) => ({ ...previous, is_active: event.target.checked }))} /> Active</label>
            <label className="inline-flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={questionForm.is_verified} onChange={(event) => setQuestionForm((previous) => ({ ...previous, is_verified: event.target.checked }))} /> Verified</label>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"><Plus className="w-4 h-4" />{editingQuestionId ? 'Save question' : 'Create question'}</button>
            {editingQuestionId && <button type="button" onClick={() => { setEditingQuestionId(null); setQuestionForm(emptyQuestion); setVisualDataText(''); }} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs">Cancel</button>}
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h3 className="font-bold text-slate-100">Question library</h3>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
              <input value={questionState.search} onChange={(event) => setQuestionState((previous) => ({ ...previous, search: event.target.value }))} placeholder="Search questions" className="pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100" />
            </div>
            <select value={questionState.subjectId} onChange={(event) => setQuestionState((previous) => ({ ...previous, subjectId: event.target.value, topicId: 'All' }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="All">All subjects</option>
              {subjectOptions.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
            <select value={questionState.difficulty} onChange={(event) => setQuestionState((previous) => ({ ...previous, difficulty: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="All">All difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
            <select value={questionState.paperId} onChange={(event) => setQuestionState((previous) => ({ ...previous, paperId: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="All">All papers</option>
              {questionPapers.map((paper) => <option key={paper.id} value={paper.id}>{paper.title}</option>)}
            </select>
            <input value={questionState.category === 'All' ? '' : questionState.category} onChange={(event) => setQuestionState((previous) => ({ ...previous, category: event.target.value || 'All' }))} placeholder="Filter category" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
            <select value={questionState.priority} onChange={(event) => setQuestionState((previous) => ({ ...previous, priority: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="All">All priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select value={questionState.status} onChange={(event) => setQuestionState((previous) => ({ ...previous, status: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="All">All status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {questionState.loading ? <p className="text-sm text-slate-400">Loading questions...</p> : questionState.error ? <p className="text-sm text-rose-400">{questionState.error}</p> : questionState.items.length === 0 ? <p className="text-sm text-slate-400">No questions found.</p> : (
          <div className="space-y-3">
            {questionState.items.map((question) => (
              <div key={question.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <p className="text-sm text-slate-200">{question.question_text}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => {
                      setEditingQuestionId(question.id);
                      setVisualDataText(question.visual_data ? JSON.stringify(question.visual_data, null, 2) : '');
                      setQuestionForm({
                        ...emptyQuestion,
                        subject_id: question.subject_id || '',
                        topic_id: question.topic_id || '',
                        question_text: question.question_text || '',
                        question_type: question.question_type || 'MCQ',
                        difficulty: question.difficulty || 'MEDIUM',
                        option_a: question.option_a || '',
                        option_b: question.option_b || '',
                        option_c: question.option_c || '',
                        option_d: question.option_d || '',
                        correct_option: question.correct_option || 'A',
                        explanation: question.explanation || '',
                        source: question.source || '',
                        source_type: question.source_type || 'ORIGINAL_VARIATION',
                        source_reference: question.source_reference || '',
                        content_key: question.content_key || '',
                        category: question.category || '',
                        priority: question.priority || 'MEDIUM',
                        visual_data: question.visual_data || null,
                        image_url: question.image_url || '',
                        is_active: Boolean(question.is_active),
                        is_verified: Boolean(question.is_verified),
                      });
                    }} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                    <button type="button" onClick={async () => {
                      if (!window.confirm('Archive this question?')) return;
                      try { await toggleAdminQuestionStatus(question.id, !question.is_active); await loadQuestions(1); await loadStats(); addToast('Question status updated.', 'success'); } catch (error) { addToast(error.message || 'Unable to update question status.', 'error'); }
                    }} className="px-3 py-2 rounded-lg bg-amber-950/70 text-amber-200 text-xs">{question.is_active ? 'Archive' : 'Activate'}</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-mono uppercase text-slate-400">
                  <span>{question.difficulty}</span>
                  <span>{question.question_type}</span>
                  <span>{question.category || 'Uncategorised'}</span>
                  <span>{question.priority || 'No priority'}</span>
                  <span>{question.source_type || 'No source type'}</span>
                  <span>{question.is_active ? 'Active' : 'Inactive'}</span>
                  <span>{question.is_verified ? 'Verified' : 'Unverified'}</span>
                </div>
              </div>
            ))}
            {questionState.hasMore && <button type="button" onClick={() => loadQuestions(questionState.page + 1)} className="w-full px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold">Load more</button>}
          </div>
        )}
      </div>
    </div>
  );

  const renderMockPanel = () => (
    <div className="space-y-6">
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Mock test management</h2>
        <form onSubmit={handleMockSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={mockForm.title} onChange={(event) => setMockForm((previous) => ({ ...previous, title: event.target.value, slug: previous.slug || slugify(event.target.value) }))} placeholder="Mock test title" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" required />
            <input value={mockForm.slug || ''} onChange={(event) => setMockForm((previous) => ({ ...previous, slug: event.target.value }))} placeholder="Slug" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
          </div>
          <input value={mockForm.category || ''} onChange={(event) => setMockForm((previous) => ({ ...previous, category: event.target.value }))} placeholder="Paper category" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={mockForm.branch_id} onChange={(event) => setMockForm((previous) => ({ ...previous, branch_id: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="">Select branch</option>
              {branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <select value={mockForm.exam_id} onChange={(event) => setMockForm((previous) => ({ ...previous, exam_id: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="">Select exam</option>
              {examOptions.map((exam) => <option key={exam.id} value={exam.id}>{exam.name}</option>)}
            </select>
            <select value={mockForm.difficulty} onChange={(event) => setMockForm((previous) => ({ ...previous, difficulty: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="number" value={mockForm.duration_minutes} onChange={(event) => setMockForm((previous) => ({ ...previous, duration_minutes: Number(event.target.value) }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" placeholder="Duration minutes" />
            <input type="number" value={mockForm.total_questions} onChange={(event) => setMockForm((previous) => ({ ...previous, total_questions: Number(event.target.value) }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" placeholder="Question count" />
            <label className="inline-flex items-center gap-2 text-xs text-slate-300 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2"><input type="checkbox" checked={mockForm.is_active} onChange={(event) => setMockForm((previous) => ({ ...previous, is_active: event.target.checked }))} /> Active</label>
          </div>
          <textarea value={mockForm.description || ''} onChange={(event) => setMockForm((previous) => ({ ...previous, description: event.target.value }))} rows="3" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" placeholder="Description" />
          <div className="flex gap-3">
            <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"><Plus className="w-4 h-4" />{editingMockId ? 'Save mock test' : 'Create mock test'}</button>
            {editingMockId && <button type="button" onClick={() => { setEditingMockId(null); setMockForm(emptyMockTest); }} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs">Cancel</button>}
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h3 className="font-bold text-slate-100">Mock test library</h3>
          <div className="flex flex-wrap gap-2">
            <input value={mockState.search} onChange={(event) => setMockState((previous) => ({ ...previous, search: event.target.value }))} placeholder="Search tests" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
            <select value={mockState.branchId} onChange={(event) => setMockState((previous) => ({ ...previous, branchId: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="All">All branches</option>
              {branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <select value={mockState.status} onChange={(event) => setMockState((previous) => ({ ...previous, status: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="All">All status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {mockState.loading ? <p className="text-sm text-slate-400">Loading mock tests...</p> : mockState.error ? <p className="text-sm text-rose-400">{mockState.error}</p> : mockState.items.length === 0 ? <p className="text-sm text-slate-400">No mock tests found.</p> : (
          <div className="space-y-3">
            {mockState.items.map((mock) => (
              <div key={mock.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-200">{mock.title}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-mono uppercase text-slate-400">
                      <span>{mock.difficulty}</span>
                      <span>{mock.category || 'Uncategorised'}</span>
                      <span>{mock.total_questions} questions</span>
                      <span>{mock.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setSelectedMockId(mock.id); loadMockAssignments(mock.id); }} className="px-3 py-2 rounded-lg bg-emerald-950/60 text-emerald-200 text-xs">Manage questions</button>
                    <button type="button" onClick={() => { setEditingMockId(mock.id); setMockForm({ ...emptyMockTest, ...mock, slug: mock.slug || '' }); }} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs">Edit</button>
                    <button type="button" onClick={async () => { if (!window.confirm('Archive this mock test?')) return; try { await toggleAdminMockTestStatus(mock.id, !mock.is_active); await loadMockTests(1); await loadStats(); addToast('Mock test status updated.', 'success'); } catch (error) { addToast(error.message || 'Unable to update mock test.', 'error'); } }} className="px-3 py-2 rounded-lg bg-amber-950/70 text-amber-200 text-xs">{mock.is_active ? 'Archive' : 'Activate'}</button>
                  </div>
                </div>
              </div>
            ))}
            {mockState.hasMore && <button type="button" onClick={() => loadMockTests(mockState.page + 1)} className="w-full px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold">Load more</button>}
          </div>
        )}

        {selectedMockId && (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
            <h4 className="font-bold text-slate-100">Question assignment</h4>
            <div className="flex gap-2">
              <input placeholder="Search question bank" onKeyDown={async (event) => {
                if (event.key === 'Enter') {
                  const searchTerm = event.target.value.trim();
                  if (!searchTerm) return;
                  try {
                    const response = await getAdminQuestions({ search: searchTerm, page: 1, pageSize: 10 });
                    setMockAssignments((previous) => [...previous, ...response.items.filter((item) => !previous.some((existing) => existing.question_id === item.id))]);
                  } catch (error) { addToast(error.message || 'Unable to search questions.', 'error'); }
                }
              }} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
            </div>
            <div className="space-y-2">
              {mockAssignments.length === 0 ? <p className="text-xs text-slate-400">No assigned questions.</p> : mockAssignments.map((assignment, index) => (
                <div key={assignment.id || assignment.question_id || index} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">
                  <span>{assignment.questions?.question_text || assignment.question_text || 'Question'}</span>
                  <button type="button" onClick={async () => {
                    try {
                      await removeQuestionFromMockTest(selectedMockId, assignment.question_id || assignment.questions?.id);
                      await loadMockAssignments(selectedMockId);
                      addToast('Question removed from mock test.', 'success');
                    } catch (error) { addToast(error.message || 'Unable to remove question from mock test.', 'error'); }
                  }} className="px-2.5 py-1.5 rounded-lg bg-rose-950 border border-rose-500/30 text-rose-200">Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderMaterialPanel = () => (
    <div className="space-y-6">
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Study material management</h2>
        <form onSubmit={handleMaterialSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={materialForm.title} onChange={(event) => setMaterialForm((previous) => ({ ...previous, title: event.target.value, slug: previous.slug || slugify(event.target.value) }))} placeholder="Material title" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" required />
            <input value={materialForm.slug || ''} onChange={(event) => setMaterialForm((previous) => ({ ...previous, slug: event.target.value }))} placeholder="Slug" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={materialForm.subject_id} onChange={(event) => setMaterialForm((previous) => ({ ...previous, subject_id: event.target.value, topic_id: '' }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="">Select subject</option>
              {subjectOptions.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
            <select value={materialForm.topic_id || ''} onChange={(event) => setMaterialForm((previous) => ({ ...previous, topic_id: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="">Select topic</option>
              {materialTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
            </select>
            <select value={materialForm.branch_id} onChange={(event) => setMaterialForm((previous) => ({ ...previous, branch_id: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="">Select branch</option>
              {branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={materialForm.material_type} onChange={(event) => setMaterialForm((previous) => ({ ...previous, material_type: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="GUIDE">Guide</option>
              <option value="NOTES">Notes</option>
              <option value="ARTICLE">Article</option>
              <option value="CHEATSHEET">Cheatsheet</option>
            </select>
            <input value={materialForm.pdf_url || ''} onChange={(event) => setMaterialForm((previous) => ({ ...previous, pdf_url: event.target.value }))} placeholder="PDF URL" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
            <input value={materialForm.cover_image_url || ''} onChange={(event) => setMaterialForm((previous) => ({ ...previous, cover_image_url: event.target.value }))} placeholder="Cover image URL" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
          </div>
          <textarea value={materialForm.description || ''} onChange={(event) => setMaterialForm((previous) => ({ ...previous, description: event.target.value }))} rows="2" placeholder="Short description" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
          <textarea value={materialForm.content || ''} onChange={(event) => setMaterialForm((previous) => ({ ...previous, content: event.target.value }))} rows="4" placeholder="Full content" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={materialForm.is_premium} onChange={(event) => setMaterialForm((previous) => ({ ...previous, is_premium: event.target.checked }))} /> Premium</label>
            <label className="inline-flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={materialForm.is_published} onChange={(event) => setMaterialForm((previous) => ({ ...previous, is_published: event.target.checked }))} /> Published</label>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"><Plus className="w-4 h-4" />{editingMaterialId ? 'Save material' : 'Create material'}</button>
            {editingMaterialId && <button type="button" onClick={() => { setEditingMaterialId(null); setMaterialForm(emptyStudyMaterial); }} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs">Cancel</button>}
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h3 className="font-bold text-slate-100">Study material library</h3>
          <div className="flex flex-wrap gap-2">
            <input value={materialState.search} onChange={(event) => setMaterialState((previous) => ({ ...previous, search: event.target.value }))} placeholder="Search materials" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
            <select value={materialState.status} onChange={(event) => setMaterialState((previous) => ({ ...previous, status: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="All">Any status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>
        {materialState.loading ? <p className="text-sm text-slate-400">Loading study materials...</p> : materialState.error ? <p className="text-sm text-rose-400">{materialState.error}</p> : materialState.items.length === 0 ? <p className="text-sm text-slate-400">No material found.</p> : (
          <div className="space-y-3">
            {materialState.items.map((material) => (
              <div key={material.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-200">{material.title}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-mono uppercase text-slate-400">
                      <span>{material.material_type}</span>
                      <span>{material.is_published ? 'Published' : 'Draft'}</span>
                      <span>{material.is_premium ? 'Premium' : 'Free'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setEditingMaterialId(material.id); setMaterialForm({ ...emptyStudyMaterial, ...material, title: material.title || '', description: material.description || '', content: material.content || '', material_type: material.material_type || 'GUIDE', subject_id: material.subject_id || '', topic_id: material.topic_id || '', branch_id: material.branch_id || '', pdf_url: material.pdf_url || '', cover_image_url: material.cover_image_url || '', is_premium: Boolean(material.is_premium), is_published: Boolean(material.is_published) }); }} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs">Edit</button>
                    <button type="button" onClick={async () => { try { await toggleAdminStudyMaterialStatus(material.id, !material.is_published); await loadMaterials(1); await loadStats(); addToast('Material status updated.', 'success'); } catch (error) { addToast(error.message || 'Unable to update material status.', 'error'); } }} className="px-3 py-2 rounded-lg bg-amber-950/70 text-amber-200 text-xs">{material.is_published ? 'Hide' : 'Publish'}</button>
                  </div>
                </div>
              </div>
            ))}
            {materialState.hasMore && <button type="button" onClick={() => loadMaterials(materialState.page + 1)} className="w-full px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold">Load more</button>}
          </div>
        )}
      </div>
    </div>
  );

  const renderAffairPanel = () => (
    <div className="space-y-6">
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Current affairs management</h2>
        <form onSubmit={handleAffairSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={affairForm.title} onChange={(event) => setAffairForm((previous) => ({ ...previous, title: event.target.value, slug: previous.slug || slugify(event.target.value) }))} placeholder="Title" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" required />
            <input value={affairForm.slug || ''} onChange={(event) => setAffairForm((previous) => ({ ...previous, slug: event.target.value }))} placeholder="Slug" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="date" value={affairForm.published_at || ''} onChange={(event) => setAffairForm((previous) => ({ ...previous, published_at: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" required />
            <input value={affairForm.source_name || ''} onChange={(event) => setAffairForm((previous) => ({ ...previous, source_name: event.target.value }))} placeholder="Source name" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
            <input value={affairForm.category || ''} onChange={(event) => setAffairForm((previous) => ({ ...previous, category: event.target.value }))} placeholder="Category" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
          </div>
          <input value={affairForm.source_url || ''} onChange={(event) => setAffairForm((previous) => ({ ...previous, source_url: event.target.value }))} placeholder="Source URL" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
          <textarea value={affairForm.summary || ''} onChange={(event) => setAffairForm((previous) => ({ ...previous, summary: event.target.value }))} rows="2" placeholder="Summary" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" required />
          <textarea value={affairForm.content || ''} onChange={(event) => setAffairForm((previous) => ({ ...previous, content: event.target.value }))} rows="5" placeholder="Full content" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
          <label className="inline-flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={affairForm.is_published} onChange={(event) => setAffairForm((previous) => ({ ...previous, is_published: event.target.checked }))} /> Published</label>
          <div className="flex gap-3">
            <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"><Plus className="w-4 h-4" />{editingAffairId ? 'Save current affair' : 'Create current affair'}</button>
            {editingAffairId && <button type="button" onClick={() => { setEditingAffairId(null); setAffairForm(emptyCurrentAffair); }} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs">Cancel</button>}
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h3 className="font-bold text-slate-100">Current affairs library</h3>
          <div className="flex flex-wrap gap-2">
            <input value={affairState.search} onChange={(event) => setAffairState((previous) => ({ ...previous, search: event.target.value }))} placeholder="Search affairs" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
            <select value={affairState.status} onChange={(event) => setAffairState((previous) => ({ ...previous, status: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="All">All status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>
        {affairState.loading ? <p className="text-sm text-slate-400">Loading current affairs...</p> : affairState.error ? <p className="text-sm text-rose-400">{affairState.error}</p> : affairState.items.length === 0 ? <p className="text-sm text-slate-400">No current affairs found.</p> : (
          <div className="space-y-3">
            {affairState.items.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-200">{item.title}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-mono uppercase text-slate-400">
                      <span>{item.category}</span>
                      <span>{item.is_published ? 'Published' : 'Draft'}</span>
                      <span>{item.published_at ? new Date(item.published_at).toLocaleDateString('en-PK') : 'No date'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setEditingAffairId(item.id); setAffairForm({ ...emptyCurrentAffair, ...item, published_at: item.published_at ? new Date(item.published_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10) }); }} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs">Edit</button>
                    <button type="button" onClick={async () => { try { await toggleAdminCurrentAffairStatus(item.id, !item.is_published); await loadAffairs(1); await loadStats(); addToast('Current affair status updated.', 'success'); } catch (error) { addToast(error.message || 'Unable to update current affair status.', 'error'); } }} className="px-3 py-2 rounded-lg bg-amber-950/70 text-amber-200 text-xs">{item.is_published ? 'Hide' : 'Publish'}</button>
                  </div>
                </div>
              </div>
            ))}
            {affairState.hasMore && <button type="button" onClick={() => loadAffairs(affairState.page + 1)} className="w-full px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold">Load more</button>}
          </div>
        )}
      </div>
    </div>
  );

  const renderISSBPanel = () => (
    <div className="space-y-6">
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <h2 className="text-xl font-bold text-slate-100">ISSB module management</h2>
        <form onSubmit={handleISSBSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={issbForm.title} onChange={(event) => setIssbForm((previous) => ({ ...previous, title: event.target.value, slug: previous.slug || slugify(event.target.value) }))} placeholder="Module title" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" required />
            <input value={issbForm.slug || ''} onChange={(event) => setIssbForm((previous) => ({ ...previous, slug: event.target.value }))} placeholder="Slug" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select value={issbForm.module_type} onChange={(event) => setIssbForm((previous) => ({ ...previous, module_type: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="PREPARATION">Preparation</option>
              <option value="PSYCHOLOGICAL">Psychological</option>
              <option value="INTERVIEW">Interview</option>
              <option value="GROUP_DISCUSSION">Group Discussion</option>
              <option value="GTO">GTO</option>
            </select>
            <input type="number" value={issbForm.display_order || 1} onChange={(event) => setIssbForm((previous) => ({ ...previous, display_order: Number(event.target.value) }))} placeholder="Display order" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
          </div>
          <textarea value={issbForm.description || ''} onChange={(event) => setIssbForm((previous) => ({ ...previous, description: event.target.value }))} rows="2" placeholder="Short description" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
          <textarea value={issbForm.content || ''} onChange={(event) => setIssbForm((previous) => ({ ...previous, content: event.target.value }))} rows="5" placeholder="Module content" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
          <label className="inline-flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={issbForm.is_published} onChange={(event) => setIssbForm((previous) => ({ ...previous, is_published: event.target.checked }))} /> Published</label>
          <div className="flex gap-3">
            <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"><Plus className="w-4 h-4" />{editingISSBId ? 'Save module' : 'Create module'}</button>
            {editingISSBId && <button type="button" onClick={() => { setEditingISSBId(null); setIssbForm(emptyISSBModule); }} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs">Cancel</button>}
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h3 className="font-bold text-slate-100">ISSB module library</h3>
          <div className="flex flex-wrap gap-2">
            <input value={issbState.search} onChange={(event) => setIssbState((previous) => ({ ...previous, search: event.target.value }))} placeholder="Search modules" className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100" />
            <select value={issbState.status} onChange={(event) => setIssbState((previous) => ({ ...previous, status: event.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="All">All status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>
        {issbState.loading ? <p className="text-sm text-slate-400">Loading ISSB modules...</p> : issbState.error ? <p className="text-sm text-rose-400">{issbState.error}</p> : issbState.items.length === 0 ? <p className="text-sm text-slate-400">No ISSB modules found.</p> : (
          <div className="space-y-3">
            {issbState.items.map((module) => (
              <div key={module.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-200">{module.title}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-mono uppercase text-slate-400">
                      <span>{module.module_type}</span>
                      <span>{module.is_published ? 'Published' : 'Draft'}</span>
                      <span>Order {module.display_order || 1}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setEditingISSBId(module.id); setIssbForm({ ...emptyISSBModule, ...module, title: module.title || '', description: module.description || '', content: module.content || '', module_type: module.module_type || 'PREPARATION', display_order: module.display_order || 1, is_published: Boolean(module.is_published) }); }} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs">Edit</button>
                    <button type="button" onClick={async () => { try { await toggleAdminISSBModuleStatus(module.id, !module.is_published); await loadISSB(1); await loadStats(); addToast('ISSB status updated.', 'success'); } catch (error) { addToast(error.message || 'Unable to update module status.', 'error'); } }} className="px-3 py-2 rounded-lg bg-amber-950/70 text-amber-200 text-xs">{module.is_published ? 'Hide' : 'Publish'}</button>
                  </div>
                </div>
              </div>
            ))}
            {issbState.hasMore && <button type="button" onClick={() => loadISSB(issbState.page + 1)} className="w-full px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold">Load more</button>}
          </div>
        )}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'questions':
        return renderQuestionPanel();
      case 'mock-tests':
        return renderMockPanel();
      case 'study-materials':
        return renderMaterialPanel();
      case 'current-affairs':
        return renderAffairPanel();
      case 'issb':
        return renderISSBPanel();
      default:
        return renderQuestionPanel();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {tabOptions.map((tab) => (
          <button key={tab.value} type="button" onClick={() => setActiveTab(tab.value)} className={`px-3 py-3 rounded-xl text-xs font-semibold border transition ${activeTab === tab.value ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400"><ClipboardList className="w-4 h-4 text-emerald-400" /> <span className="text-[10px] uppercase font-mono">Questions</span></div>
          <div className="mt-3 text-2xl font-extrabold text-slate-100">{stats.questions}</div>
          <p className="text-xs text-slate-400">{stats.activeQuestions} active</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400"><Layers3 className="w-4 h-4 text-emerald-400" /> <span className="text-[10px] uppercase font-mono">Mock tests</span></div>
          <div className="mt-3 text-2xl font-extrabold text-slate-100">{stats.mockTests}</div>
          <p className="text-xs text-slate-400">{stats.activeMockTests} active</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400"><BookOpen className="w-4 h-4 text-emerald-400" /> <span className="text-[10px] uppercase font-mono">Materials</span></div>
          <div className="mt-3 text-2xl font-extrabold text-slate-100">{stats.studyMaterials}</div>
          <p className="text-xs text-slate-400">{stats.activeStudyMaterials} published</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400"><FileText className="w-4 h-4 text-emerald-400" /> <span className="text-[10px] uppercase font-mono">Affairs</span></div>
          <div className="mt-3 text-2xl font-extrabold text-slate-100">{stats.currentAffairs}</div>
          <p className="text-xs text-slate-400">{stats.activeCurrentAffairs} published</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400"><ShieldCheck className="w-4 h-4 text-emerald-400" /> <span className="text-[10px] uppercase font-mono">ISSB</span></div>
          <div className="mt-3 text-2xl font-extrabold text-slate-100">{stats.issbModules}</div>
          <p className="text-xs text-slate-400">{stats.activeISSBModules} published</p>
        </div>
      </div>

      {renderTabContent()}
    </div>
  );
}
