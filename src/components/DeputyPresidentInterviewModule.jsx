import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Bookmark, Check, Clock3, ExternalLink, History, Lightbulb, Play, Search, ShieldCheck, Sparkles, Target, UserRound } from 'lucide-react';
import {
  DEPUTY_PRESIDENT_CATEGORIES,
  DEPUTY_PRESIDENT_CIVICS_LESSONS,
  DEPUTY_PRESIDENT_CURRENT_AFFAIRS_SOURCES,
  DEPUTY_PRESIDENT_FRAMEWORKS,
  DEPUTY_PRESIDENT_KNOWLEDGE_LESSONS,
  DEPUTY_PRESIDENT_QUESTIONS,
  DEPUTY_PRESIDENT_ROADMAP,
} from '../data/deputyPresidentInterview';
import { ensureAnonymousSession, isSupabaseConfigured, supabase } from '../lib/supabase';

const STORAGE_KEY = 'faujprep-deputy-president-interview-v1';
const DURATIONS = [10, 15, 20, 30];
const RAPID_RESPONSE_TIMES = [15, 30, 45, 60];
const SERVICES = ['Pakistan Army', 'Pakistan Navy', 'Pakistan Air Force'];
const AI_PROFILE_FIELDS = [
  'education',
  'qualification',
  'academicMarks',
  'favouriteSubjects',
  'hobbies',
  'sports',
  'books',
  'achievements',
  'leadershipExperience',
  'familyBackground',
  'careerMotivation',
  'previousAttempts',
  'strengths',
  'areasForImprovement',
  'preferredService',
];
const INTERVIEW_FOCI = [
  { id: 'all', label: 'A. Complete Interview — mixed categories', categoryIds: null },
  { id: 'personal', label: 'B. Personal Background', categoryIds: ['personal-introduction', 'family-social'] },
  { id: 'academic', label: 'C. Academic Background', categoryIds: ['education-academics'] },
  { id: 'motivation', label: 'D. Armed Forces Motivation', categoryIds: ['armed-forces-motivation'] },
  { id: 'military-awareness', label: 'E. Military Awareness', categoryIds: ['armed-forces-knowledge'] },
  { id: 'pakistan-studies', label: 'F. Pakistan Studies', categoryIds: ['pakistan-studies'] },
  { id: 'current-affairs', label: 'G. Current Affairs', categoryIds: ['current-affairs'] },
  { id: 'leadership', label: 'H. Leadership and Judgment', categoryIds: ['leadership-judgment'] },
  { id: 'general-knowledge', label: 'I. General Knowledge', categoryIds: ['general-knowledge-science'] },
  { id: 'mental-mathematics', label: 'J. Mental Mathematics', categoryIds: ['mental-mathematics'] },
  { id: 'challenging', label: 'K. Challenging Follow-ups', categoryIds: ['challenging-followups'] },
  { id: 'closing', label: 'L. Closing Interview', categoryIds: ['personal-introduction', 'armed-forces-motivation'] },
];
const PROFILE_FIELDS = [
  ['fullName', 'Full name'],
  ['education', 'Educational background'],
  ['institution', 'Institution'],
  ['qualification', 'Current qualification or semester'],
  ['academicMarks', 'Academic marks or CGPA'],
  ['favouriteSubjects', 'Favourite subjects'],
  ['hobbies', 'Hobbies'],
  ['sports', 'Sports'],
  ['books', 'Books read'],
  ['achievements', 'Achievements'],
  ['leadershipExperience', 'Leadership experience'],
  ['familyBackground', 'Family background (optional)'],
  ['careerMotivation', 'Career ambitions and motivation'],
  ['previousAttempts', 'Previous interview attempts'],
  ['strengths', 'Personal strengths'],
  ['areasForImprovement', 'Areas for improvement'],
];

const EMPTY_STATE = {
  profile: {},
  progress: {},
  roadmap: {},
  sessions: [],
  activeInterview: null,
};

function readLocalState() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      profile: stored.profile && typeof stored.profile === 'object' ? stored.profile : {},
      progress: stored.progress && typeof stored.progress === 'object' ? stored.progress : {},
      roadmap: stored.roadmap && typeof stored.roadmap === 'object' ? stored.roadmap : {},
      sessions: Array.isArray(stored.sessions) ? stored.sessions : [],
      activeInterview: stored.activeInterview && typeof stored.activeInterview === 'object' ? stored.activeInterview : null,
    };
  } catch (error) {
    return { ...EMPTY_STATE, error: `Could not read the saved device copy: ${error.message}` };
  }
}

function getLocalEvaluation(question, answer) {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const answerTokens = new Set(answer.toLowerCase().match(/\b[a-z]{4,}\b/g) || []);
  const questionTokens = new Set(question.toLowerCase().match(/\b[a-z]{4,}\b/g) || []);
  const overlaps = [...questionTokens].filter((token) => answerTokens.has(token)).length;
  const hasExample = /\b(for example|for instance|when i|i did|i learned|because|as a result)\b/i.test(answer);
  const dimensions = [
    { label: 'Relevance', score: Math.min(2, words.length >= 8 && overlaps > 0 ? 2 : words.length >= 5 ? 1 : 0), max: 2 },
    { label: 'Clarity and structure', score: Math.min(2, words.length >= 12 && /[.!?]/.test(answer) ? 2 : words.length >= 6 ? 1 : 0), max: 2 },
    { label: 'Specificity and evidence', score: Math.min(2, hasExample ? 2 : words.length >= 25 ? 1 : 0), max: 2 },
    { label: 'Conciseness', score: words.length >= 10 && words.length <= 120 ? 2 : words.length >= 5 && words.length <= 160 ? 1 : 0, max: 2 },
    { label: 'Reflection', score: /\b(learn|improv|realise|realize|responsib|next time|because)\w*/i.test(answer) ? 2 : words.length >= 15 ? 1 : 0, max: 2 },
  ];
  const advice = [];
  if (words.length < 10) advice.push('Add enough detail to explain your reason or next action.');
  if (!overlaps) advice.push('Answer the specific question directly before giving background.');
  if (!hasExample && question.startsWith('Describe')) advice.push('Support the claim with a genuine, specific example.');
  if (!/\b(learn|improv|realise|realize|next time)\w*/i.test(answer)) advice.push('Where relevant, add what you learned or would do next.');
  if (!advice.length) advice.push('Review whether every personal detail is accurate and whether your example answers the exact question.');
  return {
    score: dimensions.reduce((total, item) => total + item.score, 0),
    maxScore: 10,
    dimensions,
    whatWasGood: dimensions.filter((item) => item.score === item.max).map((item) => `${item.label}: your answer included enough detail for a useful practice response.`),
    needsImprovement: advice,
    missingInformation: !hasExample ? ['A concrete example, where the question calls for one.'] : [],
    suggestedFollowUp: question.startsWith('What would') ? 'What would be your first practical action, and why?' : 'What specific example best supports your answer?',
    kind: 'local-heuristic',
  };
}

function shuffle(items) {
  const values = [...items];
  for (let index = values.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [values[index], values[other]] = [values[other], values[index]];
  }
  return values;
}

function formatClock(seconds) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remainder = Math.max(0, seconds) % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

async function getFunctionErrorMessage(error) {
  const response = error?.context;
  if (response instanceof Response) {
    try {
      const body = await response.clone().json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      return error.message || 'The secure AI service returned an unreadable error.';
    }
  }
  return error?.message || 'The secure AI service is unavailable.';
}

function getDailyPreparationStreak(progress, roadmap, sessions) {
  const dateKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const shiftDateKey = (key, offset) => {
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    date.setDate(date.getDate() + offset);
    return dateKey(date);
  };
  const activeDates = new Set([
    ...Object.values(progress).map((item) => item?.updatedAt).filter(Boolean),
    ...Object.values(roadmap).filter((item) => item?.completed).map((item) => item.completedAt).filter(Boolean),
    ...sessions.map((item) => item.startedAt).filter(Boolean),
  ].map(dateKey).filter(Boolean));
  let cursor = dateKey(new Date());
  if (!activeDates.has(cursor) && activeDates.has(shiftDateKey(cursor, -1))) cursor = shiftDateKey(cursor, -1);
  let streak = 0;
  while (activeDates.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

function Panel({ title, icon: Icon = BookOpen, children, className = '' }) {
  return (
    <section className={`space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-7 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-2 text-amber-300"><Icon className="h-5 w-5" /></span>
        <h2 className="text-xl font-bold text-slate-100">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function DeputyPresidentInterviewModule({ routeSuffix = '', onNavigate, onBack }) {
  const routeParts = routeSuffix.split('/').filter(Boolean);
  const page = routeParts[0] || 'home';
  const routeQuestionId = routeParts[1] || null;
  const [profile, setProfile] = useState({});
  const [progress, setProgress] = useState({});
  const [roadmap, setRoadmap] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storageNotice, setStorageNotice] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedQuestionId, setSelectedQuestionId] = useState(routeQuestionId || DEPUTY_PRESIDENT_QUESTIONS[0].id);
  const [answerDraft, setAnswerDraft] = useState('');
  const [answerFeedback, setAnswerFeedback] = useState(null);
  const [learningAiFeedback, setLearningAiFeedback] = useState(null);
  const [learningAiConsent, setLearningAiConsent] = useState(false);
  const [learningAiState, setLearningAiState] = useState({ status: 'idle', error: null });
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [rapidSeconds, setRapidSeconds] = useState(30);
  const [service, setService] = useState('Pakistan Army');
  const [sessionMode, setSessionMode] = useState('complete');
  const [selectedInterviewCategory, setSelectedInterviewCategory] = useState('all');
  const [consentToAi, setConsentToAi] = useState(false);
  const [activeInterview, setActiveInterview] = useState(null);
  const [candidateAnswer, setCandidateAnswer] = useState('');
  const [turnFeedback, setTurnFeedback] = useState(null);
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [aiState, setAiState] = useState({ status: 'idle', error: null });
  const [currentAffairs, setCurrentAffairs] = useState([]);
  const [currentAffairsState, setCurrentAffairsState] = useState({ loading: false, error: null });
  const [activeKnowledgeTab, setActiveKnowledgeTab] = useState('armed-forces');
  const [saving, setSaving] = useState(false);
  const [sessionNotice, setSessionNotice] = useState(null);
  const rapidAdvanceLockRef = useRef(false);

  const selectedQuestion = useMemo(
    () => DEPUTY_PRESIDENT_QUESTIONS.find((item) => item.id === selectedQuestionId) || DEPUTY_PRESIDENT_QUESTIONS[0],
    [selectedQuestionId],
  );
  const filteredQuestions = useMemo(() => DEPUTY_PRESIDENT_QUESTIONS.filter((item) => {
    const matchesText = `${item.question} ${item.category}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchesDifficulty = difficulty === 'all' || item.difficulty === difficulty;
    return matchesText && matchesCategory && matchesDifficulty;
  }), [difficulty, search, selectedCategory]);
  const completedQuestionCount = Object.values(progress).filter((entry) => entry?.reviewed).length;
  const savedQuestionCount = Object.values(progress).filter((entry) => entry?.saved).length;
  const overallProgress = Math.round((completedQuestionCount / DEPUTY_PRESIDENT_QUESTIONS.length) * 100);
  const dailyStreak = getDailyPreparationStreak(progress, roadmap, history);
  const upcomingQuestion = DEPUTY_PRESIDENT_QUESTIONS.find((question) => !progress[question.id]?.reviewed) || DEPUTY_PRESIDENT_QUESTIONS[0];
  const askedCount = activeInterview?.responses?.length || 0;
  const currentQuestion = activeInterview?.questionIds?.[activeInterview.index]
    ? DEPUTY_PRESIDENT_QUESTIONS.find((item) => item.id === activeInterview.questionIds[activeInterview.index])
    : null;

  const navigate = useCallback((nextPage = 'home', detail = null) => {
    const suffix = detail ? `${nextPage}/${encodeURIComponent(detail)}` : nextPage === 'home' ? '' : nextPage;
    onNavigate?.(suffix);
  }, [onNavigate]);

  const persistLocal = useCallback((next) => {
    try {
      const previous = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...previous, ...next }));
    } catch (storageError) {
      setStorageNotice(`Your browser could not save this device copy: ${storageError.message}`);
    }
  }, []);

  const saveQuestionProgress = useCallback(async (questionId, patch) => {
    setSaving(true);
    setError(null);
    const updated = {
      ...progress,
      [questionId]: { ...(progress[questionId] || {}), ...patch, updatedAt: new Date().toISOString() },
    };
    setProgress(updated);
    persistLocal({ profile, progress: updated, roadmap, sessions: history });
    if (supabase && isSupabaseConfigured) {
      try {
        const sessionResult = await supabase.auth.getSession();
        const userId = sessionResult.data.session?.user.id;
        if (userId) {
          const item = updated[questionId];
          const { error: saveError } = await supabase.from('deputy_interview_question_progress').upsert({
            user_id: userId,
            question_id: questionId,
            saved_answer: item.answer || '',
            is_saved: Boolean(item.saved),
            is_reviewed: Boolean(item.reviewed),
          }, { onConflict: 'user_id,question_id' });
          if (saveError) throw saveError;
          setStorageNotice('Progress synced to your private account.');
        }
      } catch (saveError) {
        setStorageNotice(`Saved on this device only. Account sync failed: ${saveError.message}`);
      }
    } else {
      setStorageNotice('Saved on this device only. Configure Supabase to sync across devices.');
    }
    setSaving(false);
  }, [history, persistLocal, profile, progress, roadmap]);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const local = readLocalState();
      if (!active) return;
      setProfile(local.profile);
      setProgress(local.progress);
      setRoadmap(local.roadmap);
      setHistory(local.sessions);
      if (local.activeInterview?.status === 'in_progress') {
        setActiveInterview(local.activeInterview);
      }
      if (local.error) setStorageNotice(local.error);
      if (!isSupabaseConfigured || !supabase) {
        setStorageNotice(local.error || 'Saved on this device only. Configure Supabase to sync across devices.');
        setLoading(false);
        return;
      }
      try {
        let sessionResult = await supabase.auth.getSession();
        if (sessionResult.error) throw sessionResult.error;
        if (!sessionResult.data.session) {
          const anonymousSession = await ensureAnonymousSession();
          sessionResult = { data: { session: anonymousSession }, error: null };
        }
        const userId = sessionResult.data.session.user.id;
        const [profileResult, progressResult, roadmapResult, sessionsResult] = await Promise.all([
          supabase.from('deputy_interview_profiles').select('profile_json').eq('user_id', userId).maybeSingle(),
          supabase.from('deputy_interview_question_progress').select('question_id,saved_answer,is_saved,is_reviewed,updated_at').eq('user_id', userId).limit(500),
          supabase.from('deputy_interview_roadmap_progress').select('day_number,is_completed,completed_at').eq('user_id', userId).limit(14),
          supabase.from('deputy_interview_sessions')
            .select('id,mode,status,duration_minutes,service,question_ids,started_at,completed_at,feedback_json,responses:deputy_interview_responses(question_id,question_text,response_text,feedback_json)')
            .eq('user_id', userId)
            .order('started_at', { ascending: false })
            .limit(50),
        ]);
        if (!active) return;
        const missingTable = [profileResult, progressResult, roadmapResult, sessionsResult].find((item) => item.error)?.error;
        if (missingTable) {
          if (missingTable.code === 'PGRST205' || /schema cache|does not exist/i.test(missingTable.message || '')) {
            setStorageNotice('Account sync is not installed yet. Apply the Deputy President interview migration; local practice remains available.');
          } else {
            throw missingTable;
          }
        } else {
          const accountProgress = Object.fromEntries((progressResult.data || []).map((item) => [item.question_id, {
            answer: item.saved_answer || '',
            saved: item.is_saved,
            reviewed: item.is_reviewed,
            updatedAt: item.updated_at,
          }]));
          const accountRoadmap = Object.fromEntries((roadmapResult.data || []).map((item) => [item.day_number, {
            completed: item.is_completed,
            completedAt: item.completed_at,
          }]));
          const accountHistory = (sessionsResult.data || []).map((item) => ({
            id: item.id,
            mode: item.mode,
            status: item.status,
            durationMinutes: item.duration_minutes,
            service: item.service,
            questionIds: item.question_ids || [],
            startedAt: item.started_at,
            completedAt: item.completed_at,
            feedback: item.feedback_json || null,
            responses: (item.responses || []).map((response) => ({
              questionId: response.question_id,
              question: response.question_text,
              answer: response.response_text,
              feedback: response.feedback_json,
            })),
            accountPersisted: true,
          }));
          const mergedProgress = { ...local.progress, ...accountProgress };
          const mergedRoadmap = { ...local.roadmap, ...accountRoadmap };
          const mergedHistory = [...new Map([...accountHistory, ...local.sessions].map((session) => [session.id, session])).values()]
            .sort((left, right) => new Date(right.startedAt) - new Date(left.startedAt));
          setProfile(profileResult.data?.profile_json || local.profile);
          setProgress(mergedProgress);
          setRoadmap(mergedRoadmap);
          setHistory(mergedHistory);
          persistLocal({ profile: profileResult.data?.profile_json || local.profile, progress: mergedProgress, roadmap: mergedRoadmap, sessions: mergedHistory });
          setStorageNotice('Your private interview preparation data is loaded.');
        }
      } catch (restoreError) {
        if (active) setStorageNotice(`Account data could not be loaded: ${restoreError.message}`);
      } finally {
        if (active) setLoading(false);
      }
    };
    restore();
    return () => { active = false; };
  }, [persistLocal]);

  useEffect(() => {
    if (!selectedQuestion) return;
    setAnswerDraft(progress[selectedQuestion.id]?.answer || '');
    setAnswerFeedback(null);
    setLearningAiFeedback(null);
    setLearningAiState({ status: 'idle', error: null });
    setLearningAiConsent(false);
  }, [progress, selectedQuestion]);

  useEffect(() => {
    if (page !== 'learn' || !routeQuestionId || !DEPUTY_PRESIDENT_QUESTIONS.some((item) => item.id === routeQuestionId)) return;
    setSelectedQuestionId(routeQuestionId);
  }, [page, routeQuestionId]);

  useEffect(() => {
    if (!activeInterview || activeInterview.status !== 'in_progress' || !activeInterview.startedAt) return undefined;
    const updateTime = () => {
      const remaining = Math.max(0, activeInterview.durationSeconds - Math.floor((Date.now() - new Date(activeInterview.startedAt).getTime()) / 1000));
      if (activeInterview.mode === 'rapid') {
        const promptStartedAt = activeInterview.currentPromptStartedAt || activeInterview.startedAt;
        const promptRemaining = Math.max(0, activeInterview.rapidSeconds - Math.floor((Date.now() - new Date(promptStartedAt).getTime()) / 1000));
        setRemainingSeconds(Math.min(remaining, promptRemaining));
        if (remaining === 0) completeInterview(true);
        else if (promptRemaining === 0 && !rapidAdvanceLockRef.current) {
          rapidAdvanceLockRef.current = true;
          if (candidateAnswer.trim()) submitInterviewAnswer();
          else advanceInterview();
        }
      } else {
        setRemainingSeconds(remaining);
        if (remaining === 0) completeInterview(true);
      }
    };
    updateTime();
    const timer = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(timer);
  }, [activeInterview, candidateAnswer]);

  useEffect(() => {
    if (page !== 'current-affairs' || !supabase || !isSupabaseConfigured) return undefined;
    let active = true;
    setCurrentAffairsState({ loading: true, error: null });
    supabase.from('current_affairs')
      .select('id,title,slug,summary,content,category,published_at,source_name,source_url,last_verified_at,why_it_matters,interview_questions,verified_answer_guidance')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(20)
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          setCurrentAffairsState({ loading: false, error: loadError.code === '42703' || /last_verified_at|column/i.test(loadError.message)
            ? 'The current-affairs verification fields are not installed yet. Apply the Deputy President interview migration.'
            : `Current affairs could not be loaded: ${loadError.message}` });
          return;
        }
        setCurrentAffairs(data || []);
        setCurrentAffairsState({ loading: false, error: null });
      })
      .catch((loadError) => {
        if (active) setCurrentAffairsState({ loading: false, error: `Current affairs could not be loaded: ${loadError.message}` });
      });
    return () => { active = false; };
  }, [page]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    persistLocal({ profile, progress, roadmap, sessions: history });
    if (!supabase || !isSupabaseConfigured) {
      setStorageNotice('Profile saved on this device only. Configure Supabase to sync across devices.');
      setSaving(false);
      return;
    }
    try {
      const result = await supabase.auth.getSession();
      if (result.error) throw result.error;
      const userId = result.data.session?.user.id;
      if (!userId) throw new Error('An authenticated visitor session is required.');
      const { error: saveError } = await supabase.from('deputy_interview_profiles').upsert({
        user_id: userId,
        profile_json: profile,
      }, { onConflict: 'user_id' });
      if (saveError) throw saveError;
      setStorageNotice('Your profile is saved to your private account.');
    } catch (saveError) {
      setStorageNotice(`Profile saved on this device only. Account sync failed: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleRoadmapDay = async (dayNumber) => {
    const completed = !roadmap[dayNumber]?.completed;
    const updated = { ...roadmap, [dayNumber]: { completed, completedAt: completed ? new Date().toISOString() : null } };
    setRoadmap(updated);
    persistLocal({ profile, progress, roadmap: updated, sessions: history });
    if (supabase && isSupabaseConfigured) {
      try {
        const result = await supabase.auth.getSession();
        if (result.error) throw result.error;
        const userId = result.data.session?.user.id;
        if (userId) {
          const { error: saveError } = await supabase.from('deputy_interview_roadmap_progress').upsert({
            user_id: userId,
            day_number: dayNumber,
            is_completed: completed,
            completed_at: completed ? new Date().toISOString() : null,
          }, { onConflict: 'user_id,day_number' });
          if (saveError) throw saveError;
          setStorageNotice('Roadmap progress synced to your private account.');
        }
      } catch (syncError) {
        setStorageNotice(`Roadmap updated on this device, but account sync failed: ${syncError.message}`);
      }
    }
  };

  const saveLearningAnswer = async () => {
    await saveQuestionProgress(selectedQuestion.id, { answer: answerDraft });
  };

  const requestLearningAiFeedback = async () => {
    if (!learningAiConsent) {
      setLearningAiState({ status: 'unavailable', error: 'Enable consent before sending this answer for AI coaching.' });
      return;
    }
    if (!answerDraft.trim()) {
      setLearningAiState({ status: 'unavailable', error: 'Write an answer before requesting AI coaching.' });
      return;
    }
    if (answerDraft.trim().length > 2500) {
      setLearningAiState({ status: 'unavailable', error: 'AI coaching accepts answers up to 2,500 characters. Your local answer can be longer.' });
      return;
    }
    if (!supabase || !isSupabaseConfigured) {
      setLearningAiState({ status: 'unavailable', error: 'AI coaching needs the secure Supabase function to be deployed and configured.' });
      return;
    }
    setLearningAiState({ status: 'loading', error: null });
    setLearningAiFeedback(null);
    try {
      const auth = await supabase.auth.getSession();
      if (auth.error) throw auth.error;
      if (!auth.data.session) await ensureAnonymousSession();
      const { data, error: invokeError } = await supabase.functions.invoke('deputy-president-interview', {
        body: {
          action: 'review',
          question: selectedQuestion.question,
          answer: answerDraft.trim(),
          consentToAiProcessing: true,
        },
      });
      if (invokeError) throw invokeError;
      if (!data?.feedback) throw new Error('The AI service returned no answer feedback.');
      setLearningAiFeedback(data.feedback);
      setLearningAiState({ status: 'ready', error: null });
    } catch (requestError) {
      setLearningAiState({ status: 'unavailable', error: `AI coaching could not be completed: ${await getFunctionErrorMessage(requestError)}` });
    }
  };

  const startInterview = async () => {
    setError(null);
    setSessionNotice(null);
    setAiState({ status: 'idle', error: null });
    rapidAdvanceLockRef.current = false;
    const selectedFocus = INTERVIEW_FOCI.find((focus) => focus.id === selectedInterviewCategory) || INTERVIEW_FOCI[0];
    const matchesFocus = (item) => !selectedFocus.categoryIds || selectedFocus.categoryIds.includes(item.categoryId);
    const pool = DEPUTY_PRESIDENT_QUESTIONS.filter((item) =>
      matchesFocus(item)
      && !progress[item.id]?.reviewed,
    );
    const fallbackPool = DEPUTY_PRESIDENT_QUESTIONS.filter(matchesFocus);
    const chosen = shuffle(pool.length ? pool : fallbackPool);
    const questionIds = chosen.slice(0, sessionMode === 'rapid' ? 20 : Math.max(8, durationMinutes + 5)).map((item) => item.id);
    const id = globalThis.crypto?.randomUUID?.() || `local-${Date.now()}`;
    const startedAt = new Date().toISOString();
    const interview = {
      id,
      mode: sessionMode,
      durationMinutes,
      durationSeconds: durationMinutes * 60,
      rapidSeconds,
      service,
      categoryId: selectedInterviewCategory,
      questionIds,
      index: 0,
      responses: [],
      messages: [],
      status: 'in_progress',
      startedAt,
      accountPersisted: false,
      userId: null,
      aiEnabled: sessionMode === 'complete' && consentToAi,
    };
    if (supabase && isSupabaseConfigured) {
      try {
        let auth = await supabase.auth.getSession();
        if (auth.error) throw auth.error;
        if (!auth.data.session) {
          const anonymousSession = await ensureAnonymousSession();
          auth = { data: { session: anonymousSession }, error: null };
        }
        interview.userId = auth.data.session.user.id;
        const { error: createError } = await supabase.from('deputy_interview_sessions').insert({
          id,
          user_id: auth.data.session.user.id,
          mode: sessionMode,
          status: 'in_progress',
          duration_minutes: durationMinutes,
          service,
          category_id: selectedInterviewCategory === 'all' ? null : selectedInterviewCategory,
          question_ids: questionIds,
        });
        if (createError) throw createError;
        interview.accountPersisted = true;
      } catch (createError) {
        setSessionNotice(`This interview will remain on this device because account history could not be started: ${createError.message}`);
      }
    }
    setActiveInterview(interview);
    persistLocal({ profile, progress, roadmap, sessions: history, activeInterview: interview });
    setCandidateAnswer('');
    setTurnFeedback(null);
    setCurrentFeedback(null);
    setRemainingSeconds(durationMinutes * 60);
    navigate('session', id);
    if (interview.aiEnabled) {
      await requestAiTurn(interview, '', true);
    } else {
      setSessionNotice(sessionMode === 'rapid'
        ? 'Rapid-fire practice is running with locally selected questions; coaching feedback is heuristic.'
        : 'This is a non-AI practice simulation. Enable AI processing consent in settings to use the conversational interviewer.');
    }
  };

  const requestAiTurn = async (interview, response, isStart = false, retrying = false) => {
    if (!supabase || !isSupabaseConfigured) {
      const detail = 'AI practice needs the FaujPrep Supabase connection and deployed deputy-president-interview Edge Function.';
      setAiState({ status: 'unavailable', error: detail });
      setSessionNotice(detail);
      return null;
    }
    setAiState({ status: 'loading', error: null });
    setSessionNotice(null);
    try {
      let auth = await supabase.auth.getSession();
      if (auth.error) throw auth.error;
      if (!auth.data.session) {
        const visitorSession = await ensureAnonymousSession();
        auth = { data: { session: visitorSession }, error: null };
      }
      const { data, error: invokeError } = await supabase.functions.invoke('deputy-president-interview', {
        body: {
          action: 'turn',
          response,
          history: interview.messages,
          service: interview.service,
          category: INTERVIEW_FOCI.find((focus) => focus.id === interview.categoryId)?.label || 'Complete mixed interview',
          question: DEPUTY_PRESIDENT_QUESTIONS.find((item) => item.id === interview.questionIds[interview.index])?.question || '',
          questionPool: interview.questionIds.slice(interview.index, interview.index + 12).map((questionId) => {
            const item = DEPUTY_PRESIDENT_QUESTIONS.find((questionEntry) => questionEntry.id === questionId);
            return item ? { question: item.question, category: item.category } : null;
          }).filter(Boolean),
          profile: Object.fromEntries(AI_PROFILE_FIELDS
            .flatMap((key) => typeof profile[key] === 'string' && profile[key].trim() ? [[key, profile[key].trim().slice(0, 200)]] : [])),
          consentToAiProcessing: true,
        },
      });
      if (invokeError) throw invokeError;
      if (typeof data?.assistantMessage !== 'string' || !data.assistantMessage.trim()) {
        throw new Error('The interview service returned an empty interviewer response.');
      }
      const nextMessage = { role: 'assistant', content: data.assistantMessage };
      const nextMessages = [...interview.messages, ...(response ? [{ role: 'candidate', content: response }] : []), nextMessage];
      const nextIndex = !isStart && !retrying ? interview.index + 1 : interview.index;
      const nextInterview = { ...interview, index: nextIndex, currentPromptStartedAt: new Date().toISOString(), messages: nextMessages };
      persistLocal({ profile, progress, roadmap, sessions: history, activeInterview: nextInterview });
      setActiveInterview((previous) => previous?.id === interview.id ? nextInterview : previous);
      setTurnFeedback(data.feedback || null);
      setAiState({ status: 'ready', error: null });
      setSessionNotice('AI interviewer connected. Your replies are driving the next question.');
      if (data.ended) window.setTimeout(() => completeInterview(false, nextInterview), 0);
      else if (nextIndex >= nextInterview.questionIds.length) window.setTimeout(() => completeInterview(false, nextInterview), 0);
      return data;
    } catch (requestError) {
      const status = requestError.context?.status;
      const responseMessage = await getFunctionErrorMessage(requestError);
      const detail = status === 404
          ? 'The Deputy President AI function is not deployed to this Supabase project yet.'
          : status === 401
            ? 'Supabase rejected the visitor session. Refresh the page and start again.'
          : status === 429
            ? 'The AI request limit was reached. Wait a few minutes, then retry.'
              : responseMessage;
      setAiState({ status: 'unavailable', error: detail });
      setSessionNotice(`AI interview could not respond: ${detail} Your answers remain saved on this device. Retry AI or continue with guided local practice.`);
      if (!isStart || !interview.messages.length) {
        const fallbackIndex = !isStart && !retrying ? Math.min(interview.index + 1, interview.questionIds.length - 1) : interview.index;
        const localQuestion = DEPUTY_PRESIDENT_QUESTIONS.find((item) => item.id === interview.questionIds[fallbackIndex]);
        const nextMessage = {
          role: 'assistant',
          content: `AI interviewer is temporarily unavailable. ${localQuestion ? `Practice prompt: ${localQuestion.question}` : 'Please introduce yourself briefly.'}`,
        };
        const nextMessages = [...interview.messages, ...(response ? [{ role: 'candidate', content: response }] : []), nextMessage];
        const nextInterview = {
          ...interview,
          index: fallbackIndex,
          currentPromptStartedAt: new Date().toISOString(),
          messages: nextMessages,
        };
        persistLocal({ profile, progress, roadmap, sessions: history, activeInterview: nextInterview });
        setActiveInterview((previous) => previous?.id === interview.id ? nextInterview : previous);
      }
      return null;
    }
  };

  const submitInterviewAnswer = async () => {
    if (!candidateAnswer.trim() || !activeInterview) return;
    const question = currentQuestion;
    if (!question) return;
    const responseText = candidateAnswer.trim().slice(0, 2500);
    const feedback = getLocalEvaluation(question.question, responseText);
    const updatedResponses = [...activeInterview.responses, {
      questionId: question.id,
      question: question.question,
      answer: responseText,
      feedback,
    }];
    const updated = { ...activeInterview, responses: updatedResponses };
    setActiveInterview(updated);
    persistLocal({ profile, progress, roadmap, sessions: history, activeInterview: updated });
    setCandidateAnswer('');
    setCurrentFeedback(feedback);
    setTurnFeedback(null);
    await saveQuestionProgress(question.id, { answer: responseText, reviewed: true });
    if (activeInterview.accountPersisted && supabase) {
      const auth = await supabase.auth.getSession();
      const userId = auth.data.session?.user.id;
      if (userId) {
        const { error: insertError } = await supabase.from('deputy_interview_responses').insert({
          session_id: activeInterview.id,
          user_id: userId,
          question_id: question.id,
          question_text: question.question,
          response_text: responseText,
          feedback_json: feedback,
        });
        if (insertError) setSessionNotice(`Answer is retained in this session, but account history could not save it: ${insertError.message}`);
      }
    }
    if (activeInterview.aiEnabled) {
      await requestAiTurn(updated, responseText);
    } else {
      advanceInterview(updated);
    }
  };

  const advanceInterview = (interview = activeInterview) => {
    if (!interview) return;
    if (interview.index + 1 >= interview.questionIds.length) {
      completeInterview(false, interview);
      return;
    }
    rapidAdvanceLockRef.current = false;
    const advanced = { ...interview, index: interview.index + 1, currentPromptStartedAt: new Date().toISOString() };
    setActiveInterview(advanced);
    persistLocal({ profile, progress, roadmap, sessions: history, activeInterview: advanced });
    setCurrentFeedback(null);
    setTurnFeedback(null);
    setCandidateAnswer('');
  };

  async function completeInterview(timeExpired, interview = activeInterview) {
    if (!interview || interview.status !== 'in_progress') return;
    const completedAt = new Date().toISOString();
    const evaluation = interview.responses.map((item) => item.feedback);
    const score = evaluation.length
      ? Math.round(evaluation.reduce((total, item) => total + item.score, 0) / evaluation.length)
      : 0;
    const report = {
      score,
      maxScore: 10,
      answerCount: interview.responses.length,
      durationSeconds: Math.max(0, Math.floor((Date.now() - new Date(interview.startedAt).getTime()) / 1000)),
      dimensions: ['Relevance', 'Clarity and structure', 'Specificity and evidence', 'Conciseness', 'Reflection'],
      summary: 'This is a local practice rubric based on answer length and text signals. It does not verify facts, measure personality, or predict ISSB selection.',
      timeExpired,
      ai: null,
    };
    const completed = { ...interview, status: 'completed', completedAt, feedback: report };
    setActiveInterview(completed);
    setCurrentFeedback(null);
    setHistory((previous) => [completed, ...previous.filter((item) => item.id !== completed.id)].slice(0, 50));
    const updatedHistory = [completed, ...history.filter((item) => item.id !== completed.id)].slice(0, 50);
    persistLocal({ profile, progress, roadmap, sessions: updatedHistory, activeInterview: null });
    navigate('report', completed.id);
    if (completed.accountPersisted && supabase) {
      const auth = await supabase.auth.getSession();
      const userId = auth.data.session?.user.id;
      if (userId) {
        const { error: updateError } = await supabase.from('deputy_interview_sessions').update({
          status: 'completed',
          completed_at: completedAt,
          duration_seconds: report.durationSeconds,
          feedback_json: report,
        }).eq('id', completed.id).eq('user_id', userId);
        if (updateError) setSessionNotice(`Interview finished, but account history could not be updated: ${updateError.message}`);
      }
    }
    if (completed.aiEnabled && supabase && isSupabaseConfigured) {
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('deputy-president-interview', {
          body: {
            action: 'finish',
            history: completed.messages,
            responses: completed.responses.map((item) => ({ question: item.question, answer: item.answer })),
            consentToAiProcessing: true,
          },
        });
        if (invokeError) throw invokeError;
        const withAi = { ...report, ai: data.feedback };
        setActiveInterview((previous) => previous?.id === completed.id ? { ...previous, feedback: withAi } : previous);
        setHistory((previous) => previous.map((item) => item.id === completed.id ? { ...item, feedback: withAi } : item));
        persistLocal({ profile, progress, roadmap, sessions: updatedHistory.map((item) => item.id === completed.id ? { ...item, feedback: withAi } : item) });
      } catch (feedbackError) {
        setSessionNotice(`The interview is complete, but AI feedback could not be generated: ${await getFunctionErrorMessage(feedbackError)}. The local coaching report is available.`);
      }
    }
  }

  const loadCurrentAffairs = () => {
    if (!supabase || !isSupabaseConfigured) {
      setCurrentAffairsState({ loading: false, error: 'Current affairs require a configured Supabase connection.' });
      return;
    }
    setCurrentAffairsState({ loading: true, error: null });
    supabase.from('current_affairs')
      .select('id,title,slug,summary,content,category,published_at,source_name,source_url,last_verified_at,why_it_matters,interview_questions,verified_answer_guidance')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(20)
      .then(({ data, error: loadError }) => {
        if (loadError) setCurrentAffairsState({ loading: false, error: `Current affairs could not be loaded: ${loadError.message}` });
        else {
          setCurrentAffairs(data || []);
          setCurrentAffairsState({ loading: false, error: null });
        }
      })
      .catch((loadError) => setCurrentAffairsState({ loading: false, error: `Current affairs could not be loaded: ${loadError.message}` }));
  };

  const renderHeader = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button type="button" onClick={onBack || (() => navigate('home'))} className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-300">
            <ArrowLeft className="h-4 w-4" /> ISSB Preparation
          </button>
          <p className="text-xs font-mono uppercase tracking-[0.18em] text-amber-300">ISSB Interview Preparation</p>
          <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">Deputy President Interview Practice</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Independent educational practice. These prompts and feedback are not official ISSB material, selection criteria, or a prediction of outcome.</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-200">
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Private profile and practice history</span>
        </div>
      </div>
      <nav aria-label="Deputy President interview sections" className="flex gap-2 overflow-x-auto pb-2">
        {[
          ['home', 'Overview'], ['learn', 'Learning Mode'], ['configure', 'Mock Interview'], ['profile', 'My Profile'],
          ['knowledge', 'Knowledge'], ['current-affairs', 'Current Affairs'], ['roadmap', '14-Day Roadmap'], ['history', 'History'],
        ].map(([key, label]) => (
          <button key={key} type="button" onClick={() => navigate(key)} className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold ${page === key ? 'border-amber-400/50 bg-amber-500 text-slate-950' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-500/40'}`}>
            {label}
          </button>
        ))}
      </nav>
      {storageNotice ? <p role="status" className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-xs text-slate-400">{storageNotice}</p> : null}
      {error ? <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
      {sessionNotice ? <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">{sessionNotice}</p> : null}
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-7">
      <section className="grid gap-5 rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 p-6 sm:grid-cols-[1.4fr_1fr] sm:p-8">
        <div className="space-y-4">
          <p className="text-xs font-mono uppercase tracking-widest text-amber-300">A practical preparation workspace</p>
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Prepare with facts, reflection, and genuine examples.</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">Explore all 180 supplied practice questions, build your own answers, review source-backed knowledge, and run a timed interview simulation. Never memorise a sample as a personal story.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => { setSelectedQuestionId(upcomingQuestion.id); navigate('learn', upcomingQuestion.id); }} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950"><BookOpen className="h-4 w-4" /> Continue learning</button>
            <button type="button" onClick={() => navigate('configure')} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-white"><Play className="h-4 w-4" /> Start simulation</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Preparation progress', `${overallProgress}%`],
            ['Questions reviewed', `${completedQuestionCount} / ${DEPUTY_PRESIDENT_QUESTIONS.length}`],
            ['Saved questions', savedQuestionCount],
            ['Completed interviews', history.filter((item) => item.status === 'completed').length],
            ['Daily preparation streak', `${dailyStreak} ${dailyStreak === 1 ? 'day' : 'days'}`],
          ].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-2xl font-extrabold text-white">{value}</p></div>)}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Category progress" icon={Target}>
          <div className="space-y-4">
            {DEPUTY_PRESIDENT_CATEGORIES.map((category) => {
              const reviewed = DEPUTY_PRESIDENT_QUESTIONS.filter((item) => item.categoryId === category.id && progress[item.id]?.reviewed).length;
              const percent = Math.round((reviewed / category.count) * 100);
              return <button key={category.id} type="button" onClick={() => { setSelectedCategory(category.id); navigate('learn'); }} className="w-full text-left">
                <div className="mb-1 flex justify-between gap-3 text-xs"><span className="font-semibold text-slate-200">{category.title}</span><span className="text-slate-400">{reviewed}/{category.count}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-amber-400" style={{ width: `${percent}%` }} /></div>
              </button>;
            })}
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="Recommended next activity" icon={Lightbulb}>
            <p className="text-sm leading-6 text-slate-300">{upcomingQuestion.question}</p>
            <p className="text-xs text-slate-500">{upcomingQuestion.category}</p>
            <button type="button" onClick={() => { setSelectedQuestionId(upcomingQuestion.id); navigate('learn', upcomingQuestion.id); }} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950">Practise question <ArrowRight className="h-4 w-4" /></button>
          </Panel>
          <Panel title="Answer-building frameworks" icon={Sparkles}>
            <div className="space-y-3">
              {DEPUTY_PRESIDENT_FRAMEWORKS.map((framework) => <details key={framework.title} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-200">{framework.title}</summary>
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs leading-5 text-slate-400">{framework.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                <p className="mt-2 text-xs text-amber-200">{framework.note}</p>
              </details>)}
            </div>
          </Panel>
        </div>
      </div>
      <Panel title="Recent interview history" icon={History}>
        {history.length ? <div className="grid gap-3 sm:grid-cols-2">{history.slice(0, 4).map((item) => <button key={item.id} type="button" onClick={() => navigate('report', item.id)} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-left hover:border-amber-500/40"><p className="font-semibold text-slate-200">{item.mode === 'rapid' ? 'Rapid-fire practice' : 'Interview simulation'}</p><p className="mt-1 text-xs text-slate-400">{new Date(item.startedAt).toLocaleString('en-PK')} · {item.responses?.length || item.questionIds?.length || 0} responses</p></button>)}</div> : <p className="text-sm text-slate-400">No completed interviews yet. Start a simulation when you are ready.</p>}
      </Panel>
      {history.some((item) => item.status === 'completed' && Number.isFinite(item.feedback?.score)) ? <Panel title="Performance trend" icon={Target}>
        <div className="flex items-end gap-3 overflow-x-auto pb-2">
          {history.filter((item) => item.status === 'completed' && Number.isFinite(item.feedback?.score)).slice(0, 8).reverse().map((item) => <div key={item.id} className="flex min-w-14 flex-col items-center gap-2">
            <span className="text-[10px] text-slate-400">{item.feedback.score}/10</span>
            <div className="flex h-24 w-9 items-end overflow-hidden rounded-t-md bg-slate-800"><div className="w-full rounded-t-md bg-emerald-400" style={{ height: `${Math.max(4, item.feedback.score * 10)}%` }} /></div>
            <span className="text-[9px] text-slate-500">{item.completedAt ? new Date(item.completedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : 'Practice'}</span>
          </div>)}
        </div>
        <p className="text-xs text-slate-500">The chart uses the local answer-structure rubric only. It is not an official ISSB score, and changes do not indicate selection likelihood.</p>
      </Panel> : null}
    </div>
  );

  const renderLearning = () => (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <Panel title="Question bank" icon={Search}>
        <label className="block">
          <span className="sr-only">Search questions</span>
          <span className="relative block"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions…" className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white" /></span>
        </label>
        <label className="block text-xs text-slate-400">Difficulty
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">
            <option value="all">All levels</option><option value="easy">Easy</option><option value="moderate">Moderate</option><option value="challenging">Challenging</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setSelectedCategory('all')} className={`rounded-lg px-2.5 py-1.5 text-xs ${selectedCategory === 'all' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>All categories</button>
          {DEPUTY_PRESIDENT_CATEGORIES.map((category) => <button key={category.id} type="button" onClick={() => setSelectedCategory(category.id)} className={`rounded-lg px-2.5 py-1.5 text-left text-xs ${selectedCategory === category.id ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>{category.title} ({category.count})</button>)}
        </div>
        <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
          {filteredQuestions.map((question) => <button key={question.id} type="button" onClick={() => { setSelectedQuestionId(question.id); navigate('learn', question.id); }} className={`w-full rounded-xl border p-3 text-left text-xs leading-5 ${selectedQuestionId === question.id ? 'border-amber-500/50 bg-amber-950/20 text-amber-100' : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-600'}`}>
            <span className="flex items-start justify-between gap-2"><span>{question.question}</span>{progress[question.id]?.saved ? <Bookmark className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" /> : null}</span>
            <span className="mt-1 block text-[10px] text-slate-500">{question.category} · {progress[question.id]?.reviewed ? 'Reviewed' : question.difficulty}</span>
          </button>)}
          {!filteredQuestions.length ? <p className="p-3 text-sm text-slate-500">No questions match those filters.</p> : null}
        </div>
      </Panel>
      <div className="space-y-6">
        <Panel title={selectedQuestion.question} icon={BookOpen}>
          <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-slate-400">
            <span className="rounded-lg bg-slate-800 px-2 py-1">{selectedQuestion.category}</span>
            <span className="rounded-lg bg-slate-800 px-2 py-1">{selectedQuestion.difficulty}</span>
            <span className="rounded-lg bg-slate-800 px-2 py-1">{selectedQuestion.sourceClassification}</span>
          </div>
          {selectedQuestion.requiresCurrentVerification ? <p className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-100">This prompt asks about a fact that can change. Check a current source and state the date you verified it.</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><h3 className="text-sm font-bold text-amber-200">What the interviewer may explore</h3><p className="mt-2 text-sm leading-6 text-slate-300">{selectedQuestion.whatInterviewerExplores}</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><h3 className="text-sm font-bold text-amber-200">How to approach it</h3><p className="mt-2 text-sm leading-6 text-slate-300">{selectedQuestion.preparationGuidance}</p></div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><h3 className="text-sm font-bold text-slate-200">Suggested structure</h3><p className="mt-2 text-sm leading-6 text-slate-300">{selectedQuestion.suggestedAnswerStructure}</p><p className="mt-3 text-xs text-rose-200"><span className="font-bold">Avoid:</span> {selectedQuestion.commonMistakes}</p></div>
          <details className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-200">View illustrative weak and improved responses</summary>
            <p className="mt-3 text-sm leading-6 text-rose-200"><strong>Weak illustration:</strong> {selectedQuestion.weakAnswer}</p>
            <p className="mt-3 text-sm leading-6 text-emerald-200"><strong>Improved illustration:</strong> {selectedQuestion.improvedAnswer}</p>
            <p className="mt-3 text-xs leading-5 text-slate-400"><strong>Why it is clearer:</strong> {selectedQuestion.whyImproved}</p>
            <p className="mt-2 text-xs text-amber-200">Replace every bracketed prompt with your own accurate information. Never invent an experience, achievement, or personal fact.</p>
          </details>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="text-sm font-bold text-slate-200">Possible follow-up questions</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">{selectedQuestion.followUpQuestions.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </Panel>
        <Panel title="Write and review your answer" icon={Target}>
          <textarea value={answerDraft} onChange={(event) => setAnswerDraft(event.target.value)} rows={6} maxLength={4000} placeholder="Write an honest answer in your own words. Use real examples only." className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white placeholder:text-slate-500" />
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={saving} onClick={saveLearningAnswer} className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">{saving ? 'Saving…' : 'Save answer'}</button>
            <button type="button" onClick={() => saveQuestionProgress(selectedQuestion.id, { reviewed: !progress[selectedQuestion.id]?.reviewed })} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200"><Check className="h-4 w-4" />{progress[selectedQuestion.id]?.reviewed ? 'Mark not reviewed' : 'Mark reviewed'}</button>
            <button type="button" onClick={() => saveQuestionProgress(selectedQuestion.id, { saved: !progress[selectedQuestion.id]?.saved })} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200"><Bookmark className="h-4 w-4" />{progress[selectedQuestion.id]?.saved ? 'Unsave' : 'Save question'}</button>
            <button type="button" onClick={() => setAnswerFeedback(getLocalEvaluation(selectedQuestion.question, answerDraft))} className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 px-4 py-2.5 text-sm font-semibold text-emerald-200"><Sparkles className="h-4 w-4" />Get practice feedback</button>
            <button type="button" disabled={learningAiState.status === 'loading'} onClick={requestLearningAiFeedback} className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 px-4 py-2.5 text-sm font-semibold text-sky-200 disabled:opacity-50"><Sparkles className="h-4 w-4" />{learningAiState.status === 'loading' ? 'Getting AI coaching…' : 'Request AI feedback'}</button>
          </div>
          <label className="flex items-start gap-2 text-xs leading-5 text-slate-400"><input type="checkbox" checked={learningAiConsent} onChange={(event) => setLearningAiConsent(event.target.checked)} className="mt-1 accent-sky-400" />I consent to send this answer and question to FaujPrep’s configured AI provider for educational feedback. Avoid sensitive details; this is optional and is not an official assessment.</label>
          {learningAiState.error ? <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-100">{learningAiState.error}</p> : null}
          {learningAiFeedback ? <AiFeedbackCard feedback={learningAiFeedback} /> : null}
          {answerFeedback ? <FeedbackCard feedback={answerFeedback} /> : null}
        </Panel>
      </div>
    </div>
  );

  const renderConfigure = () => (
    <div className="mx-auto max-w-4xl space-y-6">
      <Panel title="Configure your practice interview" icon={Clock3}>
        <p className="text-sm leading-6 text-slate-400">These are FaujPrep simulation settings, not official ISSB interview durations. The question bank is educational and does not predict selection.</p>
        <p className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-4 text-sm leading-6 text-sky-100">For a real conversational simulation, choose Complete Interview and enable AI consent. The AI connection requires the Supabase Edge Function and server-side provider configuration. If it is unavailable, the session will show the reason and offer retry or guided local practice.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm text-slate-300">Practice format
            <select value={sessionMode} onChange={(event) => setSessionMode(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white"><option value="complete">Complete Interview</option><option value="rapid">Rapid-Fire Interview</option></select>
          </label>
          <label className="text-sm text-slate-300">Simulation duration
            <select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white">{DURATIONS.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select>
          </label>
          {sessionMode === 'rapid' ? <label className="text-sm text-slate-300">Response time per prompt
            <select value={rapidSeconds} onChange={(event) => setRapidSeconds(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white">{RAPID_RESPONSE_TIMES.map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds</option>)}</select>
          </label> : null}
          <label className="text-sm text-slate-300">Practice focus
            <select value={selectedInterviewCategory} onChange={(event) => setSelectedInterviewCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white">{INTERVIEW_FOCI.map((focus) => <option key={focus.id} value={focus.id}>{focus.label}</option>)}</select>
          </label>
          <label className="text-sm text-slate-300 sm:col-span-2">Service context
            <select value={service} onChange={(event) => setService(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white">{SERVICES.map((item) => <option key={item}>{item}</option>)}</select>
          </label>
        </div>
        {sessionMode === 'complete' ? <label className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
          <input type="checkbox" checked={consentToAi} onChange={(event) => setConsentToAi(event.target.checked)} className="mt-1 accent-amber-400" />
          <span><strong className="text-slate-100">Use the conversational AI interviewer.</strong> Your answers and selected profile details are sent to FaujPrep’s configured AI provider for follow-up and coaching. Do not include sensitive information. You can continue with the guided local simulation without AI.</span>
        </label> : <p className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">Rapid-fire mode uses short local prompts and does not send responses to an AI provider.</p>}
        <button type="button" onClick={startInterview} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950"><Play className="h-4 w-4" /> Start {sessionMode === 'rapid' ? 'rapid-fire' : consentToAi ? 'AI interview' : 'guided interview'}</button>
      </Panel>
    </div>
  );

  const renderSession = () => {
    if (!activeInterview) return <Panel title="No active interview"><p className="text-sm text-slate-400">Start a simulation from the interview settings page.</p><button type="button" onClick={() => navigate('configure')} className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950">Configure practice</button></Panel>;
    if (activeInterview.status === 'completed') return renderReport();
    const activeMessage = activeInterview.messages.at(-1);
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Panel title={activeInterview.mode === 'rapid' ? 'Rapid-Fire Interview' : 'Deputy President Interview Simulation'} icon={Clock3}>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div><p className="text-xs text-slate-400">{activeInterview.service} · {activeInterview.mode === 'rapid' ? 'Rapid-fire practice' : 'FaujPrep simulation'}</p><p className="mt-1 text-lg font-bold text-white">Time left {formatClock(remainingSeconds)}</p></div>
            <div className="text-right text-xs text-slate-400"><p>Question {Math.min(activeInterview.index + 1, activeInterview.questionIds.length)} of {activeInterview.questionIds.length}</p><p>{askedCount} responses recorded</p></div>
          </div>
          {activeInterview.aiEnabled ? <p role="status" className={`text-xs ${aiState.status === 'unavailable' ? 'text-amber-200' : 'text-slate-400'}`}>{aiState.status === 'loading' ? 'AI interviewer is considering your response…' : aiState.status === 'ready' ? 'AI interviewer connected. Your replies are driving the next question.' : aiState.error || 'Connecting to the AI interviewer…'}</p> : null}
          {currentQuestion ? <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 sm:p-7">
            <p className="text-xs font-mono uppercase text-amber-300">{currentQuestion.category}</p>
            {!activeInterview.aiEnabled ? <h2 className="mt-2 text-xl font-bold leading-8 text-white">{currentQuestion.question}</h2> : <p className="mt-2 text-sm text-slate-300">{activeInterview.messages.length ? 'The interviewer will adapt follow-up questions to your answer.' : 'Connecting you with the interviewer. Your opening question will appear here.'}</p>}
          </div> : null}
          {activeMessage ? <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4"><p className="text-[10px] font-mono uppercase text-emerald-300">Interviewer</p><p className="mt-2 text-sm leading-6 text-slate-200">{activeMessage.content}</p></div> : null}
          {currentFeedback ? <FeedbackCard feedback={currentFeedback} /> : null}
          {turnFeedback ? <AiFeedbackCard feedback={turnFeedback} /> : null}
          <label className="block text-sm font-semibold text-slate-200">Your answer
            <textarea value={candidateAnswer} onChange={(event) => setCandidateAnswer(event.target.value)} rows={5} maxLength={2500} placeholder="Answer in your own words. Use genuine examples and say when you are unsure." className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white placeholder:text-slate-500" />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={!candidateAnswer.trim() || aiState.status === 'loading' || (activeInterview.aiEnabled && !activeInterview.messages.length)} onClick={submitInterviewAnswer} className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">Submit answer</button>
            {!activeInterview.aiEnabled ? <button type="button" onClick={advanceInterview} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200">Skip to next question</button> : null}
            <button type="button" onClick={() => completeInterview(false)} className="rounded-xl border border-rose-500/30 px-4 py-2.5 text-sm font-semibold text-rose-200">End interview and review</button>
          </div>
          {activeInterview.aiEnabled && aiState.status === 'unavailable' ? <div className="flex flex-wrap gap-3 rounded-xl border border-amber-500/20 bg-amber-950/20 p-3">
            <button type="button" onClick={() => {
              const last = activeInterview.messages.at(-1);
              const retryInterview = last?.content.startsWith('AI interviewer is temporarily unavailable.')
                ? { ...activeInterview, messages: activeInterview.messages.slice(0, -1) }
                : activeInterview;
              requestAiTurn(retryInterview, '', false, true);
            }} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950">Retry AI interviewer</button>
            <button type="button" onClick={() => {
              const localInterview = { ...activeInterview, aiEnabled: false };
              setActiveInterview(localInterview);
              persistLocal({ profile, progress, roadmap, sessions: history, activeInterview: localInterview });
              setAiState({ status: 'idle', error: null });
              setSessionNotice('Continuing with guided local practice. Answers stay on this device unless account sync is configured.');
            }} className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200">Continue without AI</button>
          </div> : null}
        </Panel>
        <Panel title="Conversation so far" icon={History}>
          {activeInterview.messages.length ? <div className="max-h-80 space-y-3 overflow-y-auto">{activeInterview.messages.map((message, index) => <div key={`${message.role}-${index}`} className={`rounded-xl p-3 ${message.role === 'assistant' ? 'bg-slate-950' : 'bg-amber-950/20'}`}><p className="text-[10px] uppercase text-slate-500">{message.role === 'assistant' ? 'Interviewer' : 'Candidate'}</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{message.content}</p></div>)}</div> : <p className="text-sm text-slate-500">Your interview conversation will appear here.</p>}
        </Panel>
      </div>
    );
  };

  const renderReport = () => {
    const report = activeInterview?.feedback || history.find((item) => item.id === routeQuestionId)?.feedback;
    const responses = activeInterview?.responses || history.find((item) => item.id === routeQuestionId)?.responses || [];
    if (!report) return <Panel title="Interview report"><p className="text-sm text-slate-400">This report has not been saved in this device session. Open Interview History to view completed attempts.</p></Panel>;
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Panel title="Practice performance report" icon={Target}>
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm leading-6 text-amber-100">{report.summary || 'This report is educational coaching only. It is not an official ISSB score, personality assessment, or prediction of selection.'}</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Practice rubric" value={`${report.score ?? 0}/10`} />
            <Metric label="Answers recorded" value={report.answerCount ?? responses.length} />
            <Metric label="Practice time" value={formatClock(report.durationSeconds || 0)} />
          </div>
          {report.ai ? <AiFeedbackCard feedback={report.ai} /> : null}
          <p className="text-xs leading-5 text-slate-500">Automated local feedback relies on simple text signals and cannot verify factual accuracy or authenticity. Use the advice for reflection, not as an ISSB assessment.</p>
        </Panel>
        <Panel title="Review your responses" icon={BookOpen}>
          {responses.length ? <div className="space-y-4">{responses.map((item, index) => <article key={`${item.questionId}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><p className="text-xs font-semibold text-amber-200">{item.question}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.answer}</p><FeedbackCard feedback={item.feedback} /></article>)}</div> : <p className="text-sm text-slate-400">No answers were recorded in this session.</p>}
          <div className="flex flex-wrap gap-3"><button type="button" onClick={() => navigate('configure')} className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950">Start another simulation</button><button type="button" onClick={() => navigate('history')} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200">Interview history</button></div>
        </Panel>
      </div>
    );
  };

  const renderProfile = () => (
    <div className="mx-auto max-w-4xl">
      <Panel title="My interview profile" icon={UserRound}>
        <p className="text-sm leading-6 text-slate-400">This optional profile helps tailor practice. Keep it accurate and avoid sensitive information that is not needed. It is private to your account under the database policies.</p>
        <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
          {PROFILE_FIELDS.map(([key, label]) => <label key={key} className={`text-xs font-semibold text-slate-300 ${['careerMotivation', 'familyBackground', 'leadershipExperience', 'areasForImprovement', 'achievements'].includes(key) ? 'sm:col-span-2' : ''}`}>{label}
            <textarea value={profile[key] || ''} onChange={(event) => setProfile((previous) => ({ ...previous, [key]: event.target.value }))} rows={['careerMotivation', 'familyBackground', 'leadershipExperience', 'areasForImprovement', 'achievements'].includes(key) ? 3 : 2} maxLength={600} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-normal text-white" />
          </label>)}
          <label className="text-xs font-semibold text-slate-300 sm:col-span-2">Preferred service
            <select value={profile.preferredService || service} onChange={(event) => { setService(event.target.value); setProfile((previous) => ({ ...previous, preferredService: event.target.value })); }} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white">{SERVICES.map((item) => <option key={item}>{item}</option>)}</select>
          </label>
          <button type="submit" disabled={saving} className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{saving ? 'Saving…' : 'Save private profile'}</button>
        </form>
      </Panel>
    </div>
  );

  const renderRoadmap = () => (
    <div className="mx-auto max-w-4xl space-y-5">
      <Panel title="14-day preparation roadmap" icon={Target}>
        <p className="text-sm leading-6 text-slate-400">Mark each day complete when you have worked through its task. You can revisit or repeat any day.</p>
        <div className="space-y-3">
          {DEPUTY_PRESIDENT_ROADMAP.map((item) => <article key={item.day} className="flex gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${roadmap[item.day]?.completed ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-amber-300'}`}>{roadmap[item.day]?.completed ? <Check className="h-4 w-4" /> : item.day}</span>
            <div className="min-w-0 flex-1"><h3 className="font-bold text-slate-100">{item.title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{item.task}</p><div className="mt-2 flex flex-wrap gap-2">{item.categories.map((categoryId) => <span key={categoryId} className="rounded-md bg-slate-800 px-2 py-1 text-[10px] text-slate-300">{DEPUTY_PRESIDENT_CATEGORIES.find((category) => category.id === categoryId)?.title}</span>)}</div></div>
            <button type="button" aria-label={`${roadmap[item.day]?.completed ? 'Reopen' : 'Complete'} day ${item.day}`} onClick={() => toggleRoadmapDay(item.day)} className="self-center rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200">{roadmap[item.day]?.completed ? 'Reopen' : 'Complete'}</button>
          </article>)}
        </div>
      </Panel>
    </div>
  );

  const renderKnowledge = () => {
    const lessons = activeKnowledgeTab === 'armed-forces' ? DEPUTY_PRESIDENT_KNOWLEDGE_LESSONS : DEPUTY_PRESIDENT_CIVICS_LESSONS;
    return <div className="space-y-6">
      <div className="flex gap-2"><button type="button" onClick={() => setActiveKnowledgeTab('armed-forces')} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${activeKnowledgeTab === 'armed-forces' ? 'bg-amber-400 text-slate-950' : 'border border-slate-700 text-slate-300'}`}>Military knowledge</button><button type="button" onClick={() => setActiveKnowledgeTab('civics')} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${activeKnowledgeTab === 'civics' ? 'bg-amber-400 text-slate-950' : 'border border-slate-700 text-slate-300'}`}>Pakistan Studies and civics</button></div>
      <div className="grid gap-5 lg:grid-cols-2">{lessons.map((lesson) => <Panel key={lesson.title} title={lesson.title} icon={BookOpen}><p className="text-sm leading-6 text-slate-300">{lesson.summary}</p><p className="text-[10px] uppercase tracking-wide text-slate-500">Source guide · verify current details before use</p><div className="flex flex-wrap gap-2">{lesson.sources.map((source) => <a key={source.label} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs text-amber-200 hover:border-amber-500/50">{source.label}<ExternalLink className="h-3 w-3" /></a>)}</div></Panel>)}</div>
    </div>;
  };

  const renderCurrentAffairs = () => (
    <div className="space-y-6">
      <Panel title="Source-backed current affairs" icon={ExternalLink}>
        <p className="text-sm leading-6 text-slate-300">Stories are loaded from FaujPrep’s existing published current-affairs database. The editor must add a primary source, publication date, last-verified date, Pakistan relevance, interview prompts, and checked answer guidance. Time-sensitive facts are not hardcoded here.</p>
        <button type="button" disabled={currentAffairsState.loading} onClick={loadCurrentAffairs} className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 disabled:opacity-50">{currentAffairsState.loading ? 'Refreshing…' : 'Refresh published updates'}</button>
        {currentAffairsState.error ? <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-sm text-amber-100">{currentAffairsState.error}</p> : null}
        {!currentAffairsState.loading && !currentAffairsState.error && !currentAffairs.length ? <p className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">No published current-affairs updates are available. Check the trusted sources below and return after an editor publishes a verified item.</p> : null}
      </Panel>
      {currentAffairs.map((item) => <Panel key={item.id} title={item.title} icon={BookOpen}>
        <div className="flex flex-wrap gap-2 text-[10px] text-slate-400"><span>Published: {item.published_at ? new Date(item.published_at).toLocaleDateString('en-PK') : 'Not provided'}</span><span>Last verified: {item.last_verified_at ? new Date(item.last_verified_at).toLocaleDateString('en-PK') : 'Not recorded — verify before use'}</span><span>{item.category || 'General'}</span></div>
        <p className="text-sm leading-6 text-slate-300">{item.summary}</p>
        {item.why_it_matters ? <p className="text-sm leading-6 text-slate-300"><strong className="text-amber-200">Why it matters to Pakistan:</strong> {item.why_it_matters}</p> : <p className="text-xs text-slate-500">Pakistan relevance has not been recorded by an editor.</p>}
        {item.verified_answer_guidance ? <p className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-sm leading-6 text-emerald-100"><strong>Verified answer guidance:</strong> {item.verified_answer_guidance}</p> : <p className="text-xs text-slate-500">Verified answer guidance has not been recorded by an editor.</p>}
        {Array.isArray(item.interview_questions) && item.interview_questions.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">{item.interview_questions.map((question) => <li key={question}>{question}</li>)}</ul> : <p className="text-xs text-slate-500">No interview prompts are attached to this update.</p>}
        {item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-amber-200">{item.source_name || 'Open source'}<ExternalLink className="h-3 w-3" /></a> : <p className="text-xs text-rose-200">Source link missing — do not use this item as verified answer guidance.</p>}
      </Panel>)}
      <Panel title="Primary source starting points" icon={ExternalLink}>{DEPUTY_PRESIDENT_CURRENT_AFFAIRS_SOURCES.map((source) => <a key={source.label} href={source.url} target="_blank" rel="noreferrer" className="mr-2 inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs text-amber-200">{source.label}<ExternalLink className="h-3 w-3" /></a>)}</Panel>
    </div>
  );

  const renderHistory = () => (
    <Panel title="Interview history" icon={History}>
      {history.length ? <div className="space-y-3">{history.map((item) => <button key={item.id} type="button" onClick={() => { if (item.id === activeInterview?.id) navigate('report', item.id); else setSessionNotice('This saved attempt is listed in history; full answer playback is available only in the device session where it was completed.'); }} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-left">
        <span><strong className="block text-sm text-slate-100">{item.mode === 'rapid' ? 'Rapid-Fire Interview' : 'Complete Interview'} · {item.service || 'Service not selected'}</strong><span className="mt-1 block text-xs text-slate-400">{item.startedAt ? new Date(item.startedAt).toLocaleString('en-PK') : 'Practice session'}</span></span>
        <span className={`rounded-lg px-2 py-1 text-xs ${item.status === 'completed' ? 'bg-emerald-950/40 text-emerald-200' : 'bg-amber-950/40 text-amber-200'}`}>{item.status === 'completed' ? 'Completed' : 'In progress'}</span>
      </button>)}</div> : <p className="text-sm text-slate-400">Your completed simulations will appear here.</p>}
    </Panel>
  );

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-slate-400">Loading your private interview preparation data…</div>;

  return (
    <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
      {renderHeader()}
      {page === 'home' ? renderOverview()
        : page === 'learn' ? renderLearning()
          : page === 'configure' ? renderConfigure()
            : page === 'session' ? renderSession()
              : page === 'report' ? renderReport()
                : page === 'profile' ? renderProfile()
                  : page === 'roadmap' ? renderRoadmap()
                    : page === 'knowledge' ? renderKnowledge()
                      : page === 'current-affairs' ? renderCurrentAffairs()
                        : page === 'history' ? renderHistory()
                          : renderOverview()}
    </main>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-xl font-bold text-white">{value}</p></div>;
}

function FeedbackCard({ feedback }) {
  if (!feedback) return null;
  return <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-bold text-emerald-200">Practice feedback</h3><span className="text-xs text-slate-400">{feedback.score}/{feedback.maxScore} local practice rubric</span></div>
    {feedback.dimensions ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{feedback.dimensions.map((item) => <div key={item.label} className="flex justify-between gap-3 rounded-lg bg-slate-900 px-3 py-2 text-xs"><span className="text-slate-300">{item.label}</span><span className="text-emerald-200">{item.score}/{item.max}</span></div>)}</div> : null}
    {feedback.whatWasGood?.length ? <div className="mt-3"><p className="text-xs font-semibold text-emerald-200">What went well</p><ul className="mt-1 list-disc pl-5 text-xs leading-5 text-slate-300">{feedback.whatWasGood.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
    {feedback.needsImprovement?.length ? <div className="mt-3"><p className="text-xs font-semibold text-amber-200">Ways to improve</p><ul className="mt-1 list-disc pl-5 text-xs leading-5 text-slate-300">{feedback.needsImprovement.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
    {feedback.missingInformation?.length ? <div className="mt-3"><p className="text-xs font-semibold text-slate-300">Check whether you included</p><ul className="mt-1 list-disc pl-5 text-xs leading-5 text-slate-400">{feedback.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
    {feedback.suggestedFollowUp ? <p className="mt-3 text-xs text-slate-400"><strong>Possible follow-up:</strong> {feedback.suggestedFollowUp}</p> : null}
    <p className="mt-3 text-[10px] text-slate-500">Heuristic coaching only. It does not verify facts, authenticity, personality, or ISSB selection.</p>
  </div>;
}

function AiFeedbackCard({ feedback }) {
  if (!feedback) return null;
  const lists = [
    ['What was good', feedback.whatWasGood],
    ['Needs improvement', feedback.needsImprovement],
    ['Missing information', feedback.missingInformation],
    ['Suggestions', feedback.actionableAdvice],
  ];
  return <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-4">
    <h3 className="text-sm font-bold text-sky-200">AI coaching (educational)</h3>
    {feedback.summary ? <p className="mt-2 text-sm leading-6 text-slate-200">{feedback.summary}</p> : null}
    <div className="mt-3 grid gap-3 sm:grid-cols-2">{lists.filter(([, items]) => Array.isArray(items) && items.length).map(([label, items]) => <div key={label}><p className="text-xs font-semibold text-sky-100">{label}</p><ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-300">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}</div>
    {feedback.suggestedAnswerStructure ? <p className="mt-3 text-xs leading-5 text-slate-300"><strong>Answer structure:</strong> {feedback.suggestedAnswerStructure}</p> : null}
    {feedback.suggestedFollowUp ? <p className="mt-2 text-xs leading-5 text-slate-300"><strong>Possible follow-up:</strong> {feedback.suggestedFollowUp}</p> : null}
    <p className="mt-3 text-[10px] text-slate-500">AI coaching may be incomplete or mistaken. Verify facts independently; it is not an official score or a selection prediction.</p>
  </div>;
}
