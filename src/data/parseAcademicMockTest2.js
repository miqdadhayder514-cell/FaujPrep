const OPTION_KEYS = ['A', 'B', 'C', 'D'];

const cleanText = (value) => value
  .replace(/\*\*/g, '')
  .replace(/\*/g, '')
  .replace(/\s+/g, ' ')
  .trim();

export const parseAcademicMockTest2 = (source) => {
  const answerKeyMarker = '# ANSWER KEY (quick check)';
  const detailedAnswersMarker = '# DETAILED ANSWERS WITH TRICKS';
  const answerKeyIndex = source.indexOf(answerKeyMarker);
  const detailedAnswersIndex = source.indexOf(detailedAnswersMarker);
  if (answerKeyIndex === -1 || detailedAnswersIndex === -1) {
    throw new Error('Academic Mock Test 2 answer key was not found.');
  }

  const questionLines = source.slice(0, answerKeyIndex).split(/\r?\n/);
  const answerLines = source.slice(detailedAnswersIndex).split(/\r?\n/);
  const questions = [];
  let currentQuestion = null;
  let currentTopic = '';

  const addQuestion = () => {
    const rawQuestion = currentQuestion.text;
    const optionMatches = [...rawQuestion.matchAll(/(?:^|\s)\(([A-D])\)\s*/g)];
    if (optionMatches.length !== 4 || OPTION_KEYS.some((key, index) => optionMatches[index]?.[1] !== key)) {
      throw new Error(`Question ${currentQuestion.id} must contain options (A) through (D).`);
    }

    const options = {};
    optionMatches.forEach((match, index) => {
      const optionStart = match.index + match[0].length;
      const optionEnd = optionMatches[index + 1]?.index ?? rawQuestion.length;
      options[`option_${match[1].toLowerCase()}`] = cleanText(rawQuestion.slice(optionStart, optionEnd));
    });

    const inlineTopic = rawQuestion.match(/^\*\(([^)]+)\)\*\s*/);
    const topic = inlineTopic?.[1] || currentTopic;
    const promptStart = inlineTopic ? inlineTopic[0].length : 0;
    const prompt = cleanText(rawQuestion.slice(promptStart, optionMatches[0].index));
    const section = currentQuestion.id <= 40 ? 'English'
      : currentQuestion.id <= 60 ? 'Mathematics'
        : currentQuestion.id <= 80 ? 'Islamiyat'
          : currentQuestion.id <= 90 ? 'Pakistan Studies'
            : 'Physics';

    questions.push({
      id: currentQuestion.id,
      question_text: topic ? `${topic}: ${prompt}` : prompt,
      ...options,
      correct_option: '',
      explanation: '',
      section,
      topic,
    });
    currentQuestion = null;
  };

  for (const line of questionLines) {
    const topicHeading = line.match(/^###\s+(.+)$/);
    if (topicHeading) {
      currentTopic = cleanText(topicHeading[1]);
      continue;
    }

    const questionHeading = line.match(/^\*\*(\d+)\.\*\*\s*(.*)$/);
    if (questionHeading) {
      if (currentQuestion) throw new Error(`Question ${currentQuestion.id} is missing answer options.`);
      currentQuestion = { id: Number(questionHeading[1]), text: questionHeading[2] };
    } else if (currentQuestion && line.trim()) {
      currentQuestion.text = `${currentQuestion.text} ${line.trim()}`.trim();
    }

    if (currentQuestion && [...currentQuestion.text.matchAll(/(?:^|\s)\([A-D]\)\s*/g)].length === 4) {
      addQuestion();
    }
  }

  if (currentQuestion) throw new Error(`Question ${currentQuestion.id} is missing answer options.`);

  const answers = new Map();
  for (const line of answerLines) {
    const answer = line.match(/^\*\*Q(\d+)\.\s*\(([A-D])\)\s*(.*?)\*\*\s*(.*)$/);
    if (answer) {
      answers.set(Number(answer[1]), {
        correctOption: answer[2],
        explanation: cleanText(answer[4]),
      });
    }
  }

  for (const question of questions) {
    const answer = answers.get(question.id);
    if (!answer) throw new Error(`Answer for question ${question.id} was not found.`);
    if (!answer.explanation) throw new Error(`Explanation for question ${question.id} was not found.`);
    question.correct_option = answer.correctOption;
    question.explanation = answer.explanation;
  }

  return questions;
};