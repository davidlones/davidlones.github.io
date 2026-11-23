'use strict';

const posts = {
  workplace: {
    label: 'Workplace safety',
    headlines: ['Crew says site reopened before inspection was signed', 'Contractor gambled with crew safety, workers say'],
    text: 'A maintenance crew alleges that a contractor put a training facility back into service before a required sign-off. A worker says the shift log and the inspection ticket tell different stories.'
  },
  sensational: {
    label: 'Viral allegation',
    headlines: ['Viral account links outages to a secret test', 'They cut the lights on purpose. Here’s the “proof.”'],
    text: 'An account called Signal Ledger says three blackouts were staged to test public compliance. It posts a cropped graph with a red circle and cites an unnamed insider. The graph has no visible source, location or time axis.'
  },
  infrastructure: {
    label: 'Utility operations',
    headlines: ['Repeated “open” indications may be stale telemetry', 'The control room watched a breaker “open” four times. It opened once.'],
    text: 'An engineer compares a SCADA event export with a relay log. The control room recorded four OPEN indications during a communications recovery. The engineer argues that buffered or repeated status messages explain the discrepancy. The relay record shows one operation in its available interval.'
  }
};

const credibility = ['Very low', 'Low', 'Uncertain', 'High', 'Very high'];
const questions = [
  { prompt: 'How frequently do you use Facebook or other social media?', choices: ['Several times a day', 'About once a day', 'Several times a week', 'Less often', 'Never'] },
  { prompt: 'What is your primary reason for using social media?', choices: ['Keep in touch', 'News or local updates', 'Entertainment', 'Work or promotion', 'Communities or hobbies', 'I rarely or never use it', 'Something else'] },
  { prompt: 'What is most likely to make you stop scrolling and look at a post?', choices: ['Someone I know posted it', 'A strong headline or image', 'Practical relevance', 'A surprising claim', 'Useful evidence or details', 'Something else'] },
  { prompt: 'When you encounter a claim you’ve never heard before, what do you usually do first?', choices: ['Look for the original source', 'Search for independent coverage', 'Read the comments', 'Ask someone I trust', 'Keep scrolling', 'Something else'] },
  { prompt: 'What most strongly influences whether you consider a post credible?', choices: ['Verifiable evidence', 'Author or outlet reputation', 'Relevant expertise', 'Independent confirmation', 'Agreement with my experience', 'Something else'] },
  { prompt: 'Which of these three posts would you click first, and why?', choices: ['workplace', 'sensational', 'infrastructure', 'None of these'], stimulus: 'feed', note: 'Why? (optional)' },
  { prompt: 'Before examining evidence, how credible does the workplace claim appear?', choices: credibility, stimulus: 'workplace' },
  { prompt: 'After examining the supporting material, how credible does the workplace claim appear now?', choices: credibility, stimulus: 'evidence', note: 'What changed your confidence, or kept it steady? (optional)' },
  { prompt: 'What element of the sensational claim is most effective at attracting your attention?', choices: ['The allegation of intent', 'The image', 'The unnamed insider', 'The suggestion of a hidden pattern', 'Nothing in the post', 'Something else'], stimulus: 'sensational' },
  { prompt: 'What would you investigate first to determine whether that claim is true?', choices: ['The original graph and its context', 'Independent outage records', 'The account and its claimed source', 'Whether the events occurred as described', 'Something else'], stimulus: 'sensational' },
  { prompt: 'If the infrastructure post contradicted your experience, what would your initial reaction be?', choices: ['Question the post’s interpretation', 'Look for differences in equipment or setup', 'Revisit my experience in light of the records', 'Reserve judgment', 'Something else'], stimulus: 'infrastructure' },
  { prompt: 'Which technical details would you need before trusting its conclusions?', choices: ['Time synchronization and event timestamps', 'Relay flags, alarms and sequence-of-events logs', 'SCADA polling, buffering and point quality', 'Equipment and communications topology', 'Independent field observations', 'Something else'], multiple: true, stimulus: 'infrastructure', note: 'What else would you need? (optional)' },
  { prompt: 'Would changing the headline, without changing the underlying facts, affect your assessment?', choices: ['It affects whether I open it', 'It affects my confidence in the claim', 'It affects both', 'It affects neither', 'I’m unsure'], stimulus: 'headlines' },
  { prompt: 'Does knowing the person who shared something make you more likely to read or believe it?', choices: ['More likely to read it', 'More likely to believe it', 'Both', 'Neither', 'It depends on their relevant expertise', 'I’m unsure'] },
  { prompt: 'Looking back, which example changed your confidence most dramatically, and what caused that change?', choices: ['workplace', 'sensational', 'infrastructure', 'No clear change'], stimulus: 'recap', note: 'What caused the change? (optional)' },
  { prompt: 'Suppose an AI could correctly predict the next electrical failure in Stillwater, including the exact moment a raccoon entered a substation. What evidence would persuade you that this was more than coincidence?', choices: ['A time-stamped forecast filed in advance', 'Repeated success against a baseline', 'Independent records of the event', 'An audit of what the model could have known'] },
  { prompt: 'If a recommendation algorithm could influence millions of decisions without directly instructing anyone, would it constitute intelligence, manipulation, ordinary automation, or something else?', choices: ['Intelligence', 'Manipulation', 'Ordinary automation', 'More than one of these', 'Something else or undecided'] },
  { prompt: 'Imagine a civilization coordinating entirely through power consumption, water pressure, and wastewater flows. Could a sufficiently sophisticated SCADA system recognize its presence?', choices: ['It might detect anomalies', 'It might detect deliberate coordination', 'The measurements could fit several explanations', 'I would need to know more'] },
  { prompt: 'Suppose you dreamed about a power plant operated entirely by horses and subsequently discovered a technically plausible version of your dream. Would that change your assessment of the dream, the engineering, or neither?', choices: ['The dream', 'The engineering', 'Both', 'Neither', 'It depends on what was independently documented'] },
  { prompt: 'If the universe possessed a closed causal topology resembling a Möbius strip, what observation could distinguish a genuine coincidence from information following an unconventional causal path?', choices: ['A repeatable prediction made in advance', 'A result that survives controls for ordinary information transfer', 'A disagreement between ordinary and proposed models', 'I’m unsure how to design a distinguishing test'] }
];

const phases = [
  { title: 'Phase I · The Ordinary', note: 'Think about how you normally encounter posts.' },
  { title: 'Phase II · The Machinery', note: 'Illustrative material · All accounts, posts and records in this phase are fictional.' },
  { title: 'Phase III · The Absurd', note: 'Thought experiment · What would distinguish your explanation from its alternatives?' }
];
const groups = [
  ['Preferred content and attention', [2, 3, 6, 9]],
  ['Initial and revised workplace credibility', [7, 8, 15]],
  ['Reported verification habits', [4, 5, 10, 12]],
  ['Familiarity, framing and expertise', [11, 13, 14]],
  ['Uncertainty and extraordinary hypotheses', [16, 17, 18, 19, 20]]
];

const shortVersion = new URLSearchParams(location.search).get('phase3') === '3';
const active = questions.slice(0, shortVersion ? 18 : 20);
const $ = (id) => document.getElementById(id);
let answers, feedOrder, step, screen, returnScreen, sawEvidence, initialWorkplaceRating, editedInitialAfterEvidence;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function shufflePosts() {
  const order = Object.keys(posts);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function show(name, focus) {
  screen = name;
  for (const id of ['consent', 'run', 'debrief', 'confirm']) $(id).hidden = id !== name;
  if (focus) $(focus).focus();
}

function reset(focus) {
  answers = active.map(() => ({ choices: [], written: '' }));
  feedOrder = shufflePosts();
  step = 0;
  sawEvidence = false;
  initialWorkplaceRating = null;
  editedInitialAfterEvidence = false;
  $('response').value = '';
  $('choices').replaceChildren();
  $('reflection').value = '';
  $('report').replaceChildren();
  $('answers').replaceChildren();
  $('review').open = false;
  show('consent', focus);
}

function postLabel(value) {
  return posts[value]?.label || value;
}

function postCard(key, compare = false) {
  const post = posts[key];
  const card = element('article', null, 'post-card');
  card.append(element('p', post.label, 'terminal-label'), element('h3', post.headlines[0]));
  if (compare) card.append(element('p', 'Alternate headline · ' + post.headlines[1]));
  card.append(element('p', post.text));
  return card;
}

function workplaceEvidence() {
  const evidence = element('aside', null, 'evidence');
  evidence.append(
    element('h3', 'Supporting material · simulated excerpts'),
    element('p', 'Operating rule TR-4 §2 · For this maintenance class, both the clearance and an independent inspection must be recorded before equipment returns to service.'),
    element('p', 'Shift log 06:40 · “Test complete; clearance released. Returned to service.”'),
    element('p', 'Inspection ticket TR-184 · Review signed 08:12. The field for inspection time is blank. This export lists signature time and omits the audit trail.'),
    element('p', 'The excerpts can support a claim about when the signature appeared. They leave open when the inspection happened, whether clocks agree, and whether the ticket and shift log refer to the same equipment.')
  );
  return evidence;
}

function stimulusFor(kind) {
  const box = $('stimulus');
  box.replaceChildren();
  box.className = '';
  if (['feed', 'headlines', 'recap'].includes(kind)) {
    box.className = 'fictional-feed';
    for (const key of feedOrder) box.append(postCard(key, kind === 'headlines'));
  } else if (kind === 'evidence') {
    box.append(postCard('workplace'), workplaceEvidence());
  } else if (kind) {
    box.append(postCard(kind));
  }
  if (step === 6 && sawEvidence) {
    box.append(element('p', 'You’ve already seen the supporting material. A changed rating here will be marked as a revision after that reveal.', 'evidence'));
  }
}

function renderQuestion() {
  const number = step + 1;
  const phase = phases[step < 5 ? 0 : step < 15 ? 1 : 2];
  const question = active[step];
  const saved = answers[step];
  $('notebook-shell').dataset.phase = phases.indexOf(phase) + 1;
  $('phase').textContent = phase.title;
  $('phase-note').textContent = phase.note;
  $('progress').textContent = 'Question ' + number + ' of ' + active.length;
  $('prompt').textContent = question.prompt;
  if (question.stimulus === 'evidence' && !sawEvidence) {
    initialWorkplaceRating = answers[6].choices[0] ?? null;
    sawEvidence = true;
  }
  stimulusFor(question.stimulus);

  $('choices').replaceChildren();
  if (number >= 16 || question.multiple) {
    $('choices').append(element('p', question.multiple ? 'Choose any that apply.' : 'Interpretive choices (optional).'));
  }
  for (const value of question.stimulus === 'feed' ? [...feedOrder, 'None of these'] : question.choices) {
    const label = element('label', null, 'choice');
    const input = element('input');
    input.type = question.multiple ? 'checkbox' : 'radio';
    input.name = 'question-choice';
    input.value = value;
    input.checked = saved.choices.includes(value);
    label.append(input, document.createTextNode(postLabel(value)));
    $('choices').append(label);
  }
  $('response-label').textContent = question.note || (number >= 16 ? 'Your reasoning (optional)' : 'Additional context (optional)');
  $('response').value = saved.written;
  $('back').disabled = step === 0;
  $('next').textContent = step === active.length - 1 ? 'See debrief' : 'Next';
  show('run', 'progress');
}

function save() {
  const choices = Array.from($('choices').querySelectorAll('input:checked'), (input) => input.value);
  if (step === 6 && sawEvidence && choices[0] !== answers[step].choices[0]) editedInitialAfterEvidence = true;
  answers[step] = { choices, written: $('response').value.trim() };
}

function reportData() {
  const responses = active.map((question, index) => ({
    number: index + 1,
    question: question.prompt,
    choices: answers[index].choices.map(postLabel),
    written: answers[index].written
  }));
  return {
    article: 'The Feed Is Watching You Watch It',
    report: 'Illustrative reasoning report',
    method: 'Descriptive summary of participant responses. Blank answers remain blank. No inferred traits or scores.',
    phaseLengths: [5, 10, active.length - 15],
    exampleOrder: feedOrder.map(postLabel),
    workplaceCredibility: {
      beforeEvidence: initialWorkplaceRating,
      currentInitialResponse: responses[6].choices[0] ?? null,
      afterEvidence: responses[7].choices[0] ?? null
    },
    initialWorkplaceRatingEditedAfterEvidence: editedInitialAfterEvidence,
    headlinePairs: feedOrder.map((key) => ({ example: posts[key].label, headlines: posts[key].headlines })),
    sections: groups.map(([heading, numbers]) => ({
      heading,
      responses: numbers.map((number) => responses[number - 1]).filter(Boolean)
    })),
    reflection: $('reflection').value.trim(),
    responses
  };
}

function responseText(response) {
  return [response.choices.join(', '), response.written].filter(Boolean).join(' · ') || 'Skipped';
}

function reportNotes(data) {
  const notes = [
    'Example order: ' + data.exampleOrder.join(' → '),
    'Workplace credibility before the reveal: ' + (data.workplaceCredibility.beforeEvidence ?? 'Skipped'),
    'Workplace credibility after the reveal: ' + (data.workplaceCredibility.afterEvidence ?? 'Skipped')
  ];
  if (data.initialWorkplaceRatingEditedAfterEvidence) {
    notes.push('The initial workplace rating was edited after the evidence reveal.');
  }
  return notes;
}

function showReport() {
  const data = reportData();
  $('report').replaceChildren();
  for (const group of data.sections) {
    const list = element('ul');
    for (const response of group.responses) {
      list.append(element('li', 'Q' + response.number + ' · ' + responseText(response)));
    }
    const body = element('dd');
    body.append(list);
    $('report').append(element('dt', group.heading), body);
  }

  const conditions = element('dd');
  for (const note of reportNotes(data)) conditions.append(element('p', note));
  $('report').append(element('dt', 'Conditions of this run'), conditions);
  $('answers').replaceChildren();
  for (const response of data.responses) {
    const item = element('li');
    item.append(element('strong', response.question), element('p', responseText(response)));
    $('answers').append(item);
  }
  show('debrief', 'debrief-title');
}

function exportReport(format) {
  const data = reportData();
  const text = [
    data.article, data.report, data.method,
    'Stage lengths: ' + data.phaseLengths.join(' / '),
    ...reportNotes(data), '',
    ...data.sections.flatMap((group) => [
      group.heading,
      ...group.responses.map((response) => 'Q' + response.number + ' · ' + responseText(response)), ''
    ]),
    'Reflection: ' + (data.reflection || 'Skipped'), '', 'All responses',
    ...data.responses.map((response) => response.number + '. ' + response.question + '\n' + responseText(response))
  ].join('\n');
  const json = format === 'json';
  const blob = new Blob([json ? JSON.stringify(data, null, 2) : text], { type: json ? 'application/json' : 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = element('a');
  link.href = url;
  link.download = 'the-feed-reasoning-report.' + format;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function confirmRestart() {
  returnScreen = screen;
  if (screen === 'run') save();
  show('confirm', 'confirm-title');
}

$('begin').hidden = false;
$('begin').addEventListener('click', renderQuestion);
$('back').addEventListener('click', () => {
  save();
  step--;
  renderQuestion();
});
$('next').addEventListener('click', () => {
  save();
  if (step === active.length - 1) {
    showReport();
    return;
  }
  step++;
  renderQuestion();
});
$('edit').addEventListener('click', renderQuestion);
$('restart').addEventListener('click', confirmRestart);
$('restart-report').addEventListener('click', confirmRestart);
$('cancel').addEventListener('click', () => show(returnScreen, returnScreen === 'run' ? 'restart' : 'restart-report'));
$('clear').addEventListener('click', () => reset('begin'));
$('json').addEventListener('click', () => exportReport('json'));
$('plain').addEventListener('click', () => exportReport('txt'));
reset();

// The article can size the isolated notebook without receiving its contents.
if (window.parent !== window) {
  const shell = $('notebook-shell');
  new ResizeObserver(() => {
    window.parent.postMessage(Math.ceil(shell.getBoundingClientRect().height), '*');
  }).observe(shell);
}
