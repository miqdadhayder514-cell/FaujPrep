const rawTests = [
  {
    title: 'SRT Practice Test 1',
    entries: [
      ['Social Conflict', 'Two passengers quarrel loudly over a seat in a bus. What will you do?', 'Calmly request them to stop, offer a fair solution, and inform the conductor if the quarrel continues.'],
      ['Family Responsibility', 'Your father becomes seriously ill at home one day before an important exam. What will you do?', 'Arrange prompt medical care, inform the school, and sit the exam only after ensuring responsible family support.'],
      ['Emergency', 'You see a child sinking in a canal but you do not know swimming. What will you do?', 'Raise an alarm, call rescuers, throw a safe floating aid, and guide trained help without entering the water.'],
      ['Discipline', 'Your immediate senior gives an order that conflicts with a higher authority\'s written instruction. What will you do?', 'Respectfully show the conflict, follow the valid higher instruction, and seek clarification through the chain of command.'],
      ['Ethics', 'You find a wallet full of money in an empty classroom. What will you do?', 'Secure it and hand it to the administration or police while recording the details transparently.'],
      ['Leadership', 'You are leading a trek and one member refuses to continue. What will you do?', 'Assess the person\'s condition, motivate the team, adjust the plan, and arrange safe support for the member.'],
      ['Practical Problem', 'Your train leaves ten minutes early and you reach the station late. What will you do?', 'Confirm the next safe route, inform the person expecting me, and use the next available transport.'],
      ['Stress', 'You are alone in a forest at night and your torch stops working. What will you do?', 'Stay calm, conserve battery, use safe landmarks, call for help, and avoid wandering into unknown hazards.'],
      ['Social Conflict', 'A classmate is being mocked by several students. What will you do?', 'Stop the mocking respectfully, support the student, and report repeated harassment to a responsible teacher.'],
      ['Ethics', 'A friend asks you to sign attendance for him when he is absent. What will you do?', 'Refuse honestly and advise him to explain his absence through the proper process.'],
    ],
  },
  {
    title: 'SRT Practice Test 2',
    entries: [
      ['Emergency', 'You smell gas in a crowded building. What will you do?', 'Warn people calmly, avoid switches or flames, move everyone outside, and call emergency services.'],
      ['Family Responsibility', 'Your younger sibling is locked inside a room while you are due for an interview. What will you do?', 'Arrange immediate adult or emergency help, ensure the child is safe, then attend or reschedule the interview honestly.'],
      ['Discipline', 'A colleague asks you to ignore a safety rule to finish work quickly. What will you do?', 'Refuse the unsafe shortcut, explain the risk, and complete the work according to the approved procedure.'],
      ['Leadership', 'Your team has two hours left and members disagree about the plan. What will you do?', 'Hear brief evidence from each member, decide on a practical plan, assign duties, and monitor progress.'],
      ['Practical Problem', 'Your important documents are lost before a selection interview. What will you do?', 'Report the loss, seek verified copies, contact the board, and present all available proof without hiding the problem.'],
      ['Stress', 'During a presentation the projector fails and everyone waits for you. What will you do?', 'Remain composed, continue with verbal explanation or a backup method, and complete the presentation clearly.'],
      ['Ethics', 'You discover that a shopkeeper has returned extra money by mistake. What will you do?', 'Return the extra money immediately and clarify the correct amount.'],
      ['Social Conflict', 'Two members of your group blame each other for a failed task. What will you do?', 'Stop personal accusations, identify the facts, divide corrective work, and keep the group focused on recovery.'],
      ['Emergency', 'A motorcyclist is injured in front of you after an accident. What will you do?', 'Call emergency services, secure the area, control traffic if safe, and avoid moving the injured person unnecessarily.'],
      ['Family Responsibility', 'Your family needs urgent help while you are preparing for a competitive test. What will you do?', 'Handle the urgent responsibility, organize family support, and resume preparation with a realistic revised plan.'],
    ],
  },
  {
    title: 'SRT Practice Test 3',
    entries: [
      ['Ethics', 'You notice a confidential document left unattended in an office. What will you do?', 'Protect it from exposure and return it to the authorized officer without reading or copying it.'],
      ['Leadership', 'A team member is slower than others and the group begins insulting him. What will you do?', 'Stop the insults, identify the difficulty, assign suitable support, and keep the team respectful and productive.'],
      ['Daily Life', 'You discover that your car tyre is flat on the way to an appointment. What will you do?', 'Move to a safe place, repair or replace the tyre, inform the appointment contact, and continue safely.'],
      ['Discipline', 'You are asked to deliver equipment without a required safety check. What will you do?', 'Explain that the check is required, complete it promptly, and report any defect before delivery.'],
      ['Emergency', 'A fire starts in a kitchen while several people are nearby. What will you do?', 'Raise the alarm, cut the supply if safe, evacuate people, and call the fire service.'],
      ['Stress', 'You wake up in an unfamiliar place after losing your phone. What will you do?', 'Stay calm, identify landmarks, ask a trusted authority for help, and contact family through an available phone.'],
      ['Social Conflict', 'A shopkeeper and customer are shouting over a bill in a market. What will you do?', 'Avoid taking sides, encourage calm discussion, and call security or police if there is danger.'],
      ['Family Responsibility', 'Your mother needs transport to hospital while you are leading an activity. What will you do?', 'Arrange immediate transport and a responsible replacement, then accompany or coordinate her medical care.'],
      ['Practical Problem', 'You arrive for a test and realize you brought the wrong stationery. What will you do?', 'Ask the administration for permitted stationery and begin the test without disturbing others.'],
      ['Ethics', 'A senior offers you a reward to hide a mistake in a report. What will you do?', 'Decline the reward and report the accurate facts through the proper channel.'],
    ],
  },
  {
    title: 'SRT Practice Test 4',
    entries: [
      ['Leadership', 'Your group loses its route during a hiking exercise. What will you do?', 'Stop movement, check the map and landmarks, keep the group together, and choose the safest known route.'],
      ['Emergency', 'A person collapses in a public place and people gather around. What will you do?', 'Create space, check responsiveness, call medical help, and follow first-aid guidance if trained.'],
      ['Discipline', 'You believe an instruction is inefficient but it is lawful and safe. What will you do?', 'Follow it professionally, then submit a respectful improvement suggestion through the proper channel.'],
      ['Ethics', 'You can take credit for a teammate\'s successful idea because nobody knows its source. What will you do?', 'Give the teammate proper credit and present the idea honestly.'],
      ['Daily Life', 'Your electricity fails while you must submit work before a deadline. What will you do?', 'Use backup power or a nearby facility, save the work safely, and notify the supervisor if delay is unavoidable.'],
      ['Social Conflict', 'A neighbor plays loud music late at night before your exam. What will you do?', 'Request politely that the noise be reduced and seek lawful community help if it continues.'],
      ['Stress', 'You receive an unexpected critical question in an interview. What will you do?', 'Listen carefully, take a moment, answer truthfully, and admit uncertainty instead of guessing.'],
      ['Family Responsibility', 'Your family asks you to leave your preparation permanently to solve a problem you can delegate. What will you do?', 'Address the urgent part, share responsibility with family members, and maintain a balanced plan.'],
      ['Practical Problem', 'You lose your way to an important appointment in a new city. What will you do?', 'Use reliable directions, ask a trusted person, inform the contact, and arrive by the safest route.'],
      ['Ethics', 'You see a friend copying answers during a test. What will you do?', 'Do not participate, complete my own paper, and report the matter according to the examination rules.'],
    ],
  },
  {
    title: 'SRT Practice Test 5',
    entries: [
      ['Emergency', 'Floodwater begins entering your street and some families are still inside their homes. What will you do?', 'Alert residents, contact rescue services, guide evacuation to higher ground, and avoid unsafe water.'],
      ['Leadership', 'Your team fails twice and members want to give up. What will you do?', 'Review the failure without blame, change the method, divide tasks, and lead a focused third attempt.'],
      ['Discipline', 'You are late for duty because public transport breaks down. What will you do?', 'Inform the supervisor immediately, use alternate transport, and accept responsibility for the delay.'],
      ['Ethics', 'You find that a close relative received an unfair advantage in selection. What will you do?', 'Do not use or defend the advantage; report the facts through the authorized process.'],
      ['Daily Life', 'Your passport is misplaced just before planned travel. What will you do?', 'Report it, apply for an official replacement or emergency document, and revise travel plans lawfully.'],
      ['Social Conflict', 'A group is spreading a false rumor about another student. What will you do?', 'Avoid spreading it, verify facts, discourage the rumor, and support the affected student.'],
      ['Stress', 'You are asked to speak without preparation before a large audience. What will you do?', 'Organize the key points quickly, speak calmly, and deliver a clear short message.'],
      ['Family Responsibility', 'Your sibling confides that he is being bullied and asks you not to tell anyone. What will you do?', 'Listen supportively, ensure immediate safety, and involve a trusted adult while respecting his privacy.'],
      ['Practical Problem', 'Your laptop fails just before an important submission. What will you do?', 'Use a backup or another device, recover the latest saved copy, and inform the recipient promptly.'],
      ['Leadership', 'A new team member is ignored during planning. What will you do?', 'Invite useful input, assign a clear role, and ensure the team benefits from every member.'],
    ],
  },
];

export const SRT_TESTS = rawTests.map((test) => ({
  ...test,
  entries: test.entries.map(([category, question, answer]) => ({ category, question, answer })),
}));

export default SRT_TESTS;
