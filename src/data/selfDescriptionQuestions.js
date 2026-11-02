const questionGroups = [
  {
    id: 'personal-self-assessment',
    name: 'Personal Self-Assessment',
    questions: [
      ['personal-opinion', 'What is your personal opinion about yourself?', 'Describe how you see yourself today, including one trait supported by a real example.', 'medium'],
      ['personality-description', 'How would you describe your personality?', 'Choose a few balanced traits and show how they appear in your day-to-day behaviour.', 'medium'],
      ['prominent-qualities', 'What are the most prominent qualities of your personality?', 'Select qualities that other people could observe and connect each to an action.', 'medium'],
      ['defining-habits', 'What are the habits that define you?', 'Distinguish a repeated habit from an occasional action and mention its effect.', 'easy'],
      ['what-makes-you-different', 'What makes you different from other people?', 'Avoid claiming superiority; explain a particular perspective, interest, or way of working.', 'medium'],
      ['like-most-about-yourself', 'What do you like most about yourself?', 'Name a quality, explain when it helps, and acknowledge where it still needs balance.', 'easy'],
      ['dislike-about-yourself', 'What do you dislike about yourself?', 'Choose a genuine, manageable limitation and describe what you are doing about it.', 'medium'],
      ['describe-yourself-to-stranger', 'How would you describe yourself to someone who does not know you?', 'Give a concise picture of your temperament, priorities, and one concrete example.', 'easy'],
      ['important-life-values', 'What are the three most important values in your life?', 'Name three values and show how one influenced a real decision.', 'medium'],
      ['motivation-to-work-hard', 'What motivates you to work hard?', 'Identify an authentic source of motivation and how it sustains effort when results are slow.', 'easy'],
      ['proud-of-yourself', 'What makes you feel proud of yourself?', 'Describe a specific effort or choice and the lesson that matters more than praise.', 'easy'],
      ['personality-change', 'What is one thing about your personality that you want to change?', 'State a specific pattern, its impact, and one practical step you are testing.', 'medium'],
    ],
  },
  {
    id: 'parents-and-family',
    name: 'Parents and Family',
    questions: [
      ['parents-think', 'What do your parents think about you?', 'Separate what they value from a realistic concern they may have; use details you have actually heard.', 'medium'],
      ['father-describes-personality', 'How does your father describe your personality?', 'Use your father’s own likely words only if you have heard them; support the description with an example.', 'medium'],
      ['mother-describes-personality', 'How does your mother describe your personality?', 'Consider a real observation your mother has made and avoid guessing what she wants to hear.', 'medium'],
      ['parents-appreciate-qualities', 'What qualities do your parents appreciate most in you?', 'Name a quality and the everyday behaviour through which your parents have noticed it.', 'easy'],
      ['parents-complaints', 'What complaints do your parents have about you?', 'Give a fair, non-defensive example of feedback and explain whether you have acted on it.', 'medium'],
      ['contribute-to-family', 'How do you contribute to your family?', 'Describe a regular, age-appropriate contribution and how consistently you make it.', 'easy'],
      ['responsibilities-at-home', 'What responsibilities do you have at home?', 'List real responsibilities and explain how you manage them alongside study or work.', 'easy'],
      ['family-in-difficult-situations', 'How would your family describe your behaviour during difficult situations?', 'Recall a real family challenge and describe your actions, not a perfect image of yourself.', 'hard'],
    ],
  },
  {
    id: 'friends-and-social-relationships',
    name: 'Friends and Social Relationships',
    questions: [
      ['best-friends-think', 'What do your best friends think about you?', 'Use feedback friends have actually shared and give an example of when it was visible.', 'medium'],
      ['closest-friend-description', 'How would your closest friend describe your personality?', 'Consider both a valued trait and a small limitation your friend might notice.', 'medium'],
      ['friends-appreciate', 'What qualities do your friends appreciate in you?', 'Describe a quality through a specific way you support or cooperate with friends.', 'easy'],
      ['friends-notice-weaknesses', 'What weaknesses do your friends notice in you?', 'Use a real piece of feedback and say how you respond when it is raised.', 'medium'],
      ['group-work-behaviour', 'How do you behave when working in a group?', 'Explain how you contribute, listen, and adapt when the group has different views.', 'medium'],
      ['role-among-friends', 'What role do you usually play among your friends?', 'Describe the role that emerges naturally in a real group rather than claiming a title.', 'easy'],
      ['disagreements-with-friends', 'How do you handle disagreements with friends?', 'Give a real or ordinary example showing how you listen, explain, and resolve or accept differences.', 'medium'],
      ['help-friend-in-difficulty', 'How do you help a friend who is facing difficulties?', 'Explain how you offer practical support while respecting what your friend wants.', 'medium'],
    ],
  },
  {
    id: 'teachers-and-educational-life',
    name: 'Teachers and Educational Life',
    questions: [
      ['teachers-think', 'What do your teachers think about you?', 'Summarize feedback you have received and connect it to your classroom conduct.', 'medium'],
      ['favourite-teacher-description', 'How would your favourite teacher describe you?', 'Use a real interaction or comment from that teacher rather than an imagined endorsement.', 'easy'],
      ['teachers-appreciate-qualities', 'What qualities do your teachers appreciate in you?', 'Identify a quality teachers have noticed and the work or behaviour that demonstrated it.', 'easy'],
      ['teachers-complaints', 'What complaints have your teachers made about you?', 'Choose a truthful example, describe its context, and explain any improvement since then.', 'medium'],
      ['classroom-behaviour', 'How do you behave in the classroom?', 'Reflect on preparation, participation, listening, and what you do when you lose focus.', 'easy'],
      ['respond-to-teacher-criticism', 'How do you respond to criticism from teachers?', 'Describe how you distinguish useful feedback from a misunderstanding and what action follows.', 'medium'],
      ['academic-responsibilities', 'What is your attitude towards academic responsibilities?', 'Show how you plan and complete real academic obligations, including a difficulty you manage.', 'medium'],
      ['educational-improvements', 'What improvements have you made in your educational life?', 'Compare an earlier habit with a specific change and its observable result.', 'medium'],
    ],
  },
  {
    id: 'critics-and-disagreement',
    name: 'Critics and People Who Disagree With You',
    questions: [
      ['critics-say', 'What would your critics say about you?', 'Represent a fair criticism you have heard and consider what part may be useful.', 'hard'],
      ['person-who-dislikes-you', 'What might a person who dislikes you say about your personality?', 'Avoid attacking the other person; reflect on a plausible, evidence-based disagreement.', 'hard'],
      ['opponents-notice-weaknesses', 'What weaknesses might your opponents notice in you?', 'Identify how a real limitation could affect others and how you are addressing it.', 'hard'],
      ['react-to-criticism', 'How do you react when someone criticizes you?', 'Describe your first reaction honestly and the deliberate step you take before responding.', 'medium'],
      ['people-who-disagree', 'How do you deal with people who disagree with your opinions?', 'Explain how you listen, test your reasoning, and disagree respectfully when needed.', 'medium'],
      ['learned-from-negative-feedback', 'What have you learned from negative feedback?', 'Describe feedback that changed a behaviour or exposed something you had missed.', 'medium'],
    ],
  },
  {
    id: 'strengths-and-weaknesses',
    name: 'Strengths and Weaknesses',
    questions: [
      ['greatest-strengths', 'What are your greatest strengths?', 'Choose strengths supported by repeated behaviour and give a concise example for each.', 'medium'],
      ['biggest-weaknesses', 'What are your biggest weaknesses?', 'Be specific and proportionate; explain the effect and a practical improvement step.', 'medium'],
      ['qualities-help-goals', 'Which of your qualities helps you achieve your goals?', 'Link a real quality to one goal and describe how it helped you make progress.', 'easy'],
      ['daily-life-weakness', 'Which weakness creates difficulties in your daily life?', 'Describe a recurring but manageable difficulty and what you are trying to change.', 'medium'],
      ['independent-or-team', 'Are you more comfortable working independently or in a team?', 'Give a balanced preference and explain when you work effectively in each setting.', 'medium'],
      ['demonstrate-responsibility', 'How do you demonstrate responsibility?', 'Use one example where you owned a task, followed through, or corrected a mistake.', 'easy'],
      ['demonstrate-discipline', 'How do you demonstrate discipline?', 'Describe a repeatable routine or choice, including how you recover when you slip.', 'easy'],
      ['difficult-responsibilities', 'How do you handle difficult responsibilities?', 'Explain how you clarify the task, plan the work, seek appropriate help, and follow through.', 'medium'],
      ['quality-most-proud', 'Which personal quality are you most proud of?', 'Show the quality in action without presenting yourself as flawless.', 'easy'],
      ['weakness-overcome', 'What personal weakness are you currently trying to overcome?', 'State the behaviour, the trigger you have noticed, and a measurable step you are practising.', 'medium'],
      ['manage-anger', 'How do you manage your anger?', 'Describe a genuine strategy you use and an instance where it helped or where you still struggle.', 'medium'],
      ['confidence-challenges', 'How do you maintain self-confidence during challenging situations?', 'Explain how preparation, perspective, or support helps you act despite uncertainty.', 'medium'],
    ],
  },
  {
    id: 'achievements-and-failures',
    name: 'Achievements and Failures',
    questions: [
      ['greatest-achievement', 'What is your greatest achievement?', 'Choose an honest achievement, explain your contribution, and reflect on what it taught you.', 'medium'],
      ['biggest-failure', 'What is your biggest failure?', 'Take appropriate responsibility without exaggerating; focus on the lesson and later action.', 'hard'],
      ['difficult-challenge-overcome', 'What is the most difficult challenge you have overcome?', 'Set the context, explain your own steps, and be accurate about the outcome.', 'hard'],
      ['happiest-moment', 'What is the happiest moment of your life?', 'Describe what happened and why it mattered to you rather than relying on dramatic language.', 'easy'],
      ['saddest-moment', 'What is the saddest moment of your life?', 'Share only what you are comfortable disclosing and focus on its meaning or impact.', 'hard'],
      ['mistake-important-lesson', 'Which mistake taught you an important lesson?', 'Explain the decision, its consequence, and the change you made afterward.', 'medium'],
      ['achievement-parents-proud', 'What achievement has made your parents proud?', 'Describe a real accomplishment and the effort or values your family appreciated.', 'easy'],
      ['learned-from-failures', 'What have you learned from your past failures?', 'Identify a pattern or lesson and show how it changed a later attempt.', 'medium'],
    ],
  },
  {
    id: 'emotions-and-personal-behaviour',
    name: 'Emotions and Personal Behaviour',
    questions: [
      ['react-when-angry', 'How do you react when you become angry?', 'Describe your usual reaction honestly and the steps you take to avoid harming a discussion.', 'medium'],
      ['what-causes-disappointment', 'What makes you disappointed?', 'Identify a realistic situation and explain how you recover or adjust expectations.', 'easy'],
      ['behaviour-under-pressure', 'How do you behave under pressure?', 'Use a real example and explain both what worked and what you would improve.', 'hard'],
      ['plans-go-wrong', 'How do you respond when things do not go according to your plans?', 'Explain how you reassess priorities and adapt without pretending setbacks never affect you.', 'medium'],
      ['handle-unexpected-problems', 'How do you handle unexpected problems?', 'Describe a situation where you identified the immediate issue and chose a practical next step.', 'medium'],
      ['mistakes-pointed-out', 'How do you react when someone points out your mistakes?', 'Explain how you verify the feedback, accept responsibility when appropriate, and correct the error.', 'medium'],
      ['situations-make-nervous', 'What situations make you nervous?', 'Name a genuine situation and the preparation or coping action that helps you participate.', 'easy'],
      ['emotional-control-difficulties', 'How do you maintain emotional control during difficult circumstances?', 'Describe an actual self-regulation practice while acknowledging its limits.', 'hard'],
    ],
  },
  {
    id: 'ambitions-and-future-development',
    name: 'Ambitions and Future Development',
    questions: [
      ['future-ambitions', 'What are your future ambitions?', 'State a meaningful goal, why it matters, and the next step within your control.', 'easy'],
      ['qualities-to-develop', 'What qualities would you like to develop?', 'Choose qualities relevant to your goals and identify how you will practise them.', 'easy'],
      ['person-you-want-to-become', 'What kind of person do you want to become?', 'Describe values and behaviours you hope to live by, not only a job title or status.', 'medium'],
      ['personal-qualities-improve', 'Which personal qualities do you want to improve?', 'Prioritize one or two qualities and connect each to an observable habit.', 'medium'],
      ['short-and-long-term-goals', 'What are your short-term and long-term goals?', 'Make the goals distinct, realistic, and connected by practical steps.', 'medium'],
      ['steps-to-improve-yourself', 'What steps are you taking to improve yourself?', 'Describe actions already underway, how often you take them, and how you judge progress.', 'easy'],
      ['future-responsibilities', 'What responsibilities would you like to take on in the future?', 'Name a responsibility you are prepared to work toward and what preparation it requires.', 'medium'],
      ['overcome-current-weaknesses', 'How do you plan to overcome your current weaknesses?', 'Turn one weakness into a specific practice plan with a way to review progress.', 'medium'],
    ],
  },
  {
    id: 'personal-background-and-lifestyle',
    name: 'Personal Background and Lifestyle',
    questions: [
      ['family-background', 'Describe your family background.', 'Share relevant facts respectfully and explain the values or responsibilities that shaped you.', 'easy'],
      ['childhood-description', 'How would you describe your childhood?', 'Use a few honest details and reflect on their influence without overstating causation.', 'medium'],
      ['educational-journey', 'How would you describe your educational journey?', 'Summarize important transitions, effort, setbacks, and what you learned.', 'medium'],
      ['hobbies-and-interests', 'What are your favourite hobbies and interests?', 'Choose real interests and describe what you actually do or learn through them.', 'easy'],
      ['free-time', 'How do you spend your free time?', 'Give a realistic picture of a typical week, including recreation and responsibilities.', 'easy'],
      ['sports-and-physical-activities', 'What sports and physical activities do you enjoy?', 'Mention activities you genuinely participate in and how regularly you do so.', 'easy'],
      ['relationships-with-relatives', 'How would you describe your relationships with relatives?', 'Describe the way you maintain relationships while respecting family privacy.', 'medium'],
      ['religion-and-morality', 'What role does religion and morality play in your life?', 'Explain how personal principles influence everyday choices without making claims of perfection.', 'medium'],
      ['daily-routine', 'How would you describe your daily routine?', 'Outline an ordinary day accurately, including study, rest, responsibilities, and flexibility.', 'easy'],
      ['important-life-lessons', 'What are the most important lessons you have learned from your life?', 'Select a lesson from experience and explain how it influences a current choice.', 'medium'],
    ],
  },
];

const classicQuestionIds = [
  'parents-think',
  'teachers-think',
  'best-friends-think',
  'personal-opinion',
  'qualities-to-develop',
];

export const SELF_DESCRIPTION_CATEGORY_EXAMPLES = {
  'personal-self-assessment': {
    vague: 'I am very hardworking and always finish everything perfectly.',
    whyWeak: 'The absolute claims are difficult to verify and leave out how the person behaves when plans fail.',
    improved: 'At the start of term, I often left short revision tasks until the weekend. I began reviewing for 20 minutes after dinner on four days each week. I still miss a day occasionally, but a checklist helps me restart instead of giving up on the week.',
    whyClearer: 'It describes a real habit, a specific adjustment, and an honest limitation without claiming perfection.',
  },
  'parents-and-family': {
    vague: 'My parents are happy with everything I do.',
    whyWeak: 'It assumes there is no disagreement or feedback and gives no example of family life.',
    improved: 'I help prepare dinner on the evenings my parents work late. I used to wait until they reminded me, so we agreed on two regular days. I am more consistent now, although I still need to plan around exam weeks.',
    whyClearer: 'It gives an ordinary contribution, acknowledges a previous shortcoming, and explains a practical change.',
  },
  'friends-and-social-relationships': {
    vague: 'All my friends say I am the best friend.',
    whyWeak: 'It speaks for everyone and does not show how the candidate acts in a relationship.',
    improved: 'In our class project, I made sure everyone had a chance to suggest an idea before we chose a plan. I can sometimes take on too much coordination, so I now ask others to own their parts instead of checking every detail myself.',
    whyClearer: 'It shows cooperation through an example and includes a realistic area for growth.',
  },
  'teachers-and-educational-life': {
    vague: 'My teachers like me because I am an excellent student.',
    whyWeak: 'It gives a broad judgment without evidence or reflection on feedback.',
    improved: 'My science teacher appreciated that I brought my lab notes up to date before practical work. After being told that I asked questions too late, I started noting them during the lesson and checking the difficult ones sooner.',
    whyClearer: 'It connects teacher feedback to observable study habits and an improvement the candidate made.',
  },
  'critics-and-disagreement': {
    vague: 'People who criticize me are jealous.',
    whyWeak: 'It dismisses feedback without considering whether any part of it might be useful.',
    improved: 'A teammate once said I sometimes answer before hearing the full suggestion. I did not agree with every detail, but I noticed it happened in a few meetings, so I now let the person finish and summarize their point before replying.',
    whyClearer: 'It considers criticism without automatically accepting or rejecting it and describes a testable response.',
  },
  'strengths-and-weaknesses': {
    vague: 'I have no weakness and can do everything well.',
    whyWeak: 'It avoids self-assessment and offers no behaviour that could support the claim.',
    improved: 'I am dependable with tasks that have a clear deadline; I keep a short list and check items off. I can underestimate how long a new task will take, so I have started adding a time buffer and asking questions earlier.',
    whyClearer: 'It pairs an evidence-based strength with a specific limitation and a reasonable strategy.',
  },
  'achievements-and-failures': {
    vague: 'I have never failed because I always work hard.',
    whyWeak: 'It avoids learning from setbacks and makes an unrealistic absolute claim.',
    improved: 'I did not qualify for a school team on my first attempt. I had practised the skills but had not prepared for the fitness part, so I added short runs twice a week. I made the team the following term; the useful lesson was to prepare for the whole requirement.',
    whyClearer: 'It separates the candidate’s effort from the outcome and shows a lesson applied later.',
  },
  'emotions-and-personal-behaviour': {
    vague: 'I never get angry or nervous.',
    whyWeak: 'It denies common emotions and says nothing about how the person handles them.',
    improved: 'I feel tense when I have several deadlines in the same week. Writing down the next two actions helps me begin; if I am still unsure, I ask the teacher which task should take priority.',
    whyClearer: 'It names a genuine trigger and explains practical behaviour without pretending the feeling disappears.',
  },
  'ambitions-and-future-development': {
    vague: 'I want to be successful and make everyone proud.',
    whyWeak: 'The ambition is not defined by a direction or actions within the candidate’s control.',
    improved: 'My near-term goal is to improve my stamina and keep my studies steady. I schedule three manageable training sessions each week and review them on Sunday. My longer-term career plans may develop, but these habits are useful either way.',
    whyClearer: 'It distinguishes a current goal from a longer-term aspiration and identifies concrete steps.',
  },
  'personal-background-and-lifestyle': {
    vague: 'My routine is perfect and I use every minute productively.',
    whyWeak: 'It is an absolute claim rather than a believable picture of an ordinary day.',
    improved: 'On school days I attend classes, review notes after lunch, and help with a household errand in the evening. I also leave some time for cricket with neighbours. During exams the routine changes, so I plan the next day the night before.',
    whyClearer: 'It gives a realistic routine with responsibilities, recreation, and an example of adapting.',
  },
};

const commonlyReportedCoreIds = new Set([
  ...classicQuestionIds,
  'critics-say',
  'greatest-strengths',
  'biggest-weaknesses',
]);

export const SELF_DESCRIPTION_CATEGORIES = questionGroups.map(({ id, name, questions }) => ({
  id,
  name,
  questionIds: questions.map(([questionId]) => questionId),
}));

export const SELF_DESCRIPTION_QUESTIONS = questionGroups.flatMap((category, categoryIndex) =>
  category.questions.map(([id, title, focus, difficulty], questionIndex) => ({
    id,
    categoryId: category.id,
    category: category.name,
    title,
    description: focus,
    writingGuidance: `Use a real example that shows this clearly. ${focus} Keep the response truthful and describe what you did, what happened, and what you learned.`,
    difficulty,
    displayOrder: categoryIndex * 100 + questionIndex + 1,
    questionType: 'written',
    isActive: true,
    isCore: commonlyReportedCoreIds.has(id),
    example: SELF_DESCRIPTION_CATEGORY_EXAMPLES[category.id],
  })),
);

export const SELF_DESCRIPTION_CLASSIC_QUESTION_IDS = classicQuestionIds;

export const SELF_DESCRIPTION_CLASSIC_HEADINGS = [
  'What do your critics or enemies think about you?',
  'What are your strong points?',
  'What are your weak points?',
];

export const SELF_DESCRIPTION_EXAMPLE = {
  vague: 'I am always responsible and never give up.',
  whyWeak: 'It makes an absolute claim without showing what responsibility looks like or recognizing ordinary setbacks.',
  improved: 'When I was responsible for coordinating our class project, I divided the tasks and checked in with the group. I still missed one early deadline, so I now set a midpoint reminder instead of relying on the final due date.',
  whyClearer: 'It gives a concrete situation, states the candidate’s own actions, and acknowledges a limitation with a practical improvement step.',
};

export const SELF_DESCRIPTION_BANK_NOTICE = 'This practice bank combines commonly reported preparation questions with additional practice prompts. It is not an official, exhaustive ISSB question paper, and no prompt or response can predict selection.';

export function getSelfDescriptionQuestion(questionId) {
  return SELF_DESCRIPTION_QUESTIONS.find((question) => question.id === questionId) || null;
}
