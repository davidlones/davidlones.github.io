const audio = document.querySelector('audio');
const transcript = document.querySelector('article');
const words = [];
const chapters = document.querySelector('#chapters');
const follow = document.querySelector('#follow');
const status = document.querySelector('#status');
const picker = document.querySelector('#screenplay');
const title = document.querySelector('#screenplay-title');
const source = document.querySelector('#source');
const download = document.querySelector('#download');
const followLabel = document.querySelector('#follow-label');
const credits = document.querySelector('#production-credits');
const creditsButton = document.querySelector('#play-credits');
const replayButton = document.querySelector('#replay-screenplay');
const root = '/elliotts-tower/';
const prelude = { id: picker.value, title: title.textContent, source: source.href };

let cues = [];
let byWord = new Map();
let active = null;
let frame = 0;
let stopRecording;
let edition;
let creditsSelected = false;
let pendingSeek;
let catalog = new Map([[prelude.id, prelude]]);
let displayed;
let revision;
let requestId = 0;
let loading = false;

function updateHighlight(scroll = true) {
  if (creditsSelected) return;
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
  if (creditsSelected) {
    const resume = !audio.paused;
    restoreScreenplay();
    pendingSeek = cue;
    if (resume) audio.play().catch(() => {});
    return;
  }
  audio.currentTime = (cue[1] + 1) / 1000;
  updateHighlight();
}

audio.addEventListener('loadedmetadata', () => {
  if (!pendingSeek) return;
  const cue = pendingSeek;
  pendingSeek = undefined;
  seek(cue);
});
audio.addEventListener('play', () => {
  if (creditsSelected) {
    if (picker.value === displayed) status.textContent = '';
  } else if (!frame) tick();
});
for (const event of ['seeking', 'seeked', 'pause', 'ended', 'timeupdate']) {
  audio.addEventListener(event, () => updateHighlight());
}
audio.addEventListener('ended', () => {
  if (picker.value === displayed) playCredits();
});
audio.addEventListener('error', () => {
  if (!audio.hidden) status.textContent = creditsSelected
    ? 'The credits audio could not load.'
    : 'Audio could not load. Try the MP3 download.';
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
  const cue = byWord.get(index) ?? cues.find(([word]) => word >= index);
  if (cue) seek(cue);
  document.getElementById(`chapter-${index}`)?.scrollIntoView({ block: 'start' });
  chapters.value = '';
});
follow.addEventListener('change', () => {
  if (!follow.checked) return;
  if (creditsSelected) credits.scrollIntoView({ block: 'start' });
  else if (active) active[0].scrollIntoView({ block: 'center' });
});

function releaseRecording() {
  stopRecording?.();
  stopRecording = undefined;
  pendingSeek = undefined;
  cancelAnimationFrame(frame);
  frame = 0;
  active?.forEach(span => span.classList.remove('current'));
  active = null;
}

function restoreScreenplay() {
  const rate = audio.playbackRate;
  releaseRecording();
  creditsSelected = false;
  replayButton.hidden = true;
  status.textContent = '';
  audio.setAttribute('aria-label', edition.label);
  setRecording(edition.stream, edition.audio);
  audio.playbackRate = rate;
}

function playCredits(manual = false) {
  if (!edition?.audio || !credits.dataset.audio || (creditsSelected && !manual)) return;
  if (!creditsSelected) {
    const rate = audio.playbackRate;
    releaseRecording();
    creditsSelected = true;
    replayButton.hidden = false;
    audio.setAttribute('aria-label', 'Production credits read by Early');
    audio.src = credits.dataset.audio;
    audio.playbackRate = rate;
    if (follow.checked) credits.scrollIntoView({ block: 'start' });
  }
  audio.play().catch(error => {
    if (creditsSelected && error.name === 'NotAllowedError') {
      status.textContent = 'Press Play to hear the production credits.';
    }
  });
}

creditsButton.addEventListener('click', () => playCredits(true));
replayButton.addEventListener('click', () => {
  restoreScreenplay();
  audio.play().catch(() => {});
});

function setRecording(track, downloadUrl) {
  if (!track) {
    audio.src = downloadUrl;
    return;
  }
  const Media = window.ManagedMediaSource || window.MediaSource;
  const mime = 'audio/mp4; codecs="mp4a.40.2"';
  if (!Media?.isTypeSupported(mime)) {
    audio.src = audio.canPlayType('application/vnd.apple.mpegurl')
      ? track.path + 'audio.m3u8'
      : downloadUrl;
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
  const events = ['timeupdate', 'seeking', 'waiting'];
  const controller = new AbortController();

  function detach() {
    if (closed) return;
    closed = true;
    controller.abort();
    for (const event of events) audio.removeEventListener(event, fillBuffer);
    URL.revokeObjectURL(url);
  }

  function useDownload() {
    if (closed) return;
    const time = audio.currentTime;
    const resume = !audio.paused;
    detach();
    audio.src = downloadUrl;
    const restore = () => {
      audio.currentTime = time;
      if (resume) audio.play().catch(() => {});
    };
    audio.addEventListener('loadedmetadata', restore, { once: true });
    stopRecording = () => audio.removeEventListener('loadedmetadata', restore);
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
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]);
      const response = await fetch(track.path + name, { signal });
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
    if (closed) return;
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
  for (const event of events) audio.addEventListener(event, fillBuffer);
  stopRecording = detach;
  audio.disableRemotePlayback = true;
  audio.src = url;
}

function showEdition(item, data) {
  const hasAudio = Boolean(data.audio);
  const content = document.createElement('template');
  content.innerHTML = data.html;
  const nextWords = [];
  if (hasAudio) {
    for (const span of content.content.querySelectorAll('[data-word]')) {
      const index = Number(span.dataset.word);
      (nextWords[index] ??= []).push(span);
    }
    if (data.wordCount !== nextWords.length) throw new Error('Transcript version mismatch');
  }

  audio.pause();
  releaseRecording();
  creditsSelected = false;
  replayButton.hidden = true;
  edition = { audio: data.audio, stream: data.stream, label: item.title + ' read by ' + (data.narrator ?? 'Early') };
  words.length = 0;
  words.push(...nextWords);
  cues = data.cues ?? [];
  byWord = new Map(cues.map(cue => [cue[0], cue]));
  for (const [index] of cues) words[index].forEach(span => { span.dataset.timed = ''; });
  transcript.replaceChildren(content.content);
  transcript.toggleAttribute('data-synced', hasAudio);
  transcript.setAttribute('aria-label', item.title + ' transcript');
  title.textContent = item.title;
  source.href = item.source;

  audio.hidden = followLabel.hidden = download.hidden = !hasAudio;
  follow.disabled = !hasAudio;
  creditsButton.disabled = !hasAudio || !credits.dataset.audio;
  if (hasAudio) {
    audio.setAttribute('aria-label', edition.label);
    download.href = data.audio;
    download.download = item.title + '.mp3';
    setRecording(data.stream, data.audio);
  } else {
    audio.removeAttribute('src');
    audio.load();
    download.removeAttribute('href');
  }
  chapters.length = 1;
  for (const [index, title] of data.chapters) chapters.add(new Option(title, index));
  chapters.disabled = !data.chapters.length;
  status.textContent = hasAudio ? '' : 'Narration is being prepared.';
  updateHighlight(false);
}

async function fetchJson(path) {
  const response = await fetch(root + path, { cache: 'no-cache', signal: AbortSignal.timeout(90000) });
  if (!response.ok) throw new Error('File unavailable');
  return response.json();
}

async function loadEdition(item, refresh = false) {
  const id = ++requestId;
  loading = true;
  if (!refresh) status.textContent = 'Loading screenplay…';
  try {
    const isPrelude = item.id === prelude.id;
    const data = await fetchJson(isPrelude ? 'edition.json' : `screenplays/${item.id}.json`);
    if (id !== requestId) return;
    const sameEdition = data.sourceSha256 === revision && (!audio.hidden || !data.audio);
    const inProgress = !audio.hidden && (!audio.paused || audio.currentTime > 0 && !audio.ended);
    if (refresh && (sameEdition || inProgress)) return;
    showEdition(item, data);
    if (!refresh && displayed && displayed !== item.id) window.scrollTo(0, 0);
    displayed = item.id;
    revision = data.sourceSha256;
  } catch {
    if (id !== requestId || refresh) return;
    picker.value = catalog.has(displayed) ? displayed : prelude.id;
    status.textContent = 'This screenplay could not load. Try again or open its source in Drive.';
    if (!displayed) source.href = item.source;
  } finally {
    if (id === requestId) loading = false;
  }
}

async function refreshCatalog() {
  try {
    const entries = await fetchJson('screenplays/index.json');
    const selected = picker.value;
    const next = new Map([[prelude.id, prelude], ...entries.map(item => [item.id, item])]);
    const options = [picker.options[0], ...entries.map(item => new Option(item.title, item.id))];
    if (options.length !== picker.length ||
        options.some((option, i) => option.value !== picker.options[i].value || option.text !== picker.options[i].text)) {
      picker.replaceChildren(...options);
      picker.value = next.has(selected) ? selected : prelude.id;
    }
    catalog = next;
    picker.disabled = entries.length === 0;
    if (!next.has(selected)) {
      loadEdition(prelude);
    } else if (!loading && displayed === selected) {
      const item = next.get(selected);
      title.textContent = item.title;
      source.href = item.source;
      transcript.setAttribute('aria-label', item.title + ' transcript');
      if (selected === prelude.id || item.revision !== revision || audio.hidden) loadEdition(item, true);
    }
  } catch {
    if (!loading && displayed === prelude.id) loadEdition(prelude, true);
  }
}

picker.addEventListener('change', () => {
  loadEdition(catalog.get(picker.value));
});
loadEdition(prelude);
refreshCatalog();
setInterval(refreshCatalog, 60000);
