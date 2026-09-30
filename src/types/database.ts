export interface MilitaryBranch {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  logo_url: string | null;
  banner_image_url: string | null;
  is_active: boolean;
  display_order: number;
}

export interface Exam {
  id: string;
  branch_id: string | null;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  exam_type: string | null;
  difficulty: string | null;
  duration_minutes: number | null;
  total_questions: number | null;
  is_active: boolean;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_name: string | null;
  is_active: boolean;
  display_order: number;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  description: string | null;
  difficulty: string | null;
  is_active: boolean;
  display_order: number;
}

export interface Question {
  id: string;
  subject_id: string | null;
  topic_id: string | null;
  question_text: string;
  question_type: 'MCQ' | 'TRUE_FALSE' | 'NUMERIC' | 'TEXT';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | null;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  explanation: string | null;
  image_url: string | null;
}

export interface MockTest {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  branch_id: string | null;
  exam_id: string | null;
  duration_minutes: number;
  total_questions: number;
  difficulty: string | null;
  is_premium: boolean;
  is_active: boolean;
}

export interface StudyMaterial {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  material_type: string | null;
  subject_id: string | null;
  topic_id: string | null;
  branch_id: string | null;
  cover_image_url: string | null;
  pdf_url: string | null;
  is_premium: boolean;
  is_published: boolean;
}

export interface ISSBModule {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  module_type: string | null;
  display_order: number;
  is_published: boolean;
}

export interface CurrentAffair {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string | null;
  category: string | null;
  published_at: string | null;
  source_name: string | null;
  source_url: string | null;
  image_url: string | null;
  is_published: boolean;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  target_branch_id: string | null;
  target_exam_id: string | null;
  experience_level: string | null;
  role: 'USER' | 'EDITOR' | 'ADMIN';
}

export interface MockTestAttempt {
  id: string;
  user_id: string;
  mock_test_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_questions: number | null;
  correct_answers: number | null;
  incorrect_answers: number | null;
  unanswered: number | null;
  time_taken_seconds: number | null;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
}
