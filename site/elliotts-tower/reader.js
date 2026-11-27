const audio = document.querySelector('audio');
const transcript = document.querySelector('article');
const words = [];
const chapters = document.querySelector('#chapters');
const follow = document.querySelector('#follow');
const status = document.querySelector('#status');
const revisionNotice = document.querySelector('#revision-notice');
let archivedEditions = new Map();
const requested = new URLSearchParams(location.search);
const requestedScreenplay = requested.get('screenplay');
const picker = document.querySelector('#screenplay');
const voicePicker = document.querySelector('#voice');
const title = document.querySelector('#screenplay-title');
const source = document.querySelector('#source');
const download = document.querySelector('#download');
const followLabel = document.querySelector('#follow-label');
const credits = document.querySelector('#production-credits');
const creditsButton = document.querySelector('#play-credits');
const replayButton = document.querySelector('#replay-screenplay');
const retryButton = document.querySelector('#retry-edition');
const shareButton = document.querySelector('#share-screenplay');
const shareStatus = document.querySelector('#share-status');
const canonical = document.querySelector('link[rel="canonical"]').href;
const root = '/elliotts-tower/';
const prelude = { id: picker.value, title: title.textContent, source: source.href };

let cues = [];
let byWord = new Map();
let active = null;
let frame = 0;
let stopRecording;
let fallbackRecording;
let edition;
let creditsSelected = false;
let pendingSeek;
let catalog = new Map([[prelude.id, prelude]]);
let displayed;
let displayedVoice;
let displayedAudio;
let voiceNotice = '';
let revision;
let editionRequest;
let loading = false;
let shareConfirmation;

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
  if (fallbackRecording) {
    fallbackRecording();
    return;
  }
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
  fallbackRecording = undefined;
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
  status.textContent = voiceNotice;
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
    if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      fallbackRecording = () => {
        fallbackRecording = undefined;
        audio.src = downloadUrl;
      };
      audio.src = track.path + 'audio.m3u8';
    } else {
      audio.src = downloadUrl;
    }
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
    if (fallbackRecording !== useDownload) return;
    const time = audio.currentTime;
    const resume = !audio.paused;
    detach();
    fallbackRecording = undefined;
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
      const bytes = await fetchWithTimeout(track.path + name, 12000, controller.signal, response => {
        if (!response.ok) throw new Error('Audio segment unavailable');
        return response.arrayBuffer();
      });
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
  fallbackRecording = useDownload;
  audio.disableRemotePlayback = true;
  audio.src = url;
}

function showEdition(item, data, voiceName, notice) {
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
  const screenplayTitle = item.title || content.content.querySelector('h1,h2')?.textContent.trim() || 'Screenplay';
  edition = { audio: data.audio, stream: data.stream, label: screenplayTitle + ' read by ' + (data.narrator ?? voiceName) };
  words.length = 0;
  words.push(...nextWords);
  cues = data.cues ?? [];
  byWord = new Map(cues.map(cue => [cue[0], cue]));
  for (const [index] of cues) words[index].forEach(span => { span.dataset.timed = ''; });
  transcript.replaceChildren(content.content);
  transcript.toggleAttribute('data-synced', hasAudio);
  transcript.setAttribute('aria-label', screenplayTitle + ' transcript');
  title.textContent = screenplayTitle;
  source.href = item.source;

  audio.hidden = followLabel.hidden = download.hidden = !hasAudio;
  follow.disabled = !hasAudio;
  creditsButton.disabled = !hasAudio || !credits.dataset.audio;
  if (hasAudio) {
    audio.setAttribute('aria-label', edition.label);
    download.href = data.audio;
    download.download = screenplayTitle + ' — ' + voiceName + '.mp3';
    setRecording(data.stream, data.audio);
  } else {
    audio.removeAttribute('src');
    audio.load();
    download.removeAttribute('href');
  }
  chapters.length = 1;
  for (const [index, title] of data.chapters) chapters.add(new Option(title, index));
  chapters.disabled = !data.chapters.length;
  voiceNotice = notice;
  status.textContent = notice;
  updateHighlight(false);
}

async function fetchWithTimeout(path, timeout, signal, read = response => response) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(cancel, timeout);
  try {
    const response = await fetch(path, { signal: controller.signal });
    return await read(response);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

function fetchJson(path, { signal, optional = false, timeout = 30000 } = {}) {
  return fetchWithTimeout(path, timeout, signal, response => {
    if (optional && response.status === 404) return null;
    if (!response.ok) throw new Error('File unavailable');
    return response.json();
  });
}

function showSourceRevision(item, recordedHash) {
  const current = archivedEditions.get(item.id);
  revisionNotice.replaceChildren();
  if (!current || !recordedHash || current.sha256 === recordedHash) {
    revisionNotice.hidden = true;
    return;
  }
  revisionNotice.hidden = false;
  revisionNotice.append('This transcript, audio, and word timing follow an earlier source revision. ');
  const latest = document.createElement('a');
  latest.href = current.canonical_url;
  latest.textContent = 'Read the latest published text';
  revisionNotice.append(latest);
}

async function loadEdition(item, refresh = false) {
  editionRequest?.abort();
  const request = new AbortController();
  editionRequest = request;
  loading = true;
  const { signal } = request;
  const voice = voicePicker.value;
  if (!refresh) {
    retryButton.hidden = true;
    status.textContent = 'Loading screenplay…';
  }
  try {
    const earlyPath = item.id === prelude.id ? 'edition.json' : `screenplays/${item.id}.json`;
    let data;
    let voiceName = voice === 'early' ? 'Early' : 'SOL–GPT';
    let notice = '';
    if (voice === 'sol-gpt') {
      try {
        data = await fetchJson(root + `screenplays/${item.id}.sol-gpt.json`, { signal, optional: true });
        if (!data) notice = 'SOL–GPT narration is being prepared. Early is available below.';
      } catch (error) {
        if (signal.aborted) return;
        notice = 'SOL–GPT could not load. Early is available below.';
      }
      if (!data) {
        if (displayed === item.id && displayedVoice === 'early' && edition?.audio) {
          voiceNotice = notice;
          status.textContent = notice;
          retryButton.hidden = false;
          return;
        }
        voiceName = 'Early';
      }
    }
    data ??= await fetchJson(root + earlyPath, { signal });
    if (signal.aborted) return;
    const sameEdition = displayed === item.id && data.sourceSha256 === revision && data.audio === displayedAudio;
    const inProgress = !audio.hidden && (!audio.paused || audio.currentTime > 0 && !audio.ended);
    if (refresh && (sameEdition || inProgress)) {
      if (sameEdition && voiceNotice !== notice) {
        voiceNotice = notice;
        status.textContent = notice;
      } else if (inProgress && !notice && voiceNotice) {
        voiceNotice = 'SOL–GPT is ready. Choose Retry loading to switch voices.';
        status.textContent = voiceNotice;
        retryButton.hidden = false;
      }
      return;
    }
    showEdition(catalog.get(item.id) ?? item, data, voiceName, notice);
    retryButton.hidden = !notice;
    if (!refresh && displayed && displayed !== item.id) window.scrollTo(0, 0);
    displayed = item.id;
    displayedVoice = voiceName === 'Early' ? 'early' : 'sol-gpt';
    displayedAudio = data.audio;
    revision = data.sourceSha256;
    showSourceRevision(item, revision);
  } catch {
    if (signal.aborted || refresh) return;
    status.textContent = 'This screenplay could not load. Try again or open its source in Drive.';
    retryButton.hidden = false;
    if (!displayed) source.href = item.source;
  } finally {
    if (editionRequest === request) loading = false;
  }
}

async function refreshArchiveMetadata() {
  try {
    const archived = await fetchJson('/screenplay-logs/editions.json', { timeout: 15000 });
    archivedEditions = new Map(archived.map(item => [item.id, item]));
    if (displayed) showSourceRevision({ id: displayed }, revision);
  } catch {
    // The screenplay catalog and recordings can load independently of this metadata.
  }
}

async function refreshCatalog() {
  try {
    const entries = await fetchJson(root + 'screenplays/index.json');
    const selected = picker.value;
    const next = new Map([[prelude.id, prelude], ...entries.map(item => [item.id, item])]);
    const pending = catalog.get(selected);
    if (!next.has(selected) && pending && !pending.title) next.set(selected, pending);
    const options = Array.from(next.values(), item => new Option(item.title || 'Requested screenplay', item.id));
    if (options.length !== picker.length ||
        options.some((option, i) => option.value !== picker.options[i].value || option.text !== picker.options[i].text)) {
      picker.replaceChildren(...options);
      picker.value = next.has(selected) ? selected : prelude.id;
    }
    catalog = next;
    picker.disabled = next.size < 2;
    if (picker.value !== selected) {
      selectAndLoad();
    } else if (displayed === selected) {
      const item = next.get(selected);
      if (item.title) {
        title.textContent = item.title;
        transcript.setAttribute('aria-label', item.title + ' transcript');
      }
      source.href = item.source;
      if (!loading && (voicePicker.value === 'sol-gpt' || selected === prelude.id || item.revision !== revision)) {
        void loadEdition(item, true);
      }
    } else if (!loading) {
      void loadEdition(next.get(picker.value));
    }
  } catch {
    picker.disabled = catalog.size < 2;
  }
}

function loadSelection() {
  return loadEdition(catalog.get(picker.value));
}

function setSelectionParams(url) {
  url.searchParams.set('screenplay', picker.value);
  url.searchParams.set('voice', voicePicker.value);
  return url;
}

function clearShareConfirmation() {
  clearTimeout(shareConfirmation);
  shareStatus.textContent = '';
}

function selectAndLoad() {
  clearShareConfirmation();
  try {
    history.replaceState(history.state, '', setSelectionParams(new URL(location.href)));
  } catch {
    // Embedded browsers may restrict address-bar updates.
  }
  return loadSelection();
}

async function copyShareLink() {
  const link = setSelectionParams(new URL(canonical)).href;
  try {
    await navigator.clipboard.writeText(link);
    clearShareConfirmation();
    shareStatus.textContent = 'Link copied';
    shareConfirmation = setTimeout(clearShareConfirmation, 2200);
  } catch {
    window.prompt('Copy screenplay share link', link);
  }
}

function refreshReader() {
  void refreshCatalog();
  void refreshArchiveMetadata();
}

picker.addEventListener('change', selectAndLoad);
voicePicker.addEventListener('change', selectAndLoad);
retryButton.addEventListener('click', loadSelection);
shareButton.addEventListener('click', copyShareLink);
const requestedVoice = requested.get('voice');
if (Array.from(voicePicker.options).some(option => option.value === requestedVoice)) {
  voicePicker.value = requestedVoice;
}
if (requestedScreenplay !== prelude.id && /^[A-Za-z0-9_-]{10,128}$/.test(requestedScreenplay ?? '')) {
  const item = { id: requestedScreenplay, source: `https://drive.google.com/open?id=${requestedScreenplay}` };
  catalog.set(item.id, item);
  picker.add(new Option('Requested screenplay', item.id));
  picker.value = item.id;
  picker.disabled = false;
}
void loadSelection().finally(refreshArchiveMetadata);
void refreshCatalog();
setInterval(refreshReader, 60000);
