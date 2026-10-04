import sourceMarkdown from '../../../Full mock tests/PMA_159_Academic_100_Questions.md?raw';
import { parseAcademicMockTest2 } from './parseAcademicMockTest2';

const ACADEMIC_PORTION_MOCK_TEST_2_QUESTIONS = parseAcademicMockTest2(sourceMarkdown);

export const ACADEMIC_PORTION_MOCK_TEST_2 = {
  id: 'academic-portion-mock-test-2',
  title: 'Academic Portion Mock Test 2',
  force: 'Pakistan Army',
  category: 'Academic',
  difficulty: 'Medium',
  duration: '80 mins',
  questionsCount: ACADEMIC_PORTION_MOCK_TEST_2_QUESTIONS.length,
  questions: ACADEMIC_PORTION_MOCK_TEST_2_QUESTIONS,
};

export default ACADEMIC_PORTION_MOCK_TEST_2_QUESTIONS;