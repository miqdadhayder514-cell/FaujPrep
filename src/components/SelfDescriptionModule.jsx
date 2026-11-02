import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Clock3, Eye, History, LoaderCircle, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { SELF_DESCRIPTION_BANK_NOTICE, SELF_DESCRIPTION_CATEGORIES, SELF_DESCRIPTION_CATEGORY_EXAMPLES, SELF_DESCRIPTION_CLASSIC_HEADINGS, SELF_DESCRIPTION_CLASSIC_QUESTION_IDS, SELF_DESCRIPTION_EXAMPLE, SELF_DESCRIPTION_QUESTIONS } from '../data/selfDescriptionQuestions';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { isPrimaryAdmin } from '../lib/adminAccess';

const BASE_PATH = '/issb/psychological-tests/selfdescriptiontest';
const DURATION_OPTIONS = [5, 10, 15];
const QUESTION_COUNTS = { classic: 5, seven: 7, extended: SELF_DESCRIPTION_QUESTIONS.length };

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `sdt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getWordCount(value) {
  return value.trim().match(/\b[\p{L}\p{N}'’-]+\b/gu)?.length || 0;
}

function getLocalStorageKey(userId) {
  return `faujprep:self-description:${userId || 'visitor'}`;
}

function readLocalState(key) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(key) || '{}');
    return {
      draft: stored.draft || null,
      attempts: Array.isArray(stored.attempts) ? stored.attempts : [],
      error: null,
    };
  } catch (error) {
    return { draft: null, attempts: [], error: `Could not read the saved device copy: ${error.message}` };
  }
}

function toLocalAttempt(attempt) {
  return {
    id: attempt.id,
    mode: attempt.mode,
    title: attempt.title,
    questionIds: attempt.questionIds,
    questionIndex: attempt.questionIndex || 0,
    responses: attempt.responses,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    durationMinutes: attempt.durationMinutes,
    status: attempt.status,
    feedback: attempt.feedback || null,
    accountPersisted: attempt.accountPersisted,
  };
}

function mapDatabaseAttempt(row) {
  return {
    id: row.id,
    mode: row.practice_mode,
    title: row.title,
    questionIds: row.question_ids || [],
    questionIndex: row.current_question_index || 0,
    responses: Object.fromEntries((row.responses || []).map((response) => [response.question_id, response.response_text])),
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    durationMinutes: row.duration_minutes,
    status: row.status,
    feedback: row.feedback?.[0]?.feedback_json || null,
    accountPersisted: true,
  };
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

export default function SelfDescriptionModule({ user, routeSuffix = '', onNavigate, onBack }) {
  const storageKey = getLocalStorageKey(user?.id);
  const routeParts = routeSuffix.split('/').filter(Boolean);
  const page = routeParts[0] || 'home';
  const resultAttemptId = page === 'results' ? routeParts[1] : null;
  const isAdmin = isPrimaryAdmin(user);
  const [questions, setQuestions] = useState(SELF_DESCRIPTION_QUESTIONS);
  const [attempt, setAttempt] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(SELF_DESCRIPTION_CATEGORIES[0].id);
  const [simulationType, setSimulationType] = useState('classic');
  const [simulationDuration, setSimulationDuration] = useState(5);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [feedbackState, setFeedbackState] = useState({ loading: false, error: null });
  const [storageState, setStorageState] = useState({ loading: true, error: null, saveStatus: 'Not saved yet' });
  const [questionLoadError, setQuestionLoadError] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [showExample, setShowExample] = useState(false);
  const [submissionPending, setSubmissionPending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const textAreaRef = useRef(null);
  const startLockRef = useRef(false);
  const submitLockRef = useRef(false);
  const adminUser = isAdmin;

  const activeQuestions = useMemo(
    () => questions.filter((question) => question.isActive).sort((a, b) => a.displayOrder - b.displayOrder),
    [questions],
  );
  const questionById = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  const attemptQuestions = useMemo(
    () => (attempt?.questionIds || []).map((questionId) => questionById.get(questionId)).filter(Boolean),
    [attempt, questionById],
  );
  const currentQuestion = attemptQuestions[attempt?.questionIndex || 0] || null;
  const currentResponse = currentQuestion ? attempt?.responses?.[currentQuestion.id] || '' : '';
  const elapsedSeconds = attempt?.startedAt ? Math.max(0, Math.floor((now - new Date(attempt.startedAt).getTime()) / 1000)) : 0;
  const remainingSeconds = attempt?.durationMinutes
    ? Math.max(0, attempt.durationMinutes * 60 - elapsedSeconds)
    : null;

  const navigate = useCallback((suffix = '') => {
    onNavigate(suffix);
    setConfirmSubmit(false);
    setAiConsent(false);
  }, [onNavigate]);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const local = readLocalState(storageKey);
      const localDraft = local.draft ? { ...local.draft, accountPersisted: false } : null;
      const localAttempts = local.attempts.map((saved) => ({ ...saved, accountPersisted: false }));
      const localHistory = localDraft && !localAttempts.some((saved) => saved.id === localDraft.id)
        ? [localDraft, ...localAttempts]
        : localAttempts;
      if (active) {
        const routeAttempt = page === 'practice' ? localHistory.find((saved) => saved.id === routeParts[1]) : null;
        setAttempt(routeAttempt || localDraft);
        setHistory(localHistory);
        setStorageState((previous) => ({
          ...previous,
          loading: Boolean(isSupabaseConfigured && supabase && user?.id),
          error: local.error,
        }));
      }

      if (!isSupabaseConfigured || !supabase || !user?.id) {
        if (active) setStorageState((previous) => ({ ...previous, loading: false, saveStatus: 'Saved on this device only' }));
        return;
      }

      const databaseRows = [];
      for (let offset = 0; active; offset += 500) {
        const { data, error } = await supabase
          .from('self_description_attempts')
          .select('*, responses:self_description_responses(question_id,response_text), feedback:self_description_feedback(feedback_json)')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .range(offset, offset + 499);

        if (!active) return;
        if (error) {
          setStorageState({ loading: false, error: `Could not load saved attempts: ${error.message}`, saveStatus: 'Local device save available' });
          return;
        }
        databaseRows.push(...(data || []));
        if (!data || data.length < 500) break;
      }

      const databaseAttempts = databaseRows.map(mapDatabaseAttempt);
      const combined = [...databaseAttempts];
      for (const localAttempt of localAttempts) {
        if (!combined.some((saved) => saved.id === localAttempt.id)) combined.push(localAttempt);
      }
      combined.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
      setHistory(combined);
      const routeAttempt = page === 'practice' ? combined.find((saved) => saved.id === routeParts[1]) : null;
      const savedDraft = combined.find((saved) => saved.status === 'in_progress');
      if (routeAttempt || savedDraft) setAttempt(routeAttempt || savedDraft);
      setStorageState({ loading: false, error: null, saveStatus: 'Saved to your account' });
    };

    restore().catch((error) => {
      if (active) setStorageState({ loading: false, error: error.message || 'Could not restore your saved practice.', saveStatus: 'Local device save available' });
    });
    return () => { active = false; };
  }, [storageKey, user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;
    let active = true;
    const loadQuestions = async () => {
      const query = supabase.from('self_description_questions').select('*').order('display_order');
      const { data, error } = adminUser ? await query : await query.eq('is_active', true);
      if (!active) return;
      if (error) {
        setQuestionLoadError(`The seeded question bank could not be loaded from Supabase: ${error.message}. Apply migration 059_issb_self_description.sql; built-in practice remains available.`);
        return;
      }
      if (!data?.length) {
        setQuestionLoadError('The Supabase question bank is empty. Apply migration 059_issb_self_description.sql; built-in practice remains available.');
        return;
      }
      setQuestions(data.map((row) => ({
        id: row.id,
        categoryId: row.category_id,
        category: row.category_name,
        title: row.title,
        description: row.description,
        writingGuidance: row.writing_guidance,
        difficulty: row.difficulty,
        displayOrder: row.display_order,
        questionType: row.question_type,
        isActive: row.is_active,
        isCore: row.is_core,
        example: SELF_DESCRIPTION_CATEGORY_EXAMPLES[row.category_id] || SELF_DESCRIPTION_EXAMPLE,
      })));
      setQuestionLoadError(null);
    };
    loadQuestions().catch((error) => active && setQuestionLoadError(`Could not load the question bank: ${error.message}`));
    return () => { active = false; };
  }, [adminUser]);

  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress') return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [attempt?.id, attempt?.status]);

  useEffect(() => {
    if (!attempt) return;
    try {
      const currentAttempt = toLocalAttempt(attempt);
      const savedHistory = [currentAttempt, ...history.filter((item) => item.id !== attempt.id)].map(toLocalAttempt);
      window.localStorage.setItem(storageKey, JSON.stringify({
        draft: attempt.status === 'in_progress' ? currentAttempt : null,
        attempts: savedHistory,
      }));
    } catch (error) {
      setStorageState((previous) => ({ ...previous, error: `Could not save practice on this device: ${error.message}`, saveStatus: 'Save failed' }));
    }
  }, [attempt, history, storageKey]);

  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress' || attempt.accountPersisted === false || !user?.id || !supabase || !isSupabaseConfigured) {
      if (attempt?.status === 'in_progress' && !user?.id) {
        setStorageState((previous) => ({ ...previous, saveStatus: 'Saved on this device; account session unavailable' }));
      }
      return undefined;
    }

    const timeout = window.setTimeout(async () => {
      setStorageState((previous) => ({ ...previous, saveStatus: 'Saving…' }));
      const responseRows = attempt.questionIds.map((questionId) => ({
        attempt_id: attempt.id,
        question_id: questionId,
        user_id: user.id,
        response_text: attempt.responses[questionId] || '',
      }));
      const { error } = await supabase.from('self_description_responses').upsert(responseRows, { onConflict: 'attempt_id,question_id' });
      if (error) {
        setStorageState((previous) => ({ ...previous, error: `Account autosave failed: ${error.message}`, saveStatus: 'Device copy saved' }));
      } else {
        const { error: progressError } = await supabase.from('self_description_attempts')
          .update({ current_question_index: attempt.questionIndex || 0 })
          .eq('id', attempt.id)
          .eq('user_id', user.id)
          .eq('status', 'in_progress');
        if (progressError) setStorageState((previous) => ({ ...previous, error: `Answers are saved, but practice position could not be saved: ${progressError.message}`, saveStatus: 'Answers saved' }));
        else setStorageState((previous) => ({ ...previous, error: null, saveStatus: 'All changes saved' }));
      }
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [attempt, user?.id]);

  const startAttempt = useCallback(async ({ mode, questionIds, durationMinutes = null, title }) => {
    if (startLockRef.current || !questionIds.length) return;
    startLockRef.current = true;
    const startedAt = new Date().toISOString();
    const accountAvailable = Boolean(user?.id && supabase && isSupabaseConfigured);
    const nextAttempt = {
      id: makeId(),
      mode,
      title,
      questionIds,
      questionIndex: 0,
      responses: {},
      startedAt,
      submittedAt: null,
      durationMinutes,
      status: 'in_progress',
      feedback: null,
      accountPersisted: false,
    };
    setAttempt(nextAttempt);
    setHistory((previous) => [toLocalAttempt(nextAttempt), ...previous.filter((item) => item.id !== nextAttempt.id)]);
    setFeedbackState({ loading: false, error: null });
    setStorageState({ loading: false, error: null, saveStatus: accountAvailable ? 'Saving…' : 'Saved on this device only' });
    navigate(`practice/${nextAttempt.id}`);

    try {
      if (user?.id && supabase && isSupabaseConfigured) {
        const { error } = await supabase.from('self_description_attempts').insert({
          id: nextAttempt.id,
          user_id: user.id,
          practice_mode: mode,
          title,
          question_ids: questionIds,
          current_question_index: 0,
          started_at: startedAt,
          duration_minutes: durationMinutes,
          status: 'in_progress',
        });
        if (error) {
          setStorageState({ loading: false, error: `Could not create the account attempt: ${error.message}. Your device draft is still available.`, saveStatus: 'Device copy saved' });
        } else {
          setAttempt((previous) => previous?.id === nextAttempt.id ? { ...previous, accountPersisted: true } : previous);
          setHistory((items) => items.map((item) => item.id === nextAttempt.id ? { ...item, accountPersisted: true } : item));
        }
      }
    } catch (error) {
      setStorageState({ loading: false, error: `Could not create the account attempt: ${error.message}. Your device draft is still available.`, saveStatus: 'Device copy saved' });
    } finally {
      startLockRef.current = false;
    }
  }, [navigate, user?.id]);

  const completeAttempt = useCallback(async (automatic = false) => {
    if (submitLockRef.current || !attempt || attempt.status !== 'in_progress') return;
    submitLockRef.current = true;
    setSubmissionPending(true);
    const submittedAt = new Date().toISOString();
    const completed = { ...attempt, status: 'completed', submittedAt, autoSubmitted: automatic };
    setAttempt(completed);
    setHistory((items) => [toLocalAttempt(completed), ...items.filter((item) => item.id !== completed.id)]);
    setConfirmSubmit(false);
    navigate(`results/${completed.id}`);
    try {
      if (user?.id && supabase && isSupabaseConfigured && completed.accountPersisted !== false) {
        const responseRows = completed.questionIds.map((questionId) => ({
          attempt_id: completed.id,
          question_id: questionId,
          user_id: user.id,
          response_text: completed.responses[questionId] || '',
        }));
        const { error: responseError } = await supabase.from('self_description_responses').upsert(responseRows, { onConflict: 'attempt_id,question_id' });
        if (responseError) {
          setAttempt((previous) => previous?.id === completed.id ? { ...previous, accountPersisted: false } : previous);
          setHistory((previous) => previous.map((item) => item.id === completed.id ? { ...item, accountPersisted: false } : item));
          setStorageState((previous) => ({ ...previous, error: `Responses are submitted on this device, but account response saving failed: ${responseError.message}`, saveStatus: 'Device copy saved' }));
          return;
        }
        const { error } = await supabase.from('self_description_attempts').update({
          status: 'completed',
          submitted_at: submittedAt,
          duration_seconds: elapsedSeconds,
        }).eq('id', completed.id).eq('user_id', user.id);
        if (error) {
          setAttempt((previous) => previous?.id === completed.id ? { ...previous, accountPersisted: false } : previous);
          setHistory((previous) => previous.map((item) => item.id === completed.id ? { ...item, accountPersisted: false } : item));
          setStorageState((previous) => ({ ...previous, error: `Attempt submitted on this device, but account submission failed: ${error.message}`, saveStatus: 'Device copy saved' }));
        }
        else setStorageState((previous) => ({ ...previous, error: null, saveStatus: 'Submitted and saved to your account' }));
      }
    } catch (error) {
      setAttempt((previous) => previous?.id === completed.id ? { ...previous, accountPersisted: false } : previous);
      setHistory((previous) => previous.map((item) => item.id === completed.id ? { ...item, accountPersisted: false } : item));
      setStorageState((previous) => ({ ...previous, error: `Attempt saved on this device, but account submission failed: ${error.message}`, saveStatus: 'Device copy saved' }));
    } finally {
      submitLockRef.current = false;
      setSubmissionPending(false);
    }
  }, [attempt, elapsedSeconds, navigate, user?.id]);

  useEffect(() => {
    if (attempt?.status === 'in_progress' && remainingSeconds === 0) completeAttempt(true);
  }, [attempt?.id, attempt?.status, completeAttempt, remainingSeconds]);

  const updateResponse = (questionId, responseText) => {
    if (!attempt || attempt.status !== 'in_progress') return;
    const nextAttempt = { ...attempt, responses: { ...attempt.responses, [questionId]: responseText } };
    setAttempt(nextAttempt);
    setHistory((previous) => previous.map((item) => item.id === nextAttempt.id ? toLocalAttempt(nextAttempt) : item));
  };

  const moveQuestion = (offset) => {
    setAttempt((previous) => {
      if (!previous || previous.status !== 'in_progress') return previous;
      const nextIndex = Math.max(0, Math.min(previous.questionIds.length - 1, previous.questionIndex + offset));
      return { ...previous, questionIndex: nextIndex };
    });
    setShowExample(false);
    textAreaRef.current?.focus();
  };

  const persistQuestionAdminEdit = async (question) => {
    if (!isAdmin || !supabase || !user?.id) return;
    const { error } = await supabase.from('self_description_questions').upsert({
      id: question.id,
      category_id: question.categoryId,
      category_name: question.category,
      title: question.title,
      description: question.description,
      writing_guidance: question.writingGuidance,
      difficulty: question.difficulty,
      display_order: question.displayOrder,
      question_type: question.questionType,
      is_active: question.isActive,
      is_core: question.isCore,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setQuestionLoadError(`Could not save question ${question.id}: ${error.message}`);
      return;
    }
    setQuestions((previous) => previous.map((item) => item.id === question.id ? question : item));
    setEditingQuestion(null);
    setQuestionLoadError(null);
  };

  const addQuestion = async (event) => {
    event.preventDefault();
    const title = newQuestionTitle.trim();
    if (!isAdmin || !title || !supabase || !user?.id) return;
    const category = SELF_DESCRIPTION_CATEGORIES.find((item) => item.id === selectedCategory);
    if (!category) return;
    const id = `${slugify(title)}-${makeId().slice(0, 8)}`;
    const question = {
      id,
      categoryId: category.id,
      category: category.name,
      title,
      description: 'Reflect on this prompt using a real, relevant example.',
      writingGuidance: 'Describe what happened, your own actions, and what you learned. Keep the answer truthful.',
      difficulty: 'medium',
      displayOrder: Math.max(0, ...questions.map((item) => item.displayOrder)) + 1,
      questionType: 'written',
      isActive: true,
      isCore: false,
    };
    setQuestions((previous) => [...previous, question]);
    setNewQuestionTitle('');
    await persistQuestionAdminEdit(question);
  };

  const requestAiFeedback = async (targetAttempt) => {
    if (!aiConsent || !targetAttempt || targetAttempt.status !== 'completed' || targetAttempt.accountPersisted === false || !supabase || !isSupabaseConfigured) return;
    setFeedbackState({ loading: true, error: null });
    try {
      const { data, error } = await supabase.functions.invoke('self-description-feedback', {
        body: { attemptId: targetAttempt.id, consentToAiProcessing: true },
      });
      if (error) {
        setFeedbackState({ loading: false, error: `AI feedback is unavailable: ${error.message}. Confirm the deployed Supabase Edge Function and its server-side provider configuration.` });
        return;
      }
      if (!data?.feedback) throw new Error('The feedback service returned no feedback.');
      setAttempt((previous) => previous?.id === targetAttempt.id ? { ...previous, feedback: data.feedback } : previous);
      setHistory((previous) => previous.map((item) => item.id === targetAttempt.id ? { ...item, feedback: data.feedback } : item));
      setFeedbackState({ loading: false, error: null });
    } catch (error) {
      setFeedbackState({ loading: false, error: `AI feedback could not be requested: ${error.message || 'The request failed.'}` });
    }
  };

  const renderHeader = (eyebrow, title, description) => (
    <header className="space-y-3 rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 p-6 sm:p-9">
      <p className="text-xs font-mono uppercase tracking-[0.18em] text-amber-300">{eyebrow}</p>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">{title}</h1>
      <p className="max-w-3xl text-sm leading-7 text-slate-300">{description}</p>
    </header>
  );

  const renderHome = () => (
    <div className="space-y-7">
      {renderHeader('ISSB · Self-awareness practice', 'Self-Description Test', 'Practise clear, honest reflection on how you see yourself and how people around you may experience your behaviour. Use this space to understand your patterns—not to perform a perfect personality.')}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-100"><BookOpen className="h-5 w-5 text-amber-400" /> A useful way to approach SDT</h2>
          <div className="space-y-3 text-sm leading-7 text-slate-300">
            <p>The Self-Description Test is a guided reflection exercise: you describe yourself and consider how parents, friends, teachers, and other people may describe you. It helps you practise communicating self-awareness, examples, and areas you are working on.</p>
            <p>Think in observable behaviour—what you did, the context, and the result. A strength is a useful quality supported by actions; a weakness is a real limitation you can acknowledge and work on. Neither needs to be exaggerated.</p>
            <p>Honest, balanced answers are more useful than memorised claims. You can mention uncertainty, learning, and unfinished progress. Do not invent achievements, hide a weakness, or copy a sample as your own story.</p>
          </div>
          <p className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-sm leading-6 text-amber-100">{SELF_DESCRIPTION_BANK_NOTICE}</p>
        </section>
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-bold text-slate-100">Classic five-question practice</h2>
          <p className="text-xs text-slate-400">A commonly reported preparation format—not a guaranteed official paper.</p>
          <ol className="space-y-2 text-sm text-slate-300">
            {SELF_DESCRIPTION_CLASSIC_QUESTION_IDS.map((id, index) => <li key={id} className="flex gap-3"><span className="font-mono text-amber-400">{index + 1}.</span>{questionById.get(id)?.title}</li>)}
          </ol>
          <p className="border-t border-slate-800 pt-3 text-xs leading-5 text-slate-400">Related commonly reported headings: {SELF_DESCRIPTION_CLASSIC_HEADINGS.join(' · ')}</p>
        </section>
      </div>
      {questionLoadError && <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200">{questionLoadError}</p>}
      {storageState.error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-sm text-rose-200">{storageState.error}</p>}
      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-mono uppercase tracking-widest text-emerald-300">Personal learning record</p><h2 className="mt-1 text-xl font-bold text-slate-100">Your practice dashboard</h2></div><button type="button" onClick={() => navigate('history')} className="text-sm font-semibold text-amber-300 hover:text-amber-200">Open full history</button></div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          {[
            ['Total attempts', history.length],
            ['Completed', history.filter((item) => item.status === 'completed').length],
            ['Unfinished', history.filter((item) => item.status === 'in_progress').length],
            ['Classic practice', history.filter((item) => item.mode === 'classic').length],
            ['Timed simulations', history.filter((item) => item.mode.startsWith('simulation-')).length],
          ].map(([label, count]) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-2xl font-extrabold text-slate-100">{count}</p></div>)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="text-sm font-semibold text-slate-200">Category practice</h3>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">{SELF_DESCRIPTION_CATEGORIES.map((category) => {
              const answerCount = history.reduce((total, item) => total + item.questionIds.filter((id) => questionById.get(id)?.categoryId === category.id && item.responses[id]?.trim()).length, 0);
              return <p key={category.id} className="flex justify-between gap-2 text-xs text-slate-400"><span>{category.name}</span><span className="font-mono text-slate-200">{answerCount}</span></p>;
            })}</div>
            <p className="mt-2 text-[10px] text-slate-500">Saved responses across your attempts; repeated practice is counted each time.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="text-sm font-semibold text-slate-200">Recent reflection history</h3>
            <div className="mt-3 space-y-3">{history.filter((item) => item.status === 'completed').slice(0, 4).map((item) => {
              const words = Object.values(item.responses).reduce((total, text) => total + getWordCount(text), 0);
              return <div key={item.id} className="flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, Math.max(4, words / Math.max(1, item.questionIds.length) * 2))}%` }} /></div><p className="w-44 truncate text-xs text-slate-300">{item.title}</p><span className="w-14 text-right text-[10px] text-slate-500">{words} words</span></div>;
            })}{!history.some((item) => item.status === 'completed') && <p className="text-xs text-slate-500">Completed practice will be listed here with your response length for reflection—not as a performance score.</p>}</div>
          </div>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <button type="button" onClick={() => startAttempt({ mode: 'classic', questionIds: SELF_DESCRIPTION_CLASSIC_QUESTION_IDS, title: 'Classic Self-Description' })} className="rounded-2xl border border-amber-500/35 bg-slate-900 p-5 text-left transition hover:-translate-y-0.5 hover:border-amber-400">
          <span className="text-xs font-mono text-amber-300">5 PROMPTS · UNTIL YOU SUBMIT</span><h2 className="mt-2 text-lg font-bold text-slate-100">Classic Self-Description</h2><p className="mt-2 text-sm text-slate-400">Practise the five traditional perspectives together.</p>
        </button>
        <button type="button" onClick={() => startAttempt({ mode: 'core', questionIds: activeQuestions.filter((question) => question.isCore).map((question) => question.id), title: 'Commonly Reported Core Questions' })} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-amber-500/50">
          <span className="text-xs font-mono text-amber-300">8 PROMPTS · COMMONLY REPORTED</span><h2 className="mt-2 text-lg font-bold text-slate-100">Core Questions</h2><p className="mt-2 text-sm text-slate-400">The classic set plus commonly reported strengths, weaknesses, and critics headings.</p>
        </button>
        <button type="button" onClick={() => navigate('questions')} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-amber-500/50">
          <span className="text-xs font-mono text-amber-300">10 CATEGORIES</span><h2 className="mt-2 text-lg font-bold text-slate-100">Category Practice</h2><p className="mt-2 text-sm text-slate-400">Choose a category or practise an individual prompt.</p>
        </button>
        <button type="button" onClick={() => startAttempt({ mode: 'random', questionIds: pickRandom(activeQuestions, 10).map((question) => question.id), title: 'Random Practice · 10 Questions' })} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-amber-500/50">
          <span className="text-xs font-mono text-amber-300">10 RANDOM PROMPTS</span><h2 className="mt-2 text-lg font-bold text-slate-100">Random Practice</h2><p className="mt-2 text-sm text-slate-400">A fresh mix without repeats in one session.</p>
        </button>
        <button type="button" onClick={() => startAttempt({ mode: 'full', questionIds: activeQuestions.map((question) => question.id), title: 'Full Question Bank · 88 Questions' })} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-amber-500/50">
          <span className="text-xs font-mono text-amber-300">88 PROMPTS</span><h2 className="mt-2 text-lg font-bold text-slate-100">Full Question Bank</h2><p className="mt-2 text-sm text-slate-400">Work through every active question at your own pace.</p>
        </button>
        <button type="button" onClick={() => navigate('simulation')} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-amber-500/50">
          <span className="text-xs font-mono text-amber-300">5 · 10 · 15 MINUTES</span><h2 className="mt-2 flex items-center gap-2 text-lg font-bold text-slate-100"><Clock3 className="h-4 w-4 text-amber-400" /> Test Simulation</h2><p className="mt-2 text-sm text-slate-400">Timed practice settings with random prompt selection, not official ISSB timing.</p>
        </button>
      </section>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => navigate('history')} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100"><History className="h-4 w-4" /> Practice history ({history.length})</button>
        {attempt?.status === 'in_progress' && <button type="button" onClick={() => navigate(`practice/${attempt.id}`)} className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950">Resume saved draft</button>}
        <button type="button" onClick={onBack} className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300">ISSB Psychological Tests</button>
      </div>
    </div>
  );

  const renderQuestionBank = () => (
    <div className="space-y-6">
      {renderHeader('Question bank · 88 prompts', 'Choose what to practise', 'The bank keeps all ten categories intact. Commonly reported core items are labelled separately from extended preparation prompts.')}
      {questionLoadError && <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200">{questionLoadError}</p>}
      {adminUser && (
        <form onSubmit={addQuestion} className="flex flex-col gap-3 rounded-2xl border border-violet-500/30 bg-violet-950/20 p-4 sm:flex-row">
          <label className="sr-only" htmlFor="sdt-new-question">New question title</label>
          <input id="sdt-new-question" value={newQuestionTitle} onChange={(event) => setNewQuestionTitle(event.target.value)} placeholder="Add a question to the selected category" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100" />
          <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} aria-label="Category for new question" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100">
            {SELF_DESCRIPTION_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <button type="submit" className="rounded-xl bg-violet-400 px-4 py-3 text-sm font-bold text-slate-950">Add question</button>
        </form>
      )}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-3">
          {SELF_DESCRIPTION_CATEGORIES.map((category) => (
            <button type="button" key={category.id} onClick={() => setSelectedCategory(category.id)} className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-left text-sm ${selectedCategory === category.id ? 'bg-amber-500/15 text-amber-200' : 'text-slate-300 hover:bg-slate-800'}`}>
              <span>{category.name}</span><span className="font-mono text-xs text-slate-500">{category.questionIds.length}</span>
            </button>
          ))}
          <button type="button" onClick={() => startAttempt({ mode: 'category', questionIds: activeQuestions.filter((question) => question.categoryId === selectedCategory).map((question) => question.id), title: `${SELF_DESCRIPTION_CATEGORIES.find((category) => category.id === selectedCategory)?.name} Practice` })} className="mt-2 w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950">Practise this category</button>
        </aside>
        <div className="space-y-3">
          {activeQuestions.filter((question) => question.categoryId === selectedCategory).map((question) => (
            <article key={question.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${question.isCore ? 'bg-amber-500/15 text-amber-200' : 'bg-slate-800 text-slate-400'}`}>{question.isCore ? 'Commonly reported core' : 'Extended practice'}</span><span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] uppercase text-slate-400">{question.difficulty}</span></div>
                  <h2 className="font-semibold leading-6 text-slate-100">{question.title}</h2><p className="text-sm leading-6 text-slate-400">{question.description}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => startAttempt({ mode: 'individual', questionIds: [question.id], title: `Individual Practice · ${question.title}` })} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950">Practise</button>
                  {adminUser && <button type="button" onClick={() => setEditingQuestion(editingQuestion?.id === question.id ? null : { ...question })} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200">Edit</button>}
                </div>
              </div>
              {adminUser && editingQuestion?.id === question.id && (
                <div className="mt-4 grid gap-2 border-t border-slate-800 pt-4">
                  <input value={editingQuestion.title} onChange={(event) => setEditingQuestion((previous) => ({ ...previous, title: event.target.value }))} aria-label="Question title" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
                  <select value={editingQuestion.categoryId} onChange={(event) => {
                    const category = SELF_DESCRIPTION_CATEGORIES.find((item) => item.id === event.target.value);
                    if (category) setEditingQuestion((previous) => ({ ...previous, categoryId: category.id, category: category.name }));
                  }} aria-label="Question category" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                    {SELF_DESCRIPTION_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <textarea value={editingQuestion.description} onChange={(event) => setEditingQuestion((previous) => ({ ...previous, description: event.target.value }))} aria-label="Question description" rows={2} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
                  <textarea value={editingQuestion.writingGuidance} onChange={(event) => setEditingQuestion((previous) => ({ ...previous, writingGuidance: event.target.value }))} aria-label="Writing guidance" rows={3} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-xs text-slate-400">Difficulty<select value={editingQuestion.difficulty} onChange={(event) => setEditingQuestion((previous) => ({ ...previous, difficulty: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
                    <label className="text-xs text-slate-400">Display order<input type="number" value={editingQuestion.displayOrder} onChange={(event) => setEditingQuestion((previous) => ({ ...previous, displayOrder: Number(event.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" /></label>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={editingQuestion.isActive} onChange={(event) => setEditingQuestion((previous) => ({ ...previous, isActive: event.target.checked }))} /> Active in candidate practice</label>
                  <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={editingQuestion.isCore} onChange={(event) => setEditingQuestion((previous) => ({ ...previous, isCore: event.target.checked }))} /> Commonly reported core</label>
                  <button type="button" onClick={() => persistQuestionAdminEdit(editingQuestion)} className="w-fit rounded-lg bg-violet-400 px-4 py-2 text-sm font-bold text-slate-950">Save changes</button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
      <button type="button" onClick={() => navigate('')} className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200">Back to Self-Description</button>
    </div>
  );

  const renderSimulationSetup = () => (
    <div className="space-y-6">
      {renderHeader('Practice settings · not official ISSB timing', 'Set up a test simulation', 'A fresh random selection is made for every simulation. During the simulation, move sequentially through questions; your draft is saved and submitted automatically when time expires.')}
      <div className="grid gap-5 md:grid-cols-2">
        <fieldset className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <legend className="px-2 text-sm font-bold text-slate-100">Simulation set</legend>
          {[['classic', 'Classic five questions', '5 prompts'], ['seven', 'Seven-question practice', '7 random prompts'], ['extended', 'Extended simulation', 'All 88 questions']].map(([value, label, detail]) => <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${simulationType === value ? 'border-amber-500/50 bg-amber-950/20' : 'border-slate-800'}`}><input type="radio" name="sdt-simulation-type" value={value} checked={simulationType === value} onChange={() => setSimulationType(value)} className="mt-1 accent-amber-400" /><span><strong className="block text-sm text-slate-100">{label}</strong><span className="text-xs text-slate-400">{detail}</span></span></label>)}
        </fieldset>
        <fieldset className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <legend className="px-2 text-sm font-bold text-slate-100">Time limit</legend>
          <p className="text-xs text-slate-400">These are FaujPrep practice settings, not official ISSB timings.</p>
          <div className="grid grid-cols-3 gap-2">{DURATION_OPTIONS.map((duration) => <button key={duration} type="button" aria-pressed={simulationDuration === duration} onClick={() => setSimulationDuration(duration)} className={`rounded-xl border px-3 py-4 text-sm font-bold ${simulationDuration === duration ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 bg-slate-950 text-slate-200'}`}>{duration} min</button>)}</div>
          <p className="text-xs leading-5 text-slate-400">Longer simulations contain the selected set within your chosen total time; pacing is for practice only.</p>
        </fieldset>
      </div>
      <button type="button" onClick={() => {
        const count = QUESTION_COUNTS[simulationType];
        const ids = simulationType === 'classic'
          ? SELF_DESCRIPTION_CLASSIC_QUESTION_IDS
          : pickRandom(activeQuestions, count).map((question) => question.id);
        startAttempt({ mode: `simulation-${simulationType}`, questionIds: ids, durationMinutes: simulationDuration, title: `Simulation · ${simulationType === 'classic' ? 'Classic 5' : simulationType === 'seven' ? '7 Questions' : 'Extended 88'} · ${simulationDuration} Minutes` });
      }} className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950">Start simulation</button>
      <button type="button" onClick={() => navigate('')} className="ml-3 rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200">Cancel</button>
    </div>
  );

  const renderPractice = () => {
    if (!attempt) return <div role="status" className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">{storageState.loading ? 'Restoring saved practice…' : 'No active practice found. Choose a set to begin.'} {!storageState.loading && <button type="button" onClick={() => navigate('')} className="ml-2 text-amber-300 underline">Choose practice</button>}</div>;
    if (attempt.status === 'completed') return renderResult(attempt);
    if (!currentQuestion) return <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6 text-rose-200">This saved attempt refers to questions that are not available. Return to the question bank to start another practice.</div>;
    const isSimulation = attempt.mode.startsWith('simulation-');
    const progress = Object.values(attempt.responses).filter((answer) => answer.trim()).length;
    const example = currentQuestion.example || SELF_DESCRIPTION_EXAMPLE;
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => navigate('')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Exit practice</button>
          <div className="flex items-center gap-3">
            {isSimulation && <span role="timer" aria-live="off" className={`rounded-xl border px-4 py-2 font-mono text-lg font-bold ${remainingSeconds <= 60 ? 'border-rose-500/40 bg-rose-950/30 text-rose-300' : 'border-amber-500/40 bg-amber-950/30 text-amber-300'}`}>{formatDuration(remainingSeconds)}</span>}
            <span className="text-xs text-slate-400">{storageState.saveStatus}</span>
          </div>
        </div>
        <section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-mono uppercase tracking-widest text-amber-400">{attempt.title}</p><p className="mt-2 text-sm text-slate-400">{currentQuestion.category} · {currentQuestion.difficulty} · {isSimulation ? 'Timed FaujPrep simulation' : 'Untimed practice'}</p></div>
            <p className="text-sm font-mono text-slate-300">Question {(attempt.questionIndex || 0) + 1} of {attemptQuestions.length}</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-amber-400 transition-all" style={{ width: `${(progress / attemptQuestions.length) * 100}%` }} /></div>
          <div className="space-y-2"><h1 className="text-2xl font-bold leading-snug text-slate-50">{currentQuestion.title}</h1><p className="text-sm leading-6 text-slate-300">{currentQuestion.description}</p></div>
          <aside className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-4 text-sm leading-6 text-sky-100"><strong className="block text-sky-200">Writing guidance</strong>{currentQuestion.writingGuidance} Suggested length: about 40–100 words, as a guide only.</aside>
          <div className="space-y-2">
            <label htmlFor="sdt-answer" className="text-sm font-semibold text-slate-200">Your answer</label>
            <textarea ref={textAreaRef} id="sdt-answer" value={currentResponse} onChange={(event) => updateResponse(currentQuestion.id, event.target.value)} disabled={attempt.status !== 'in_progress'} rows={10} placeholder="Write in your own words. A short, specific example is more useful than a perfect-sounding claim." className="w-full resize-y rounded-2xl border border-slate-700 bg-slate-950 p-4 text-base leading-7 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 sm:min-h-64" />
            <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-400"><span>{getWordCount(currentResponse)} words · {currentResponse.length} characters</span><span>Progress: {progress}/{attemptQuestions.length} answered</span></div>
          </div>
          <div>
            <button type="button" onClick={() => setShowExample((value) => !value)} className="inline-flex items-center gap-2 text-sm font-semibold text-amber-300 hover:text-amber-200"><Eye className="h-4 w-4" /> {showExample ? 'Hide educational example' : 'See an educational example'}</button>
            {showExample && (
              <div className="mt-3 space-y-3 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6">
                <p><strong className="text-rose-300">Vague example:</strong> “{example.vague}”</p>
                <p className="text-slate-300">{example.whyWeak} For this question, also consider: {currentQuestion.description}</p>
                <p><strong className="text-emerald-300">Illustrative example:</strong> “{example.improved}”</p>
                <p className="text-slate-300">{example.whyClearer} This is only an educational example—replace it with your own truthful experience; do not memorize it.</p>
              </div>
            )}
          </div>
          {!isSimulation && attemptQuestions.length > 1 && <div className="flex flex-wrap gap-2" aria-label="Question navigation">{attemptQuestions.map((question, index) => <button type="button" key={question.id} onClick={() => setAttempt((previous) => ({ ...previous, questionIndex: index }))} aria-label={`Go to question ${index + 1}`} aria-current={index === (attempt.questionIndex || 0) ? 'step' : undefined} className={`h-9 w-9 rounded-lg text-xs font-bold ${index === (attempt.questionIndex || 0) ? 'bg-amber-400 text-slate-950' : attempt.responses[question.id]?.trim() ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-800 text-slate-300'}`}>{index + 1}</button>)}</div>}
          <div className="flex flex-wrap justify-between gap-3 border-t border-slate-800 pt-4">
            <button type="button" disabled={(attempt.questionIndex || 0) === 0} onClick={() => moveQuestion(-1)} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Previous</button>
            <div className="flex gap-2">
              {(attempt.questionIndex || 0) < attemptQuestions.length - 1
                ? <button type="button" onClick={() => moveQuestion(1)} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950">Next <ArrowRight className="h-4 w-4" /></button>
                : <button type="button" onClick={() => setConfirmSubmit(true)} className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950">Submit when ready</button>}
            </div>
          </div>
          {confirmSubmit && <div role="alertdialog" aria-modal="true" aria-labelledby="sdt-submit-title" className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
            <h2 id="sdt-submit-title" className="font-bold text-amber-100">{isSimulation && progress < attemptQuestions.length ? 'Submit incomplete simulation?' : 'Submit your responses?'}</h2>
            <p className="mt-1 text-sm text-slate-300">After submission you cannot edit this attempt. {progress < attemptQuestions.length ? `${attemptQuestions.length - progress} question(s) are unanswered.` : 'You can review your answers and request educational feedback.'}</p>
            <div className="mt-3 flex gap-2"><button type="button" disabled={submissionPending} onClick={() => completeAttempt(false)} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{submissionPending ? 'Submitting…' : 'Confirm submission'}</button><button type="button" disabled={submissionPending} onClick={() => setConfirmSubmit(false)} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 disabled:opacity-50">Keep writing</button></div>
          </div>}
        </section>
      </div>
    );
  };

  function renderResult(selectedAttempt) {
    const savedAttempt = history.find((item) => item.id === selectedAttempt.id) || selectedAttempt;
    const feedback = savedAttempt.feedback;
    const questionsForResult = savedAttempt.questionIds.map((id) => questionById.get(id)).filter(Boolean);
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between"><button type="button" onClick={() => navigate('history')} className="inline-flex items-center gap-2 text-sm text-slate-300"><ArrowLeft className="h-4 w-4" /> History</button><span className="inline-flex items-center gap-2 rounded-full bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-200"><Check className="h-4 w-4" /> Submitted</span></div>
        {renderHeader('Practice review · not a selection score', savedAttempt.title, `Submitted ${new Date(savedAttempt.submittedAt || savedAttempt.startedAt).toLocaleString()}. Review your own writing and notice what you want to improve. This is not an official psychological assessment.`)}
        {savedAttempt.accountPersisted === false && <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm leading-6 text-amber-100">This attempt is saved on this device only; it is not in your account. {storageState.error || 'Configure the Supabase session and apply the database migration to enable account history.'}</p>}
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold text-slate-100">Your responses</h2>
          {questionsForResult.map((question, index) => <article key={question.id} className="space-y-2 border-b border-slate-800 pb-4 last:border-0"><p className="text-xs font-mono text-amber-300">{index + 1} · {question.category}</p><h3 className="font-semibold text-slate-100">{question.title}</h3><p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{savedAttempt.responses[question.id] || <span className="italic text-slate-500">No response provided.</span>}</p></article>)}
        </section>
        {!feedback ? <section className="space-y-4 rounded-2xl border border-sky-500/20 bg-slate-900 p-5">
          <div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-sky-300" /><div><h2 className="font-bold text-slate-100">Optional AI learning feedback</h2><p className="mt-1 text-sm leading-6 text-slate-400">Feedback is for communication and reflection only. It cannot diagnose personality, assign an official ISSB score, or predict selection. Your submitted answers will be sent to the configured AI service only if you opt in.</p></div></div>
          <label className="flex items-start gap-3 text-sm leading-6 text-slate-300"><input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} className="mt-1 accent-sky-400" />I understand my answers will be processed by the configured AI provider for educational feedback. I have removed details I do not want processed.</label>
          {!isSupabaseConfigured && <p className="text-xs text-amber-200">AI feedback requires the configured Supabase project and deployed Edge Function.</p>}
          {!user?.id && <p className="text-xs text-amber-200">A current Supabase visitor session is required for AI feedback.</p>}
          {feedbackState.error && <p role="alert" className="text-sm text-rose-300">{feedbackState.error}</p>}
          <button type="button" disabled={!aiConsent || feedbackState.loading || submissionPending || !user?.id || !isSupabaseConfigured || savedAttempt.accountPersisted === false} onClick={() => requestAiFeedback(savedAttempt)} className="inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{feedbackState.loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {feedbackState.loading ? 'Preparing feedback…' : 'Request AI feedback'}</button>
        </section> : <section className="space-y-5 rounded-2xl border border-sky-500/20 bg-slate-900 p-5">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-100"><Sparkles className="h-5 w-5 text-sky-300" /> Constructive learning feedback</h2>
          <p className="text-xs leading-5 text-slate-400">This is educational feedback, not a diagnosis, official ISSB score, or prediction of selection.</p>
          <FeedbackSections feedback={feedback} questions={questionsForResult} />
        </section>}
        <div className="flex flex-wrap gap-3"><button type="button" onClick={() => startAttempt({ mode: savedAttempt.mode, questionIds: savedAttempt.questionIds, durationMinutes: savedAttempt.durationMinutes, title: savedAttempt.title })} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950"><RotateCcw className="h-4 w-4" /> Practise this set again</button><button type="button" onClick={() => navigate('')} className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200">Self-Description home</button></div>
      </div>
    );
  }

  const renderHistory = () => (
    <div className="space-y-6">
      {renderHeader('Your learning record', 'Practice history', 'Revisit saved drafts, submitted answers, and feedback. Attempts are private to your account; on this device, drafts are also recovered from local storage.')}
      {storageState.loading ? <p role="status" className="text-sm text-slate-300">Loading your saved practice…</p> : history.length ? <div className="space-y-3">
        {history.map((item) => <article key={item.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:flex-row sm:items-center">
          <div><span className={`text-xs font-mono uppercase ${item.status === 'completed' ? 'text-emerald-300' : 'text-amber-300'}`}>{item.status === 'completed' ? 'Submitted' : 'Unfinished draft'} · {item.mode.replaceAll('-', ' ')}</span><h2 className="mt-1 font-bold text-slate-100">{item.title}</h2><p className="mt-1 text-xs text-slate-400">{new Date(item.startedAt).toLocaleString()} · {Object.values(item.responses || {}).filter((value) => value.trim()).length}/{item.questionIds.length} answered</p></div>
          <button type="button" onClick={() => {
            setAttempt({ ...item, questionIndex: 0 });
            navigate(item.status === 'completed' ? `results/${item.id}` : `practice/${item.id}`);
          }} className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100">{item.status === 'completed' ? 'Review responses' : 'Resume draft'}</button>
        </article>)}
      </div> : <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">No attempts saved yet. Your practice history will appear here after you begin.</div>}
      {storageState.error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-sm text-rose-200">{storageState.error}</p>}
      <button type="button" onClick={() => navigate('')} className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200">Back to Self-Description</button>
    </div>
  );

  if (page === 'results') {
    const selectedAttempt = history.find((item) => item.id === resultAttemptId) || (attempt?.id === resultAttemptId ? attempt : null);
    if (selectedAttempt?.status === 'completed') return <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">{renderResult(selectedAttempt)}</div>;
    if (storageState.loading) return <div role="status" className="mx-auto max-w-4xl px-4 py-10 text-slate-300">Loading submitted responses…</div>;
    return <div className="mx-auto max-w-4xl space-y-5 px-4 py-10"><p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 text-sm text-amber-100">That submitted attempt is not available in this account.</p><button type="button" onClick={() => navigate('history')} className="rounded-xl bg-slate-800 px-5 py-3 text-sm text-slate-100">Open practice history</button></div>;
  }
  if (page === 'practice') {
    const routeAttemptId = routeParts[1];
    if (routeAttemptId && attempt?.id !== routeAttemptId && storageState.loading) return <div role="status" className="mx-auto max-w-4xl px-4 py-10 text-slate-300">Restoring your saved practice…</div>;
    if (routeAttemptId && attempt?.id !== routeAttemptId) return <div className="mx-auto max-w-4xl space-y-4 px-4 py-10"><p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 text-sm text-amber-100">This saved practice is not available in the current browser session.</p><button type="button" onClick={() => navigate('history')} className="rounded-xl bg-slate-800 px-5 py-3 text-sm text-slate-100">Open practice history</button></div>;
    return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{renderPractice()}</div>;
  }
  if (page === 'questions') return <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">{renderQuestionBank()}</div>;
  if (page === 'simulation') return <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">{renderSimulationSetup()}</div>;
  if (page === 'history') return <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">{renderHistory()}</div>;
  return <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">{renderHome()}</div>;
}

function pickRandom(items, count) {
  const pool = [...items];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[randomIndex]] = [pool[randomIndex], pool[index]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

function FeedbackSections({ feedback, questions }) {
  const questionTitles = new Map(questions.map((question) => [question.id, question.title]));
  const dimensionTitles = {
    'self-awareness': 'Self-awareness',
    clarity: 'Clarity of expression',
    specificity: 'Specificity',
    'strength-recognition': 'Recognition of strengths',
    'weakness-recognition': 'Recognition of weaknesses',
    consistency: 'Consistency between answers',
    'development-goals': 'Personal development goals',
    reflection: 'Quality of reflection',
    relevance: 'Relevance to the question',
    'grammar-and-communication': 'Grammar and communication',
  };
  const sections = [
    ['Overall observations', feedback.overallObservations],
    ['Strong aspects', feedback.strongAspects],
    ['Areas to improve', feedback.areasForImprovement],
    ['Vague or repetitive statements', feedback.vagueOrRepetitive],
    ['Possible contradictions to review', feedback.possibleContradictions],
    ['Suggestions for more specific examples', feedback.specificitySuggestions],
    ['Personal development recommendations', feedback.developmentRecommendations],
  ];
  return <div className="space-y-5">
    {sections.map(([title, content]) => <section key={title}><h3 className="font-semibold text-slate-100">{title}</h3>{Array.isArray(content) ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-300">{content.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul> : <p className="mt-2 text-sm leading-6 text-slate-300">{content || 'No observation provided.'}</p>}</section>)}
    <section><h3 className="font-semibold text-slate-100">Reflection dimensions</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{(feedback.dimensionFeedback || []).map((item) => <article key={item.dimension} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><h4 className="text-sm font-semibold text-amber-200">{dimensionTitles[item.dimension] || item.dimension}</h4><p className="mt-2 text-sm leading-6 text-slate-300">{item.observation}</p><p className="mt-2 text-xs leading-5 text-slate-400">{item.suggestion}</p></article>)}</div></section>
    <section><h3 className="font-semibold text-slate-100">Individual question feedback</h3><div className="mt-2 space-y-3">{(feedback.questionFeedback || []).map((item) => <article key={item.questionId} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><h4 className="text-sm font-semibold text-amber-200">{questionTitles.get(item.questionId) || 'Response'}</h4><p className="mt-2 text-sm leading-6 text-slate-300">{item.feedback}</p></article>)}</div></section>
  </div>;
}
