const categories = [
  {
    id: 'introduction-background',
    name: 'Introduction and Personal Background',
    questions: [
      'Introduce yourself.',
      'What is the meaning of your name?',
      'Where were you born?',
      'What is your hometown famous for?',
      'How would you describe your personality?',
      'What are your three strongest qualities?',
      'What are your three biggest weaknesses?',
      'What are you doing nowadays?',
      'What is your mother tongue?',
      'What is the most important thing people should know about you?',
    ],
  },
  {
    id: 'parents-family',
    name: 'Parents and Family',
    questions: [
      'Tell me about your family.',
      "What is your father's profession?",
      "What is your mother's profession?",
      'How many brothers and sisters do you have?',
      'What is your position among your siblings?',
      'What do you admire most about your father?',
      'What do you admire most about your mother?',
      'What are the strengths and weaknesses of your parents?',
      'How would you describe your relationship with your siblings?',
      'What responsibilities do you have towards your family?',
    ],
  },
  {
    id: 'education-academic',
    name: 'Education and Academic Performance',
    questions: [
      'Tell me about your educational background.',
      'Which is your favourite subject and why?',
      'Which subject do you find difficult?',
      'Why did you choose your current field?',
      'What were your marks in Matriculation?',
      'What were your marks in Intermediate?',
      'Why did your academic performance decrease in a particular year?',
      'Have you ever failed an examination?',
      'What is your favourite memory from school or college?',
      'What would your teachers say about you?',
    ],
  },
  {
    id: 'friends-social',
    name: 'Friends and Social Relationships',
    questions: [
      'Who is your best friend?',
      'Why is that person your best friend?',
      "What are your friend's good and bad qualities?",
      'How many close friends do you have?',
      'What qualities do you look for in friends?',
      'Have you ever had a disagreement with a close friend?',
      'How do you resolve misunderstandings?',
      'Do you prefer a large social circle or a few close friends?',
      'How do your friends describe your personality?',
      'Have you ever helped a friend through a difficult situation?',
    ],
  },
  {
    id: 'strengths-weaknesses',
    name: 'Strengths, Weaknesses and Personality',
    questions: [
      'What are your greatest strengths?',
      'What is your biggest weakness?',
      'Are you an introvert or an extrovert?',
      'Are you emotional or practical?',
      'How do you control your anger?',
      'What makes you lose your patience?',
      'How do you react to criticism?',
      'Are you a confident person?',
      'What is the biggest mistake you have made?',
      'What personal quality do you want to improve?',
    ],
  },
  {
    id: 'armed-forces-motivation',
    name: 'Motivation for Joining the Armed Forces',
    questions: [
      'Why do you want to join the Pakistan Armed Forces?',
      'Why have you chosen the Army, Navy or Air Force?',
      'Why do you want to become an officer?',
      'What motivates you to serve your country?',
      'Why should the board select you?',
      'What qualities make a good military officer?',
      'What do you understand by military discipline?',
      'What would you do if you were not recommended?',
      'What is your alternative career plan?',
      'Would you still respect the armed forces if you were not selected?',
    ],
  },
  {
    id: 'hobbies-sports-interests',
    name: 'Hobbies, Sports and Interests',
    questions: [
      'What are your hobbies?',
      'How do you spend your free time?',
      'Which sport do you like most?',
      'Why do you enjoy that sport?',
      'Which team or player do you admire?',
      'How often do you exercise?',
      'What was the last book you read?',
      'Who is your favourite author?',
      'What type of movies or documentaries do you enjoy?',
      'What have you learned from your favourite hobby?',
    ],
  },
  {
    id: 'achievements-failures',
    name: 'Achievements, Failures and Life Experiences',
    questions: [
      'What is your greatest achievement?',
      'What is your biggest failure?',
      'What is the happiest day of your life?',
      'What is the saddest experience of your life?',
      'What is the most difficult challenge you have faced?',
      'Have you ever led a team?',
      'Have you ever participated in a competition?',
      'Have you ever received an award or certificate?',
      'What is one mistake you would like to correct?',
      'What lesson has failure taught you?',
    ],
  },
  {
    id: 'emotional-behaviour-pressure',
    name: 'Emotional Behaviour and Pressure',
    questions: [
      'What makes you angry?',
      'What makes you happy?',
      'How do you react when someone insults you?',
      'How do you handle stressful situations?',
      'Have you ever lost your temper?',
      'What do you do when you feel disappointed?',
      'How do you react when your plans fail?',
      'How do you make decisions under pressure?',
      'What would you do if someone blamed you for a mistake you did not make?',
      'How do you recover after a setback?',
    ],
  },
  {
    id: 'situational-judgment',
    name: 'Situational and Judgment Questions',
    questions: [
      'What would you do if your friend cheated in an examination?',
      'What would you do if your superior gave you a difficult assignment?',
      'What would you do if you disagreed with your superior?',
      'What would you do if a teammate refused to cooperate?',
      'What would you do if you made a serious mistake during training?',
      'What would you do if your friend broke an important rule?',
      'What would you do if you had to choose between personal comfort and an important responsibility?',
      'What would you do if two team members started arguing?',
      'How would you react if someone challenged your decision in front of others?',
      'What would you do if you witnessed an unfair decision?',
    ],
  },
  {
    id: 'relationships-social-attitudes',
    name: 'Relationships and Social Attitudes',
    questions: [
      'What qualities do you appreciate in other people?',
      'What makes someone trustworthy?',
      'What is your opinion about friendship?',
      'What is your opinion about marriage?',
      'What does mutual respect mean to you?',
      'How should disagreements be resolved in a family?',
      'What is your opinion about gender equality?',
      'How do you interact with people who have different opinions?',
      'What qualities make someone a good citizen?',
      'What social problem concerns you most?',
    ],
  },
  {
    id: 'leadership-responsibility-discipline',
    name: 'Leadership, Responsibility and Discipline',
    questions: [
      'What is leadership?',
      'What is the difference between a leader and a follower?',
      'Have you ever been a team leader?',
      'How do you motivate other people?',
      'What would you do if your team failed?',
      'How do you manage your responsibilities?',
      'Can a good leader admit mistakes?',
      'What is more important: discipline or motivation?',
      'How do you handle responsibility when nobody is supervising you?',
      'What would you do if your team disagreed with your plan?',
    ],
  },
  {
    id: 'ambitions-development',
    name: 'Future Ambitions and Personal Development',
    questions: [
      'What are your future ambitions?',
      'Where do you see yourself in five years?',
      'What kind of person do you want to become?',
      'What skills do you want to develop?',
      'What is your biggest life goal?',
      'How do you plan to achieve your ambitions?',
      'What would you do if your career plans changed?',
      'What motivates you to improve yourself?',
      'What is one habit you want to develop?',
      'How do you measure your personal progress?',
    ],
  },
  {
    id: 'personal-history-interests',
    name: 'Personal History and Interests',
    questions: [
      'What is your favourite childhood memory?',
      'Which teacher influenced you the most?',
      'Who is your favourite personality?',
      'Why do you admire that personality?',
      'Which newspaper or news source do you follow?',
      'What was the last important news story you read?',
      'Which historical personality inspires you?',
      'What is the most interesting place you have visited?',
      'Have you ever participated in volunteer work?',
      'What is one experience that changed your way of thinking?',
    ],
  },
  {
    id: 'challenging-follow-ups',
    name: 'Challenging Follow-up Questions',
    questions: [
      'You say you are hardworking. Give me a real example.',
      'You say you are confident. Why do you sometimes hesitate?',
      'Why should we believe your answers?',
      'What is something your parents dislike about you?',
      'What would your closest friend criticize you for?',
      'If you are a good leader, why have you failed at something?',
      'What is one thing you cannot easily admit about yourself?',
      'Are you joining the armed forces because of personal interest or family pressure?',
      'If your best friend is selected and you are not, how would you react?',
      'What would you change about yourself if you had another chance?',
    ],
  },
];

const categoryGuidance = {
  'introduction-background': ['Anchor personal facts in your own words and keep dates and details consistent.', 'Making claims that are too broad or reciting a memorized biography.', 'I am perfect at everything and everyone likes me.', 'I am currently [your real study or work]. A recent responsibility I handled was [brief example], and I learned [specific lesson].'],
  'parents-family': ['Describe your family respectfully, distinguish what you know from what you assume, and use accurate details.', 'Presenting family members as flawless or sharing private details unnecessarily.', 'My family has no problems and I agree with everyone.', 'My family includes [brief accurate detail]. I value [real quality], and one responsibility I handle is [example].'],
  'education-academic': ['Use accurate records, explain choices and setbacks directly, and focus on what you changed afterward.', 'Blaming others, hiding results, or making excuses without describing action.', 'My marks are always excellent and every subject is easy.', 'My result in [year/subject] was [accurate detail]. I responded by [specific action], which led to [honest outcome or lesson].'],
  'friends-social': ['Describe relationships through mutual behaviour, boundaries, and a real example of cooperation or repair.', 'Claiming universal approval or describing loyalty without showing how it appears.', 'All my friends are perfect and never disagree with me.', 'A friend and I once [real situation]. I listened to [their concern] and we [outcome]; I also learned [reflection].'],
  'strengths-weaknesses': ['Pair each self-assessment with observable evidence; describe a manageable weakness and current practice.', 'Calling a weakness a disguised strength or making unsupported absolute claims.', 'I have no weaknesses and never lose confidence.', 'I am [quality] when [context]. For example, [real action]. I am still working on [specific limitation] by [practice].'],
  'armed-forces-motivation': ['Explain your own motivation, realistic understanding of service, and an independent alternative plan.', 'Relying only on prestige, family pressure, or claims that selection is owed to you.', 'I want to join because it is the best job and I deserve selection.', 'I am drawn to [service] because [personal reason grounded in service]. I understand it involves [realistic demand], and I am preparing by [action].'],
  'hobbies-sports-interests': ['Be ready to discuss real participation, frequency, rules or ideas, and what you have learned.', 'Naming a hobby only because it sounds impressive or inventing expertise.', 'Cricket is my hobby, but I do not know anything about playing it.', 'I have practised [activity] for [real period/frequency]. Recently I [specific example], which taught me [lesson].'],
  'achievements-failures': ['Separate your contribution from the outcome and describe a truthful lesson or later adjustment.', 'Exaggerating credit, hiding setbacks, or presenting failure as someone else’s fault.', 'I never fail because I am better than everyone.', 'In [real situation], I was responsible for [part]. The result was [accurate result]; afterward I changed [specific action].'],
  'emotional-behaviour-pressure': ['Name the trigger, acknowledge your response honestly, and describe a safe, practical next step.', 'Pretending never to feel anger, pressure, or disappointment.', 'Nothing makes me angry or stressed.', 'When [real trigger] happens, I notice [honest reaction]. I try to [specific response], and I am improving by [action].'],
  'situational-judgment': ['Clarify immediate risks, act fairly within your authority, communicate, and review consequences.', 'Giving extreme answers, ignoring safety or fairness, or acting beyond your authority.', 'I would punish everyone immediately without checking what happened.', 'I would first [practical immediate step], then [appropriate communication or escalation]. I would consider [relevant consequence] and take responsibility for my part.'],
  'relationships-social-attitudes': ['Explain your principle with a fair example and show how you handle disagreement respectfully.', 'Repeating slogans without explaining how you apply them in ordinary interactions.', 'I am always right and people with different opinions are wrong.', 'I value [principle]. When [ordinary disagreement] happened, I [listened/acted], while still [reasonable boundary or position].'],
  'leadership-responsibility-discipline': ['Use an example that shows the task, your contribution, teamwork, and accountability for the result.', 'Equating leadership with giving orders or claiming a team result as solely yours.', 'A leader should never admit mistakes because that looks weak.', 'In [real group/task], I was responsible for [role]. When [challenge], I [action] and learned [specific lesson].'],
  'ambitions-development': ['Set realistic next steps you control and show how you will review progress or adapt.', 'Focusing only on status or promising outcomes outside your control.', 'I will definitely be famous and successful in five years.', 'My near-term goal is [specific goal]. I am taking [repeatable step] and will review progress by [measure]; I can adapt if [realistic change].'],
  'personal-history-interests': ['Use accurate memories, sources, and experiences, then explain why they matter to you.', 'Inventing details or relying on a name without explaining your own connection.', 'My favourite personality is the greatest person ever, but I know nothing about them.', 'I admire [person/source/place] for [specific reason]. I learned [idea] and applied it when [real example, if applicable].'],
  'challenging-follow-ups': ['Treat challenge as a request for evidence or clarification; answer directly without becoming defensive.', 'Repeating the original claim, arguing with the interviewer, or inventing evidence.', 'You should believe me because I said it and I never make mistakes.', 'That is a fair question. The example I can verify is [real event]. It shows [limited claim], though I still need to improve [honest area].'],
};

const commonlyReportedCategories = new Set([
  'introduction-background',
  'parents-family',
  'education-academic',
  'friends-social',
  'strengths-weaknesses',
  'armed-forces-motivation',
  'hobbies-sports-interests',
  'achievements-failures',
  'emotional-behaviour-pressure',
]);

export const PSYCHOLOGICAL_INTERVIEW_CATEGORIES = categories.map(({ id, name }) => ({ id, name }));

export const PSYCHOLOGICAL_INTERVIEW_QUESTIONS = categories.flatMap((category, categoryIndex) => {
  const [focus, commonMistake, weakResponse, improvedResponse] = categoryGuidance[category.id];
  return category.questions.map((text, questionIndex) => {
    const classification = category.id === 'situational-judgment'
      ? 'situational-practice'
      : category.id === 'challenging-follow-ups'
        ? 'challenging-follow-up'
        : commonlyReportedCategories.has(category.id) && questionIndex < 5
          ? 'commonly-reported'
          : ['introduction-background', 'parents-family', 'education-academic', 'friends-social', 'strengths-weaknesses', 'personal-history-interests'].includes(category.id)
            ? 'personal-background'
            : 'extended-practice';
    const difficulty = category.id === 'challenging-follow-ups' || category.id === 'situational-judgment' || questionIndex === 6 || questionIndex === 9
      ? 'challenging'
      : questionIndex < 3
        ? 'easy'
        : 'moderate';
    const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const id = `${category.id}-${questionIndex + 1}-${slug}`;
    return {
      id,
      categoryId: category.id,
      category: category.name,
      text,
      explanation: `This prompt helps you practise discussing ${category.name.toLowerCase()} clearly and honestly. It is an educational exercise, not an official ISSB scoring criterion.`,
      difficulty,
      guidance: `${focus} For this question, ${text.charAt(0).toLowerCase()}${text.slice(1)}`,
      classification,
      active: true,
      displayOrder: categoryIndex * 100 + questionIndex + 1,
      commonMistake,
      weakResponse,
      weakExplanation: 'This answer is vague, absolute, or unsupported. It gives the interviewer little reliable information about the candidate’s real behaviour.',
      sampleResponse: improvedResponse,
      followUps: [
        `Can you give me a specific example related to “${text.replace(/[?]/g, '')}”?`,
        'What was difficult about that situation, and what did you learn?',
      ],
    };
  });
});
