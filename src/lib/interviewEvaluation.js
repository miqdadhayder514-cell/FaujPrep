const countWords = (value) => value.trim().match(/\b[\w'-]+\b/g)?.length || 0;

export function evaluateInterviewAnswers({ question, answer, counterAnswer }) {
  const answerWords = countWords(answer);
  const counterWords = countWords(counterAnswer);
  const questionTerms = new Set(
    question.toLowerCase().match(/\b[a-z]{4,}\b/g) || [],
  );
  const answerTerms = new Set(answer.toLowerCase().match(/\b[a-z]{4,}\b/g) || []);
  const addressesQuestion = [...questionTerms].some((term) => answerTerms.has(term));
  const sentences = answer.split(/[.!?]+/).filter((sentence) => sentence.trim()).length;
  const includesEvidence = /\b(for example|for instance|because|when i|i led|i learned|i achieved|i completed|in \d{4}|\d+)\b/i.test(answer);

  const criteria = [
    { label: 'Directly addresses the question', score: answerWords < 8 ? 0 : addressesQuestion ? 2 : 1, max: 2 },
    { label: 'Clear structure', score: sentences >= 2 ? 2 : sentences === 1 && answerWords >= 8 ? 1 : 0, max: 2 },
    { label: 'Supporting detail or example', score: includesEvidence ? 2 : answerWords >= 45 ? 1 : 0, max: 2 },
    { label: 'Concise, complete response', score: answerWords >= 20 && answerWords <= 140 ? 2 : answerWords >= 10 && answerWords <= 180 ? 1 : 0, max: 2 },
    { label: 'Responds to the counter-question', score: counterWords >= 10 ? 2 : counterWords >= 4 ? 1 : 0, max: 2 },
  ];
  const score = criteria.reduce((total, criterion) => total + criterion.score, 0);
  const feedback = [];

  if (answerWords < 20) feedback.push('Add enough detail to explain your reasoning, not just your conclusion.');
  if (!includesEvidence) feedback.push('Support your point with a relevant example, fact, or personal experience.');
  if (sentences < 2) feedback.push('Use two or three short sentences to make the answer easier to follow.');
  if (counterWords < 10) feedback.push('Expand your counter-answer with a clear reason or example.');
  if (!feedback.length) feedback.push('Good structure. Keep your examples specific and make sure factual details are accurate.');

  return {
    score,
    maxScore: 10,
    criteria,
    feedback,
    wordCount: answerWords,
  };
}
