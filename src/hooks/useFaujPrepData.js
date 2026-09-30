import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase, SUPABASE_SETUP_MESSAGE } from '../lib/supabase';
import {
  getBranches,
  getExams,
  getSubjects,
  getMockTests,
  getStudyMaterials,
  getCurrentAffairs,
  getISSBModules,
} from '../lib/queries';

const initialData = {
  branches: [],
  exams: [],
  subjects: [],
  mockTests: [],
  studyMaterials: [],
  issbModules: [],
  currentAffairs: [],
};

export function useFaujPrepData() {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState(isSupabaseConfigured ? null : SUPABASE_SETUP_MESSAGE);
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    let mounted = true;
    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (mounted) setSession(sessionData.session);
    });
    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });
    setLoading(true);
    Promise.all([getBranches(), getExams(), getSubjects(), getMockTests(), getStudyMaterials(), getISSBModules(), getCurrentAffairs()])
      .then(([branches, exams, subjects, mockTests, studyMaterials, issbModules, currentAffairs]) => {
        if (!mounted) return;
        setData({ branches, exams, subjects, mockTests, studyMaterials, issbModules, currentAffairs });
        setError(null);
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'Unable to load Supabase content.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  return { data, loading, error, configured: isSupabaseConfigured, session };
}
