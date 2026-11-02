import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Clock3, Mic, MicOff, Search, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { ensureAnonymousSession, isSupabaseConfigured, supabase } from '../lib/supabase';
import { PSYCHOLOGICAL_INTERVIEW_CATEGORIES, PSYCHOLOGICAL_INTERVIEW_QUESTIONS } from '../data/psychologicalInterviewQuestions';

const HISTORY_KEY = 'faujprep-psychological-interview-v1';
const RAPID_FIRE_SECONDS = [15, 30, 60];
const QUESTION_COUNTS = [5, 10, 15, 20];
const STORAGE_SETUP_MESSAGE = 'Interview storage is not installed yet. Apply supabase/migrations/060_issb_psychological_interview.sql; the question bank remains available.';

function isMissingInterviewSchema(error) {
  return error?.code === 'PGRST205' || /could not find the table .* in the schema cache/i.test(error?.message || '');
}

function readLocalHistory() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function makeId() {
  return crypto.randomUUID();
}

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function formatDuration(seconds = 0) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export default function PsychologicalInterviewModule({ routeSuffix = '', onNavigate, onBack }) {
  const routeParts = routeSuffix.split('/').filter(Boolean);
  const page = routeParts[0] || 'home';
  const routeId = routeParts[1] || null;
  const [userId, setUserId] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [messages, setMessages] = useState([]);
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(Boolean(isSupabaseConfigured));
  const [databaseReady, setDatabaseReady] = useState(false);
  const [error, setError] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [questionSearch, setQuestionSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [classificationFilter, setClassificationFilter] = useState('all');
  const [questionId, setQuestionId] = useState(PSYCHOLOGICAL_INTERVIEW_QUESTIONS[0].id);
  const [learningAnswer, setLearningAnswer] = useState('');
  const [showSample, setShowSample] = useState(false);
  const [rapidSeconds, setRapidSeconds] = useState(30);
  const [sessionLength, setSessionLength] = useState(10);
  const [rapidIndex, setRapidIndex] = useState(0);
  const [rapidAnswers, setRapidAnswers] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(30);
  const [candidateText, setCandidateText] = useState('');
  const [recording, setRecording] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const [recognitionAvailable, setRecognitionAvailable] = useState(false);
  const [results, setResults] = useState(null);
  const [savedResponses, setSavedResponses] = useState([]);
  const [aiConsent, setAiConsent] = useState(false);
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);
  const requestLockRef = useRef(false);
  const rapidFinishLockRef = useRef(false);
  const rapidAdvanceLockRef = useRef(false);
  const candidateTextRef = useRef('');

  const questionById = useMemo(() => new Map(PSYCHOLOGICAL_INTERVIEW_QUESTIONS.map((question) => [question.id, question])), []);
  const currentQuestion = questionById.get(questionId) || PSYCHOLOGICAL_INTERVIEW_QUESTIONS[0];
  const visibleQuestions = useMemo(() => PSYCHOLOGICAL_INTERVIEW_QUESTIONS.filter((question) => {
    const matchesText = `${question.text} ${question.category}`.toLowerCase().includes(questionSearch.trim().toLowerCase());
    return matchesText
      && (categoryFilter === 'all' || question.categoryId === categoryFilter)
      && (difficultyFilter === 'all' || question.difficulty === difficultyFilter)
      && (classificationFilter === 'all' || question.classification === classificationFilter);
  }), [categoryFilter, classificationFilter, difficultyFilter, questionSearch]);
  const attemptQuestions = useMemo(
    () => (activeAttempt?.questionIds || []).map((id) => questionById.get(id)).filter(Boolean),
    [activeAttempt, questionById],
  );
  const rapidQuestion = attemptQuestions[rapidIndex] || null;
  const categoryCoverage = useMemo(() => PSYCHOLOGICAL_INTERVIEW_CATEGORIES.map((category) => ({
    ...category,
    count: history.reduce((total, attempt) => total + (attempt.questionIds || []).filter((id) => questionById.get(id)?.categoryId === category.id).length, 0),
  })).sort((left, right) => left.count - right.count), [history, questionById]);

  const go = useCallback((suffix = '') => onNavigate?.(suffix), [onNavigate]);

  const persistHistory = useCallback((next) => {
    setHistory(next);
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(0, 100)));
    } catch (storageError) {
      setError(`Browser history could not be saved: ${storageError.message}`);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const localHistory = readLocalHistory();
      if (active) persistHistory(localHistory);
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        setError('Account history and interview sessions require Supabase. The question bank remains available on this device.');
        return;
      }
      try {
        const session = await ensureAnonymousSession();
        if (!active) return;
        const [attemptResult, profileResult] = await Promise.all([
          supabase.from('psychological_interview_attempts').select('id,mode,status,started_at,completed_at,duration_seconds,question_ids,feedback_json').eq('user_id', session.user.id).order('started_at', { ascending: false }).limit(100),
          supabase.from('psychological_candidate_profiles').select('profile_json').eq('user_id', session.user.id).maybeSingle(),
        ]);
        if (!active) return;
        if (isMissingInterviewSchema(attemptResult.error) || isMissingInterviewSchema(profileResult.error)) {
          setUserId(null);
          setDatabaseReady(false);
          setError(STORAGE_SETUP_MESSAGE);
          return;
        }
        if (attemptResult.error) throw new Error(`Could not load interview history: ${attemptResult.error.message}`);
        if (profileResult.error) throw new Error(`Could not load your optional profile: ${profileResult.error.message}`);
        setUserId(session.user.id);
        setDatabaseReady(true);
        const records = (attemptResult.data || []).map((attempt) => ({
          id: attempt.id,
          mode: attempt.mode,
          status: attempt.status,
          startedAt: attempt.started_at,
          completedAt: attempt.completed_at,
          durationSeconds: attempt.duration_seconds || 0,
          questionIds: attempt.question_ids || [],
          feedback: attempt.feedback_json || null,
          accountPersisted: true,
        }));
        const merged = [...records];
        for (const local of localHistory) if (!merged.some((saved) => saved.id === local.id)) merged.push(local);
        persistHistory(merged.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)));
        setProfile(profileResult.data?.profile_json || {});
        const routed = routeId ? merged.find((attempt) => attempt.id === routeId) : null;
        const resumable = routed || (['home', 'history'].includes(page) ? merged.find((attempt) => attempt.status === 'in_progress') : null);
        if (resumable) {
          setActiveAttempt(resumable);
          const [messageResult, responseResult] = await Promise.all([
            supabase.from('psychological_interview_messages')
              .select('id,role,content,question_id,created_at')
              .eq('attempt_id', resumable.id)
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: true })
              .limit(100),
            supabase.from('psychological_interview_responses')
              .select('question_id,category_id,question_text,response_text')
              .eq('attempt_id', resumable.id)
              .eq('user_id', session.user.id)
              .limit(100),
          ]);
          if (!active) return;
          if (messageResult.error) throw new Error(`Could not restore this conversation: ${messageResult.error.message}`);
          if (responseResult.error) throw new Error(`Could not restore saved answers: ${responseResult.error.message}`);
          setMessages(messageResult.data || []);
          setSavedResponses(responseResult.data || []);
        }
      } catch (initializationError) {
        if (active) setError(initializationError.message || 'Could not initialize psychological interview practice.');
      } finally {
        if (active) setLoading(false);
      }
    };
    initialize();
    return () => { active = false; };
  }, [page, persistHistory, routeId]);

  useEffect(() => {
    if (!userId || !supabase || page !== 'learn') return undefined;
    let active = true;
    supabase.from('psychological_interview_responses')
      .select('response_text')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error: responseError }) => {
        if (!active) return;
        if (responseError) setError(`Could not load your saved answer: ${responseError.message}`);
        else setLearningAnswer(data?.response_text || '');
      });
    return () => { active = false; };
  }, [page, questionId, userId]);

  useEffect(() => {
    if (!activeAttempt || activeAttempt.mode !== 'rapid-fire' || activeAttempt.status !== 'in_progress') return undefined;
    setRemainingSeconds(Math.max(0, rapidSeconds - Math.floor((Date.now() - new Date(activeAttempt.currentQuestionStartedAt || activeAttempt.startedAt).getTime()) / 1000)));
    const interval = window.setInterval(() => {
      const left = Math.max(0, rapidSeconds - Math.floor((Date.now() - new Date(activeAttempt.currentQuestionStartedAt || activeAttempt.startedAt).getTime()) / 1000));
      setRemainingSeconds(left);
      if (left === 0) moveRapidQuestion(candidateTextRef.current);
    }, 500);
    return () => window.clearInterval(interval);
  }, [activeAttempt, rapidIndex, rapidSeconds]);

  useEffect(() => {
    if (page === 'learn' && routeId && questionById.has(routeId)) {
      setQuestionId(routeId);
      setLearningAnswer('');
      setShowSample(false);
    }
  }, [page, questionById, routeId]);

  useEffect(() => {
    candidateTextRef.current = candidateText;
  }, [candidateText]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setRecognitionAvailable(Boolean(Recognition));
  }, []);

  useEffect(() => () => {
    recognitionRef.current?.abort();
  }, []);

  const saveLearningResponse = async () => {
    if (!learningAnswer.trim()) return setError('Write a response before saving it.');
    if (!userId || !supabase) {
      const local = { id: makeId(), mode: 'learning', status: 'completed', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), durationSeconds: 0, questionIds: [currentQuestion.id], answers: { [currentQuestion.id]: learningAnswer }, accountPersisted: false };
      persistHistory([local, ...history]);
      setError('Saved on this device only. Configure Supabase to sync learning answers across devices.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const savedAt = new Date().toISOString();
      const { data: createdAttempt, error: createError } = await supabase.from('psychological_interview_attempts').insert({
        user_id: userId,
        mode: 'learning',
        status: 'completed',
        question_ids: [currentQuestion.id],
        completed_at: savedAt,
      }).select('id').single();
      if (createError) throw createError;
      const attemptId = createdAttempt.id;
      const { error: saveError } = await supabase.from('psychological_interview_responses').upsert({
        attempt_id: attemptId,
        user_id: userId,
        question_id: currentQuestion.id,
        category_id: currentQuestion.categoryId,
        question_text: currentQuestion.text,
        response_text: learningAnswer,
      }, { onConflict: 'attempt_id,question_id' });
      if (saveError) {
        await supabase.from('psychological_interview_attempts').delete().eq('id', attemptId).eq('user_id', userId);
        throw saveError;
      }
      setError(null);
      const savedAttempt = { id: attemptId, mode: 'learning', status: 'completed', startedAt: savedAt, completedAt: savedAt, durationSeconds: 0, questionIds: [currentQuestion.id], accountPersisted: true };
      setActiveAttempt(savedAttempt);
      setSavedResponses((previous) => [...previous.filter((item) => item.question_id !== currentQuestion.id), {
        question_id: currentQuestion.id,
        category_id: currentQuestion.categoryId,
        question_text: currentQuestion.text,
        response_text: learningAnswer,
      }]);
      persistHistory([savedAttempt, ...history]);
      setAiStatus('Your answer is saved to your private account.');
    } catch (saveError) {
      setError(`Could not save your learning response: ${saveError.message}`);
    } finally {
      setBusy(false);
    }
  };

  const startSession = async (mode, selectedIds = [], options = {}) => {
    if (['mock', 'rapid-fire', 'voice', 'random', 'challenging', 'personalized'].includes(mode) && !aiConsent) {
      setError('Review and accept the AI processing notice before starting an AI interview or requesting AI feedback.');
      return;
    }
    if (!databaseReady) {
      setError(STORAGE_SETUP_MESSAGE);
      return;
    }
    setError(null);
    setAiStatus(null);
    setResults(null);
    setMessages([]);
    setCandidateText('');
    setRapidAnswers({});
    setRapidIndex(0);
    rapidFinishLockRef.current = false;
    setBusy(true);
    try {
      if (!isSupabaseConfigured || !supabase || !databaseReady) {
        setError(STORAGE_SETUP_MESSAGE);
        return;
      }
      let sessionUserId = userId;
      const session = await ensureAnonymousSession();
      sessionUserId = session.user.id;
      setUserId(sessionUserId);
      const start = new Date().toISOString();
      const localAttempt = {
        id: makeId(),
        mode,
        status: 'in_progress',
        startedAt: start,
        durationSeconds: 0,
        questionIds: selectedIds,
        accountPersisted: false,
        rapidSeconds: options.rapidSeconds || rapidSeconds,
        sessionLength: options.sessionLength || sessionLength,
      };
      const { data, error: createError } = await supabase.from('psychological_interview_attempts').insert({
        user_id: sessionUserId,
        mode,
        status: 'in_progress',
        question_ids: selectedIds,
        profile_snapshot: mode === 'personalized' ? profile : {},
      }).select('id,mode,status,started_at,question_ids').single();
      if (createError) throw createError;
      const attempt = { ...localAttempt, id: data.id, accountPersisted: true, mode: data.mode, startedAt: data.started_at, questionIds: data.question_ids || selectedIds };
      setActiveAttempt(attempt);
      persistHistory([attempt, ...history]);
      go(`${mode === 'personalized' ? 'mock' : mode}/${attempt.id}`);
      if (['mock', 'voice', 'random', 'challenging', 'personalized'].includes(mode)) {
        await requestAiTurn(attempt, '', true, options);
      }
    } catch (startError) {
      setError(`Could not start this interview session: ${startError.message}`);
    } finally {
      setBusy(false);
    }
  };

  const requestAiTurn = async (attempt = activeAttempt, candidateResponse = '', isStart = false, options = {}) => {
    if (!aiConsent) {
      setError('Consent to AI processing is required before sending interview content to the provider.');
      return;
    }
    if (!supabase || !attempt?.accountPersisted || requestLockRef.current) {
      setAiStatus('AI interview is not configured. Apply the database migration and deploy the psychological-interview Edge Function with a server-side provider key.');
      return;
    }
    requestLockRef.current = true;
    setBusy(true);
    setAiStatus(null);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('psychological-interview', {
        body: {
          action: 'turn',
          attemptId: attempt.id,
          response: candidateResponse,
          isStart,
          consentToAiProcessing: true,
          settings: {
            mode: attempt.mode,
            questionIds: attempt.questionIds,
            questionCount: options.sessionLength || attempt.sessionLength || sessionLength,
          },
        },
      });
      if (invokeError) {
        const detail = invokeError.message || 'Function invocation failed.';
        setAiStatus(`AI interviewer unavailable: ${detail}. Deploy the psychological-interview Edge Function and configure OPENAI_API_KEY and OPENAI_MODEL as server-side secrets.`);
        return;
      }
      if (!data?.assistantMessage || typeof data.assistantMessage !== 'string') throw new Error('The interview service returned no valid next question.');
      setMessages((previous) => [
        ...previous,
        ...(candidateResponse ? [{ id: makeId(), role: 'candidate', content: candidateResponse, created_at: new Date().toISOString() }] : []),
        { id: makeId(), role: 'assistant', content: data.assistantMessage, created_at: new Date().toISOString() },
      ]);
      const questionIds = data.questionId && !(attempt.questionIds || []).includes(data.questionId)
        ? [...(attempt.questionIds || []), data.questionId]
        : attempt.questionIds || [];
      const updatedAttempt = { ...attempt, questionIds };
      setActiveAttempt((previous) => previous?.id === attempt.id ? updatedAttempt : previous);
      persistHistory(history.map((item) => item.id === attempt.id ? { ...item, questionIds } : item));
      setCandidateText('');
      setAiStatus(null);
      if (data.completed && data.feedback) {
        setResults(data.feedback);
        setActiveAttempt((previous) => previous?.id === attempt.id ? { ...previous, status: 'completed', completedAt: new Date().toISOString(), feedback: data.feedback } : previous);
        persistHistory(history.map((item) => item.id === attempt.id ? { ...item, status: 'completed', completedAt: new Date().toISOString(), feedback: data.feedback } : item));
        go(`results/${attempt.id}`);
      }
    } catch (requestError) {
      setError(`The next interview turn could not be generated: ${requestError.message}. Your previous messages remain saved; retry when the service is available.`);
    } finally {
      requestLockRef.current = false;
      setBusy(false);
    }
  };

  const sendCandidateResponse = async () => {
    const response = candidateText.trim();
    if (!response) return setError('Enter an answer before continuing.');
    if (response.length > 2500) return setError('Please keep each answer under 2,500 characters.');
    await requestAiTurn(activeAttempt, response, false);
  };

  const endInterview = async () => {
    if (!aiConsent) {
      setError('Consent to AI processing is required before generating the interview report.');
      return;
    }
    if (!activeAttempt || !supabase) {
      setError('A saved Supabase session is required to generate an interview report.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('psychological-interview', {
        body: { action: 'finish', attemptId: activeAttempt.id, consentToAiProcessing: true },
      });
      if (invokeError) throw invokeError;
      if (!data?.feedback) throw new Error('The interview service returned no report.');
      setResults(data.feedback);
      const completed = { ...activeAttempt, status: 'completed', completedAt: new Date().toISOString(), feedback: data.feedback };
      setActiveAttempt(completed);
      persistHistory(history.map((item) => item.id === completed.id ? completed : item));
      go(`results/${completed.id}`);
    } catch (finishError) {
      setError(`Could not finish the interview and generate feedback: ${finishError.message}`);
    } finally {
      setBusy(false);
    }
  };

  const saveCandidateProfile = async (event) => {
    event.preventDefault();
    if (!userId || !supabase) return setError('Configure Supabase to save a private candidate profile.');
    setBusy(true);
    setError(null);
    try {
      const { error: profileError } = await supabase.from('psychological_candidate_profiles').upsert({
        user_id: userId,
        profile_json: profile,
      }, { onConflict: 'user_id' });
      if (profileError) throw profileError;
      setAiStatus('Your optional profile is saved privately. You can edit or remove it at any time.');
    } catch (profileError) {
      setError(`Could not save your profile: ${profileError.message}`);
    } finally {
      setBusy(false);
    }
  };

  const deleteCandidateProfile = async () => {
    if (!userId || !supabase) return setError('Configure Supabase to delete the saved profile.');
    if (!window.confirm('Delete your saved optional candidate profile?')) return;
    setBusy(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase.from('psychological_candidate_profiles').delete().eq('user_id', userId);
      if (deleteError) throw deleteError;
      setProfile({});
      setAiStatus('Your saved optional profile has been deleted.');
    } catch (deleteError) {
      setError(`Could not delete the saved profile: ${deleteError.message}`);
    } finally {
      setBusy(false);
    }
  };

  const startRandomSession = () => {
    const levels = ['easy', 'moderate', 'challenging'].map((difficulty) => shuffle(
      PSYCHOLOGICAL_INTERVIEW_QUESTIONS.filter((question) => question.difficulty === difficulty),
    ));
    const selected = [];
    while (selected.length < sessionLength && levels.some((level) => level.length)) {
      for (const level of levels) {
        if (level.length && selected.length < sessionLength) selected.push(level.pop());
      }
    }
    startSession('random', selected.map((question) => question.id), { sessionLength });
  };

  const startRapidFire = () => {
    const categoryPools = PSYCHOLOGICAL_INTERVIEW_CATEGORIES.map((category) => shuffle(
      PSYCHOLOGICAL_INTERVIEW_QUESTIONS.filter((question) => question.categoryId === category.id),
    ));
    const selected = [];
    while (selected.length < sessionLength && categoryPools.some((category) => category.length)) {
      for (const category of categoryPools) {
        if (category.length && selected.length < sessionLength) selected.push(category.pop());
      }
    }
    const pool = selected.map((question) => question.id);
    setRapidSeconds(rapidSeconds);
    startSession('rapid-fire', pool, { rapidSeconds, sessionLength });
  };

  const saveRapidResponse = async (attempt, answers) => {
    if (!userId || !supabase) throw new Error('Supabase is required to save rapid-fire answers.');
    const responseRows = attempt.questionIds.map((id) => ({
      attempt_id: attempt.id,
      user_id: userId,
      question_id: id,
      category_id: questionById.get(id)?.categoryId,
      question_text: questionById.get(id)?.text,
      response_text: answers[id] || '',
    }));
    const { error: saveError } = await supabase.from('psychological_interview_responses').upsert(responseRows, { onConflict: 'attempt_id,question_id' });
    if (saveError) throw saveError;
  };

  const finishRapidFire = async (answers = rapidAnswers) => {
    if (!activeAttempt || rapidFinishLockRef.current) return;
    rapidFinishLockRef.current = true;
    setBusy(true);
    try {
      await saveRapidResponse(activeAttempt, answers);
      const seconds = Math.max(0, Math.floor((Date.now() - new Date(activeAttempt.startedAt).getTime()) / 1000));
      const { error: updateError } = await supabase.from('psychological_interview_attempts')
        .update({ status: 'completed', completed_at: new Date().toISOString(), duration_seconds: seconds })
        .eq('id', activeAttempt.id)
        .eq('user_id', userId);
      if (updateError) throw updateError;
      const completed = { ...activeAttempt, status: 'completed', completedAt: new Date().toISOString(), durationSeconds: seconds, answers };
      setActiveAttempt(completed);
      persistHistory(history.map((item) => item.id === completed.id ? completed : item));
      if (aiConsent) {
        const { data: report, error: feedbackError } = await supabase.functions.invoke('psychological-interview', {
          body: { action: 'finish', attemptId: completed.id, consentToAiProcessing: true },
        });
        if (feedbackError) setAiStatus(`Rapid-fire answers are saved, but AI coaching is unavailable: ${feedbackError.message}. Deploy the psychological-interview Edge Function and configure its provider secret.`);
        else if (report?.feedback) {
          setResults(report.feedback);
          const withFeedback = { ...completed, feedback: report.feedback };
          setActiveAttempt(withFeedback);
          persistHistory(history.map((item) => item.id === completed.id ? withFeedback : item));
        }
      } else {
        setAiStatus('Your answers are saved. AI coaching was not requested because you did not consent to provider processing.');
      }
      go(`results/${completed.id}`);
    } catch (finishError) {
      setError(`Could not save and complete rapid-fire practice: ${finishError.message}`);
    } finally {
      rapidFinishLockRef.current = false;
      setBusy(false);
    }
  };

  async function moveRapidQuestion(answer = candidateText) {
    if (!activeAttempt || activeAttempt.status !== 'in_progress' || rapidAdvanceLockRef.current) return;
    rapidAdvanceLockRef.current = true;
    const nextAnswers = { ...rapidAnswers, ...(rapidQuestion ? { [rapidQuestion.id]: answer } : {}) };
    setRapidAnswers(nextAnswers);
    setCandidateText('');
    try {
      if (rapidIndex + 1 >= attemptQuestions.length) {
        await finishRapidFire(nextAnswers);
        return;
      }
      if (rapidQuestion) {
        const { error: saveError } = await supabase.from('psychological_interview_responses').upsert({
          attempt_id: activeAttempt.id,
          user_id: userId,
          question_id: rapidQuestion.id,
          category_id: rapidQuestion.categoryId,
          question_text: rapidQuestion.text,
          response_text: nextAnswers[rapidQuestion.id] || '',
        }, { onConflict: 'attempt_id,question_id' });
        if (saveError) throw saveError;
        setSavedResponses((previous) => [...previous.filter((item) => item.question_id !== rapidQuestion.id), {
          question_id: rapidQuestion.id,
          category_id: rapidQuestion.categoryId,
          question_text: rapidQuestion.text,
          response_text: nextAnswers[rapidQuestion.id] || '',
        }]);
      }
    } catch (saveError) {
      setError(`Could not save this rapid-fire response: ${saveError.message}`);
      setCandidateText(nextAnswers[rapidQuestion?.id] || '');
      return;
    } finally {
      rapidAdvanceLockRef.current = false;
    }
    const nextIndex = rapidIndex + 1;
    setRapidIndex(nextIndex);
    setRemainingSeconds(rapidSeconds);
    setActiveAttempt((previous) => previous ? { ...previous, currentQuestionStartedAt: new Date().toISOString() } : previous);
  }

  const deleteAttempt = async (attempt) => {
    if (!window.confirm('Delete this practice session and its saved answers? This cannot be undone.')) return;
    if (attempt.accountPersisted && supabase && userId) {
      const { error: deleteError } = await supabase.from('psychological_interview_attempts').delete().eq('id', attempt.id).eq('user_id', userId);
      if (deleteError) return setError(`Could not delete the saved session: ${deleteError.message}`);
    }
    persistHistory(history.filter((item) => item.id !== attempt.id));
    if (activeAttempt?.id === attempt.id) setActiveAttempt(null);
    setError(null);
  };

  const startVoiceRecording = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return setSpeechError('Speech recognition is not available in this browser. You can type your answer instead.');
    try {
      const recognition = new Recognition();
      recognition.lang = 'en-PK';
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onresult = (event) => {
        let transcript = '';
        for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0].transcript;
        setCandidateText(transcript.slice(0, 2500));
      };
      recognition.onerror = (event) => {
        setRecording(false);
        setSpeechError(`Microphone or speech recognition error: ${event.error}. Check browser permissions or type your answer.`);
      };
      recognition.onend = () => setRecording(false);
      recognitionRef.current = recognition;
      recognition.start();
      setRecording(true);
      setSpeechError(null);
    } catch (recordingError) {
      setSpeechError(`Could not start speech recognition: ${recordingError.message}`);
    }
  };

  const stopVoiceRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  const header = (eyebrow, title, description) => (
    <header className="space-y-3 rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 p-6 sm:p-9">
      <p className="text-xs font-mono uppercase tracking-[0.18em] text-amber-300">{eyebrow}</p>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">{title}</h1>
      <p className="max-w-3xl text-sm leading-7 text-slate-300">{description}</p>
    </header>
  );

  const issueNotice = error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-sm leading-6 text-rose-200">{error}</p>;
  const statusNotice = aiStatus && <p role="status" className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-4 text-sm leading-6 text-sky-200">{aiStatus}</p>;
  const backButton = <button type="button" onClick={() => go('')} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200"><ArrowLeft className="h-4 w-4" /> Psychological interview home</button>;

  const renderQuestionFilters = () => (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input aria-label="Search interview questions" value={questionSearch} onChange={(event) => setQuestionSearch(event.target.value)} placeholder="Search 150 interview questions" className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm text-slate-100 outline-none focus:border-amber-400" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-200"><option value="all">All categories</option>{PSYCHOLOGICAL_INTERVIEW_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        <select aria-label="Filter by difficulty" value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-200"><option value="all">All difficulty levels</option><option value="easy">Easy</option><option value="moderate">Moderate</option><option value="challenging">Challenging</option></select>
        <select aria-label="Filter by classification" value={classificationFilter} onChange={(event) => setClassificationFilter(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-200"><option value="all">All question types</option><option value="commonly-reported">Commonly reported</option><option value="personal-background">Personal background</option><option value="extended-practice">Extended practice</option><option value="situational-practice">Situational practice</option><option value="challenging-follow-up">Challenging follow-up</option></select>
      </div>
    </section>
  );

  const renderLearningQuestion = () => (
    <div className="space-y-6">
      {header('Learning mode · your experience first', 'Question practice', 'Read why the question is useful, consider the guidance, then write an honest answer in your own words. Samples are illustrative, not scripts to memorize.')}
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="learning-question">Choose a question</label>
          <select id="learning-question" value={questionId} onChange={(event) => { setQuestionId(event.target.value); setLearningAnswer(''); setShowSample(false); }} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100">{PSYCHOLOGICAL_INTERVIEW_QUESTIONS.map((question) => <option key={question.id} value={question.id}>{question.category}: {question.text}</option>)}</select>
          <p className="text-sm text-slate-400">{currentQuestion.category} · {currentQuestion.difficulty} · {currentQuestion.classification.replaceAll('-', ' ')}</p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/15 p-4"><h2 className="font-bold text-amber-100">Why practise this?</h2><p className="mt-2 text-sm leading-6 text-slate-300">{currentQuestion.explanation}</p></div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4"><h2 className="font-bold text-slate-200">Preparation guidance</h2><p className="mt-2 text-sm leading-6 text-slate-300">{currentQuestion.guidance}</p></div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-4"><h2 className="font-bold text-rose-100">Common mistake</h2><p className="mt-2 text-sm leading-6 text-slate-300">{currentQuestion.commonMistake}</p><p className="mt-3 text-xs text-slate-400"><strong>Weak illustration:</strong> “{currentQuestion.weakResponse}”</p><p className="mt-2 text-xs leading-5 text-slate-400">{currentQuestion.weakExplanation}</p></div>
          <div className="rounded-xl border border-sky-500/20 bg-sky-950/10 p-4"><h2 className="font-bold text-sky-100">Possible follow-ups</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">{currentQuestion.followUps.map((followUp) => <li key={followUp}>{followUp}</li>)}</ul></div>
        </section>
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div><p className="text-xs font-mono uppercase tracking-widest text-emerald-300">Practice response</p><h2 className="mt-2 text-xl font-bold text-slate-100">{currentQuestion.text}</h2></div>
          <textarea ref={textareaRef} value={learningAnswer} onChange={(event) => setLearningAnswer(event.target.value)} rows={10} maxLength={5000} placeholder="Use a real example: what happened, what you did, and what you learned." className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-slate-100 outline-none focus:border-amber-400" />
          <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500">{learningAnswer.length}/5000</span><button type="button" disabled={busy || !learningAnswer.trim()} onClick={saveLearningResponse} className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{busy ? 'Saving…' : 'Save answer privately'}</button></div>
          {statusNotice}
          <button type="button" onClick={() => setShowSample((visible) => !visible)} className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200">{showSample ? 'Hide illustrative response' : 'View illustrative response'}</button>
          {showSample && <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4"><h3 className="font-bold text-emerald-100">Illustration only—not a script</h3><p className="text-sm leading-6 text-slate-300">{currentQuestion.sampleResponse}</p><p className="text-xs text-slate-500">Replace the bracketed parts with truthful experiences. Do not copy this answer as your own.</p></div>}
        </section>
      </div>
      {backButton}
    </div>
  );

  const renderQuestionBank = () => (
    <div className="space-y-6">
      {header('150 prompts · 15 categories', 'Psychological interview question bank', 'The bank blends commonly reported prompts, personal-background questions, extended practice, situational exercises, and challenging follow-ups. The list is not an official or exhaustive ISSB paper.')}
      {renderQuestionFilters()}
      <p className="text-sm text-slate-400" role="status">Showing {visibleQuestions.length} of {PSYCHOLOGICAL_INTERVIEW_QUESTIONS.length} questions</p>
      <div className="grid gap-3 md:grid-cols-2">{visibleQuestions.map((question) => <article key={question.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5"><div><p className="text-xs font-mono text-amber-300">{question.category} · {question.difficulty} · {question.classification.replaceAll('-', ' ')}</p><h2 className="mt-2 font-semibold leading-6 text-slate-100">{question.text}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">{question.explanation}</p></div><button type="button" onClick={() => { setQuestionId(question.id); setLearningAnswer(''); setShowSample(false); go(`learn/${question.id}`); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100">Practise this question <ArrowRight className="h-4 w-4" /></button></article>)}</div>
      {backButton}
    </div>
  );

  const renderInterview = () => (
    <div className="mx-auto max-w-4xl space-y-6">
      {header(`AI mock · ${activeAttempt?.mode || 'practice'}`, 'Interview conversation', 'A dynamic educational practice conversation, not an actual ISSB psychologist, official simulator, selection score, or prediction. You may end the session whenever you wish.')}
      {statusNotice}
      <label className="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-950/10 p-4 text-sm leading-6 text-slate-300"><input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} className="mt-1 accent-sky-400" />I consent to sending this conversation to the configured AI provider for interview practice and feedback.</label>
      <section aria-live="polite" className="max-h-[55vh] min-h-64 space-y-4 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        {messages.length === 0 && <p className="text-sm text-slate-400">Waiting for the interview service. It will greet you and ask one question at a time; it will not show a fixed answer key.</p>}
        {messages.map((message) => <article key={message.id} className={`max-w-[90%] rounded-2xl p-4 ${message.role === 'assistant' ? 'border border-amber-500/20 bg-slate-950 text-slate-100' : 'ml-auto bg-emerald-950/50 text-emerald-50'}`}><p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-slate-400">{message.role === 'assistant' ? 'FaujPrep practice interviewer' : 'Your answer'}</p><p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p></article>)}
      </section>
      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
        {page === 'voice' && <div className="flex flex-wrap gap-2"><button type="button" onClick={recording ? stopVoiceRecording : startVoiceRecording} disabled={!recognitionAvailable && !recording} className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${recording ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-100'}`}>{recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}{recording ? 'Stop speaking' : 'Start voice transcription'}</button><span className="self-center text-xs text-slate-400">{recording ? 'Listening…' : recognitionAvailable ? 'Browser speech recognition; review before sending.' : 'Speech recognition unavailable; type below.'}</span></div>}
        {speechError && <p role="alert" className="text-sm text-rose-300">{speechError}</p>}
        <textarea value={candidateText} onChange={(event) => setCandidateText(event.target.value)} rows={4} maxLength={2500} placeholder={page === 'voice' ? 'Your transcription appears here; you can edit it or type instead.' : 'Type your answer in your own words…'} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-slate-100 outline-none focus:border-amber-400" />
        <div className="flex flex-wrap justify-between gap-3"><span className="self-center text-xs text-slate-500">{candidateText.length}/2500</span><div className="flex flex-wrap gap-2">{aiStatus?.startsWith('AI interviewer unavailable') && <button type="button" disabled={busy || !aiConsent} onClick={() => requestAiTurn(activeAttempt, '', false)} className="rounded-xl border border-sky-500/30 px-4 py-3 text-sm font-semibold text-sky-200 disabled:opacity-50">Retry next question</button>}<button type="button" disabled={busy || !aiConsent} onClick={endInterview} className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 disabled:opacity-50">End and review</button><button type="button" disabled={busy || !aiConsent || !candidateText.trim()} onClick={sendCandidateResponse} className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{busy ? 'Thinking…' : 'Send answer'}</button></div></div>
      </section>
      {issueNotice}
    </div>
  );

  const renderRapidFire = () => (
    <div className="mx-auto max-w-3xl space-y-6">
      {header('Rapid-fire · answer in your own words', 'Short-answer interview practice', 'A local countdown gives each answer a short time limit. Your responses are saved privately to your account when you advance or finish.')}
      {rapidQuestion ? <section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
        <div className="flex items-center justify-between"><p className="text-xs font-mono uppercase text-amber-300">Question {rapidIndex + 1} of {attemptQuestions.length}</p><div role="timer" className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-2 font-bold tabular-nums text-amber-200"><Clock3 className="mr-2 inline h-4 w-4" />{remainingSeconds}s</div></div>
        <h2 className="text-2xl font-bold leading-relaxed text-slate-100">{rapidQuestion.text}</h2>
        <textarea value={candidateText} onChange={(event) => setCandidateText(event.target.value)} maxLength={2500} rows={5} placeholder="Answer briefly and directly…" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-slate-100" />
        <div className="flex justify-end"><button type="button" disabled={busy} onClick={moveRapidQuestion} className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950">{rapidIndex + 1 === attemptQuestions.length ? 'Finish and save' : 'Save and next'}</button></div>
      </section> : <p role="status" className="text-sm text-slate-300">Choose a rapid-fire session from the home screen.</p>}
      {issueNotice}
      {backButton}
    </div>
  );

  const renderProfile = () => (
    <div className="mx-auto max-w-4xl space-y-6">
      {header('Optional · you control what to share', 'Personalized interview profile', 'Share only details you are comfortable using for tailored practice. Avoid sensitive identifiers, exact addresses, or private information about other people.')}
      <form onSubmit={saveCandidateProfile} className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2">
        {[
          ['education', 'Educational background'],
          ['qualification', 'Current qualification'],
          ['favouriteSubjects', 'Favourite subjects'],
          ['academicMarks', 'Academic marks (optional)'],
          ['familyBackground', 'Family background (brief)'],
          ['hobbies', 'Hobbies and interests'],
          ['sports', 'Sports'],
          ['achievements', 'Achievements'],
          ['careerAmbitions', 'Career ambitions'],
          ['strengths', 'Strengths'],
          ['weaknesses', 'Areas to improve'],
          ['preferredService', 'Preferred service'],
          ['experiences', 'Relevant personal experiences'],
        ].map(([field, label]) => <label key={field} className="space-y-2 text-sm text-slate-300"><span>{label}</span><textarea rows={field === 'familyBackground' || field === 'experiences' ? 3 : 2} maxLength={600} value={profile[field] || ''} onChange={(event) => setProfile((previous) => ({ ...previous, [field]: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100" /></label>)}
        <label className="flex items-start gap-3 text-sm leading-6 text-slate-300 sm:col-span-2"><input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} className="mt-1 accent-sky-400" />I consent to sending the profile details I chose and my interview answers to the configured AI provider for educational follow-up questions.</label>
        <div className="flex flex-wrap gap-2 sm:col-span-2"><button type="submit" disabled={busy || !databaseReady} className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">Save optional profile</button><button type="button" onClick={() => setProfile({})} className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200">Clear fields</button><button type="button" onClick={deleteCandidateProfile} disabled={busy || !databaseReady} className="rounded-xl border border-rose-500/30 px-4 py-3 text-sm font-semibold text-rose-200 disabled:opacity-50">Delete saved profile</button><button type="button" onClick={() => startSession('personalized', [], {})} disabled={busy || !aiConsent || !databaseReady} className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">Start personalized interview</button></div>
      </form>
      {statusNotice}
      {issueNotice}
      {backButton}
    </div>
  );

  const renderResults = () => {
    const attempt = history.find((item) => item.id === routeId) || activeAttempt;
    const feedback = results || attempt?.feedback;
    const evaluatedMessages = messages.filter((message) => message.role === 'candidate');
    const savedAnswerRows = savedResponses.length
      ? savedResponses
      : Object.entries(attempt?.answers || {}).map(([id, response_text]) => ({
        question_id: id,
        question_text: questionById.get(id)?.text || 'Practice response',
        response_text,
      }));
    const answeredCount = attempt?.mode === 'rapid-fire'
      ? Object.values(attempt.answers || rapidAnswers).filter((answer) => answer?.trim()).length
      : savedAnswerRows.length || evaluatedMessages.length;
    return <div className="mx-auto max-w-4xl space-y-6">{header('Preparation progress · not an ISSB score', 'Interview practice review', 'This report is educational coaching about communication and preparation only. It cannot assess personality, determine officer suitability, or predict ISSB outcomes.')}
      {attempt && <div className="grid gap-3 sm:grid-cols-3">{[['Mode', attempt.mode], ['Questions answered', answeredCount], ['Duration', formatDuration(attempt.durationSeconds)]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 font-bold capitalize text-slate-100">{value}</p></div>)}</div>}
      {feedback ? <div className="space-y-4"><p className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4 text-sm leading-6 text-slate-200">{feedback.overallObservations}</p>{Object.entries({
        'Communication': feedback.communication,
        'Self-awareness': feedback.selfAwareness,
        'Consistency and clarification': feedback.consistency,
        'Decision-making': feedback.decisionMaking,
        'Interview performance': feedback.interviewPerformance,
        'Recommendations': feedback.recommendations,
      }).map(([title, value]) => <section key={title} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-bold text-slate-100">{title}</h2>{typeof value === 'string' ? <p className="mt-2 text-sm leading-6 text-slate-300">{value}</p> : <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-300">{(Array.isArray(value) ? value : []).map((item) => <li key={item}>{item}</li>)}</ul>}</section>)}</div> : <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm leading-6 text-slate-300">No AI report is saved for this session. Complete a mock interview and request the report through the deployed AI service. Your preparation is not assigned an official score.</p>}
      {savedAnswerRows.length > 0 && <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-lg font-bold text-slate-100">Your saved answers</h2>{savedAnswerRows.map((answer) => <article key={answer.question_id} className="border-b border-slate-800 pb-3 last:border-0"><h3 className="text-sm font-semibold text-slate-200">{answer.question_text}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">{answer.response_text || 'No answer entered.'}</p></article>)}</section>}
      {evaluatedMessages.length > 0 && <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-lg font-bold text-slate-100">Conversation answers</h2>{evaluatedMessages.map((message, index) => <p key={message.id} className="whitespace-pre-wrap border-b border-slate-800 pb-3 text-sm leading-6 text-slate-300 last:border-0"><span className="mr-2 font-mono text-amber-300">{index + 1}.</span>{message.content}</p>)}</section>}
      <div className="flex flex-wrap gap-3"><button type="button" onClick={() => go('history')} className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100">Session history</button>{backButton}</div>
    </div>;
  };

  const renderHistory = () => <div className="space-y-6">{header('Private practice history', 'Your interview sessions', 'Review saved sessions and AI feedback, or delete an individual session. Sessions are private to your visitor account and this browser.')}<div className="grid gap-3 sm:grid-cols-3">{[['Total sessions', history.length], ['Completed', history.filter((item) => item.status === 'completed').length], ['Total practice time', formatDuration(history.reduce((total, item) => total + (item.durationSeconds || 0), 0))]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-xl font-bold text-slate-100">{value}</p></div>)}</div>{history.length ? <div className="space-y-3">{history.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5"><div><p className="font-bold capitalize text-slate-100">{item.mode.replaceAll('-', ' ')} · {item.status}</p><p className="mt-1 text-xs text-slate-400">{new Date(item.startedAt).toLocaleString()} · {item.questionIds?.length || 0} question prompts</p>{item.feedback?.overallObservations && <p className="mt-2 line-clamp-2 text-sm text-slate-300">{item.feedback.overallObservations}</p>}</div><div className="flex gap-2"><button type="button" onClick={() => go(item.status === 'completed' ? `results/${item.id}` : `${item.mode}/${item.id}`)} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100">{item.status === 'completed' ? 'Review' : 'Resume'}</button><button type="button" onClick={() => deleteAttempt(item)} aria-label="Delete practice session" className="rounded-lg border border-rose-500/30 px-3 py-2 text-rose-300"><Trash2 className="h-4 w-4" /></button></div></article>)}</div> : <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">No sessions yet. Start a mock interview or save a learning response to create your private practice history.</p>}{issueNotice}{backButton}</div>;

  const renderHome = () => <div className="space-y-7">
    {header('ISSB · psychological interview preparation', 'Practise real, honest answers', 'Build confidence discussing your background, choices, relationships, emotions, and experiences. This is educational practice—not an official ISSB interview simulator, assessment, or guarantee of selection.')}
    {issueNotice}
    <label className="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-950/10 p-4 text-sm leading-6 text-slate-300"><input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} className="mt-1 accent-sky-400" />I consent to sending my interview responses and any profile details I choose to share to the configured AI provider for educational practice and feedback. AI use is optional; the question bank remains available without it.</label>
    <section className="grid gap-4 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-5 sm:grid-cols-2">
      <div><h2 className="font-bold text-amber-100">Psychological interview preparation</h2><p className="mt-2 text-sm leading-6 text-slate-300">This section focuses on self-awareness, personal history, behaviour, decision-making, and truthful examples.</p></div>
      <div><h2 className="font-bold text-slate-200">Deputy President interview preparation</h2><p className="mt-2 text-sm leading-6 text-slate-300">General knowledge, service facts, current affairs, and formal board topics are a separate preparation area. They are intentionally not mixed into this psychological question bank.</p></div>
    </section>
    {loading && <p role="status" className="text-sm text-slate-300">Loading your private interview history…</p>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[
        ['questions', 'Question bank', 'Browse all 150 prompts with search, category, difficulty, and type filters.', <BookOpen className="h-5 w-5" />],
        ['learn', 'Learning mode', 'Read guidance, reflect, write, and save answers at your own pace.', <Check className="h-5 w-5" />],
        ['mock', 'AI mock interview', 'Have a dynamic, one-question-at-a-time conversation with relevant follow-ups.', <Sparkles className="h-5 w-5" />],
        ['rapid-setup', 'Rapid-fire practice', 'Set a short answer timer and complete a varied question sequence.', <Clock3 className="h-5 w-5" />],
        ['voice', 'Voice interview', 'Speak through browser transcription or use the text alternative; review before sending.', <Mic className="h-5 w-5" />],
        ['personalized', 'Optional personalization', 'Save only the background details you choose to tailor follow-up practice.', <ShieldCheck className="h-5 w-5" />],
        ['random-setup', 'Random interview', 'Practise a unique mix of questions without repeats in one session.', <ArrowRight className="h-5 w-5" />],
        ['challenging', 'Challenging interview', 'Practise respectful follow-ups about vague claims, mistakes, and choices.', <ShieldCheck className="h-5 w-5" />],
        ['history', 'Session history', 'Review your saved sessions, progress and feedback; delete your own records.', <BookOpen className="h-5 w-5" />],
      ].map(([key, title, description, icon]) => <article key={key} className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-amber-500/40"><div><span className="text-amber-300">{icon}</span><h2 className="mt-3 text-lg font-bold text-slate-100">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p></div><button type="button" onClick={() => go(key === 'rapid-setup' ? 'setup/rapid-fire' : key === 'random-setup' ? 'setup/random' : key)} className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100">{key === 'rapid-setup' || key === 'random-setup' ? 'Configure practice' : 'Open'} <ArrowRight className="ml-1 inline h-4 w-4" /></button></article>)}
    </section>
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5"><div><h2 className="font-bold text-slate-100">Category coverage</h2><p className="mt-1 text-xs leading-5 text-slate-400">Shows prompts included in your saved sessions, not answer quality or psychological suitability. Categories with fewer prompts may be useful for future practice.</p></div><div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">{categoryCoverage.map((category) => <p key={category.id} className="flex items-center justify-between gap-2 text-xs text-slate-300"><span>{category.name}</span><span className="font-mono text-amber-300">{category.count} prompts</span></p>)}</div></section>
    {statusNotice}
    <div className="flex flex-wrap gap-3">{onBack && <button type="button" onClick={onBack} className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200">Back to psychological tests</button>}</div>
  </div>;

  const isRapidSetup = routeId === 'rapid-fire';
  const renderSetup = () => <div className="mx-auto max-w-3xl space-y-6">{header('Configure your practice', 'Choose a session length', 'Random and rapid-fire practice draw unique questions without repeating within a session. Rapid-fire uses a local timer; the timer is not an assessment.')}<label className="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-950/10 p-4 text-sm leading-6 text-slate-300"><input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} className="mt-1 accent-sky-400" />I consent to AI processing for this session and its optional coaching report.</label><section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5"><label className="block space-y-2 text-sm text-slate-300"><span>Number of questions</span><select value={sessionLength} onChange={(event) => setSessionLength(Number(event.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-100">{QUESTION_COUNTS.map((count) => <option key={count} value={count}>{count} questions</option>)}</select></label>{isRapidSetup && <label className="block space-y-2 text-sm text-slate-300"><span>Answer time</span><select value={rapidSeconds} onChange={(event) => setRapidSeconds(Number(event.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-100">{RAPID_FIRE_SECONDS.map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds</option>)}</select></label>}<div className="flex flex-wrap gap-3"><button type="button" disabled={busy || !aiConsent || !databaseReady} onClick={() => isRapidSetup ? startRapidFire() : startRandomSession()} className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{busy ? 'Starting…' : isRapidSetup ? 'Start rapid-fire' : 'Start random interview'}</button>{backButton}</div></section>{issueNotice}</div>;

  if (loading && routeId && page !== 'learn') return <div role="status" className="mx-auto max-w-4xl px-4 py-16 text-sm text-slate-300">Loading your saved interview session…</div>;
  if (page === 'learn' && routeId && questionById.has(routeId)) return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{renderLearningQuestion()}</div>;
  if (['mock', 'voice', 'random', 'challenging', 'personalized'].includes(page) && activeAttempt?.id === routeId && activeAttempt.mode !== 'rapid-fire') return <div className="px-4 py-8 sm:px-6 lg:px-8">{renderInterview()}</div>;
  if (page === 'rapid-fire' && activeAttempt?.id === routeId) return <div className="px-4 py-8 sm:px-6 lg:px-8">{renderRapidFire()}</div>;
  if (page === 'results') return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{renderResults()}</div>;
  if (page === 'history') return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{renderHistory()}</div>;
  if (page === 'questions') return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{renderQuestionBank()}</div>;
  if (page === 'learn') return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{renderLearningQuestion()}</div>;
  if (page === 'personalized') return <div className="px-4 py-8 sm:px-6 lg:px-8">{renderProfile()}</div>;
  if (page === 'setup') return <div className="px-4 py-8 sm:px-6 lg:px-8">{renderSetup()}</div>;
  if (['mock', 'voice', 'random', 'challenging'].includes(page)) {
    const mode = page === 'mock' || page === 'voice' ? page : page;
    return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-5">{renderHome()}<div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-5"><h2 className="font-bold text-amber-100">Start {mode.replaceAll('-', ' ')} practice</h2><p className="mt-2 text-sm text-slate-300">{mode === 'challenging' ? 'The interviewer will ask respectful follow-ups about evidence, mistakes, and decisions.' : mode === 'voice' ? 'Voice practice uses browser speech recognition if available; typed answers remain available.' : 'The AI will generate a new question in response to your answers.'}</p><button type="button" disabled={busy || !databaseReady} onClick={() => startSession(mode, mode === 'challenging' ? PSYCHOLOGICAL_INTERVIEW_QUESTIONS.filter((question) => question.classification === 'challenging-follow-up').map((question) => question.id) : [])} className="mt-4 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">Begin interview</button></div>{issueNotice}</div>;
  }
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{renderHome()}</div>;
}
