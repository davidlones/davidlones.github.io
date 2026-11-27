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
for (const event of ['seeking', 'seeked', 'pause', 'ended', 'timeupdate']) {
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

function setRecording(track, downloadUrl) {
  if (!track) {
    audio.src = downloadUrl;
    return;
  }
  if (audio.canPlayType('application/vnd.apple.mpegurl')) {
    audio.src = track.path + 'audio.m3u8';
    return;
  }
  const Media = window.MediaSource || window.ManagedMediaSource;
  const mime = 'audio/mp4; codecs="mp4a.40.2"';
  if (!Media?.isTypeSupported(mime)) {
    audio.src = downloadUrl;
    return;
  }

  const media = new Media();
  const url = URL.createObjectURL(media);
  const priming = 1024 / 24000;
  let duration = -priming;
  const ends = track.durations.map(seconds => (duration += seconds));
  let buffer;
  let pending = false;
  let closed = false;

  function detach() {
    closed = true;
    for (const event of ['timeupdate', 'seeking', 'waiting']) {
      audio.removeEventListener(event, fillBuffer);
    }
    URL.revokeObjectURL(url);
  }

  function useDownload() {
    if (closed) return;
    const time = audio.currentTime;
    const resume = !audio.paused;
    detach();
    audio.src = downloadUrl;
    audio.addEventListener('loadedmetadata', () => {
      audio.currentTime = time;
      if (resume) audio.play().catch(() => {});
    }, { once: true });
  }

  async function fillBuffer() {
    if (closed || pending || !buffer || buffer.updating || media.readyState === 'closed') return;
    const time = audio.currentTime;
    const buffered = buffer.buffered;
    let covered = time;
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= time + .006 && buffered.end(i) > time) covered = buffered.end(i);
    }
    const segment = ends.findIndex(end => end > covered + .006);
    if (segment < 0) {
      if (time >= duration - 12.1 && media.readyState === 'open') media.endOfStream();
      return;
    }
    if (covered > time + 21) return;
    pending = true;
    try {
      const name = 'part' + String(segment).padStart(4, '0') + '.mp4';
      const response = await fetch(track.path + name, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('Audio segment unavailable');
      const bytes = await response.arrayBuffer();
      if (!closed) buffer.appendBuffer(bytes);
    } catch {
      useDownload();
    } finally {
      pending = false;
    }
  }

  media.addEventListener('sourceopen', () => {
    try {
      buffer = media.addSourceBuffer(mime);
      buffer.timestampOffset = -priming;
      media.duration = duration;
      buffer.addEventListener('error', useDownload);
      buffer.addEventListener('updateend', fillBuffer);
      buffer.appendBuffer(Uint8Array.from(atob(track.opening), c => c.charCodeAt(0)));
    } catch {
      useDownload();
    }
  }, { once: true });
  media.addEventListener('sourceclose', detach, { once: true });
  for (const event of ['timeupdate', 'seeking', 'waiting']) {
    audio.addEventListener(event, fillBuffer);
  }
  audio.disableRemotePlayback = true;
  audio.src = url;
}

async function loadEdition() {
  const response = await fetch('/elliotts-tower/edition.json');
  if (!response.ok) throw new Error('Edition unavailable');
  const data = await response.json();
  const download = document.querySelector('#download');
  setRecording(data.stream, data.audio);
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
