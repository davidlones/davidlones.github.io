const audio = document.querySelector('audio');
const transcript = document.querySelector('article');
const words = [];
const chapters = document.querySelector('#chapters');
const follow = document.querySelector('#follow');
const status = document.querySelector('#status');

let cues = [];
let byWord = new Map();
let active = null;
let frame = 0;

function updateHighlight(scroll = true) {
  const time = audio.currentTime * 1000;
  let low = 0;
  let high = cues.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (cues[middle][1] <= time) low = middle + 1;
    else high = middle;
  }
  const cue = cues[low - 1];
  const next = cue && time < cue[2] && !audio.ended ? words[cue[0]] : null;
  if (next === active) return;
  active?.forEach(span => span.classList.remove('current'));
  active = next;
  if (!active) return;
  active.forEach(span => span.classList.add('current'));
  if (follow.checked && scroll) {
    const box = active[0].getBoundingClientRect();
    const toolbar = document.querySelector('.transport').getBoundingClientRect();
    const top = Math.max(toolbar.bottom + 12, innerHeight * .34);
    const bottom = Math.max(top + 16, innerHeight * .7);
    if (box.top < top || box.bottom > bottom) {
      window.scrollBy({ top: box.top - top, behavior: 'instant' });
    }
  }
}

function tick() {
  updateHighlight();
  frame = audio.paused || audio.ended ? 0 : requestAnimationFrame(tick);
}

function seek(cue) {
  audio.currentTime = (cue[1] + 1) / 1000;
  updateHighlight();
}

audio.addEventListener('play', () => { if (!frame) tick(); });
for (const event of ['seeked', 'pause', 'ended', 'timeupdate']) {
  audio.addEventListener(event, () => updateHighlight());
}
audio.addEventListener('error', () => {
  status.textContent = 'Audio could not load. Try the MP3 download.';
});
transcript.addEventListener('click', event => {
  if (event.target.closest('a') || !window.getSelection()?.isCollapsed) return;
  const word = event.target.closest('[data-word]');
  const cue = word && byWord.get(Number(word.dataset.word));
  if (cue) seek(cue);
});
chapters.addEventListener('change', () => {
  const index = Number(chapters.value);
  if (!chapters.value) return;
  const cue = byWord.get(index);
  if (cue) seek(cue);
  words[index][0].closest('h1').scrollIntoView({ block: 'start' });
  chapters.value = '';
});
follow.addEventListener('change', () => {
  if (follow.checked && active) active[0].scrollIntoView({ block: 'center' });
});

async function loadEdition() {
  const response = await fetch('/elliotts-tower/edition.json');
  if (!response.ok) throw new Error('Edition unavailable');
  const data = await response.json();
  const download = document.querySelector('#download');
  audio.src = data.audio;
  download.href = data.audio;
  download.hidden = false;
  transcript.innerHTML = data.html;
  for (const span of transcript.querySelectorAll('[data-word]')) {
    const index = Number(span.dataset.word);
    (words[index] ??= []).push(span);
  }
  if (data.wordCount !== words.length) throw new Error('Transcript version mismatch');
  cues = data.cues;
  byWord = new Map(cues.map(cue => [cue[0], cue]));
  for (const [index] of cues) words[index].forEach(span => { span.dataset.timed = ''; });
  for (const [index, title] of data.chapters) chapters.add(new Option(title, index));
  transcript.dataset.synced = '';
  follow.disabled = false;
  chapters.disabled = false;
  status.textContent = '';
  updateHighlight(false);
}
loadEdition().catch(() => {
  status.textContent = 'The synchronized edition could not load. Reload or open the source document.';
});
