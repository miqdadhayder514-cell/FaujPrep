import sourceMarkdown from '../../../Full mock tests/PMA_LC159_Academic_MCQs_Set2.md?raw';
import { parseAcademicMockTest } from './parseAcademicMockTest';

const ACADEMIC_PORTION_MOCK_TEST_1_QUESTIONS = parseAcademicMockTest(sourceMarkdown);

export const ACADEMIC_PORTION_MOCK_TEST_1 = {
  id: 'academic-portion-mock-test-1',
  title: 'Academic Portion Mock Test 1',
  force: 'Pakistan Army',
  category: 'Academic',
  difficulty: 'Medium',
  duration: '60 mins',
  questionsCount: ACADEMIC_PORTION_MOCK_TEST_1_QUESTIONS.length,
  questions: ACADEMIC_PORTION_MOCK_TEST_1_QUESTIONS,
};

export default ACADEMIC_PORTION_MOCK_TEST_1_QUESTIONS;
