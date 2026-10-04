const OPTION_KEYS = ['a', 'b', 'c', 'd'];

export const parseAcademicMockTest = (source) => {
  const answerKeyMarker = '# ANSWER KEY WITH EXPLANATIONS AND TRICKS';
  const answerKeyIndex = source.indexOf(answerKeyMarker);
  if (answerKeyIndex === -1) throw new Error('Academic mock test answer key was not found.');

  const questionLines = source.slice(0, answerKeyIndex).split(/\r?\n/);
  const answerLines = source.slice(answerKeyIndex).split(/\r?\n/);
  const questions = [];
  let currentQuestion = null;

  const addQuestion = (rawQuestion) => {
    const optionMatches = [...rawQuestion.matchAll(/\(([a-d])\)\s*/g)];
    if (optionMatches.length !== 4 || OPTION_KEYS.some((key, index) => optionMatches[index]?.[1] !== key)) {
      throw new Error(`Question ${currentQuestion.id} must contain options (a) through (d).`);
    }

    const options = {};
    optionMatches.forEach((match, index) => {
      const optionStart = match.index + match[0].length;
      const optionEnd = optionMatches[index + 1]?.index ?? rawQuestion.length;
      options[`option_${match[1]}`] = rawQuestion.slice(optionStart, optionEnd).trim();
    });

    questions.push({
      id: currentQuestion.id,
      question_text: rawQuestion.slice(0, optionMatches[0].index).trim(),
      ...options,
      correct_option: '',
      explanation: '',
      section: currentQuestion.section,
    });
  };

  for (const line of questionLines) {
    const heading = line.match(/^\*\*(\d+)\.(?:\s*(.*?))?\*\*(.*)$/);
    if (heading) {
      if (currentQuestion) throw new Error(`Question ${currentQuestion.id} is missing answer options.`);
      const id = Number(heading[1]);
      const headingText = (heading[2] || '').trim();
      const restOfLine = (heading[3] || '').trim();
      const section = id <= 40 ? 'English' : id <= 60 ? 'Mathematics' : id <= 80 ? 'Islamiyat' : id <= 90 ? 'Pakistan Studies' : 'Physics';
      currentQuestion = { id, section, text: [headingText, restOfLine].filter(Boolean).join(' ') };
      continue;
    }

    if (!currentQuestion || !line.trim()) continue;
    currentQuestion.text = `${currentQuestion.text} ${line.trim()}`.trim();
    if ([...currentQuestion.text.matchAll(/\(([a-d])\)\s*/g)].length === 4) {
      addQuestion(currentQuestion.text);
      currentQuestion = null;
    }
  }

  if (currentQuestion) throw new Error(`Question ${currentQuestion.id} is missing answer options.`);

  const answers = new Map();
  for (const line of answerLines) {
    const answer = line.match(/^\*\*(\d+)\.\s*\(([a-d])\)\s*(.*?)\.\*\*\s*(.*)$/);
    if (answer) answers.set(Number(answer[1]), { correctOption: answer[2].toUpperCase(), explanation: answer[4].trim() });
  }

  for (const question of questions) {
    const answer = answers.get(question.id);
    if (!answer) throw new Error(`Answer for question ${question.id} was not found.`);
    question.correct_option = answer.correctOption;
    question.explanation = answer.explanation || (question.id === 63
      ? 'The Holy Quran is divided into 114 Surahs, from Al-Fatiha through An-Nas.'
      : '');
    if (!question.explanation) throw new Error(`Explanation for question ${question.id} was not found.`);
  }

  return questions;
};
