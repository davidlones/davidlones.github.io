'use strict';

const frame = document.getElementById('field-frame');
const versionLink = document.getElementById('notebook-version');
const source = new URL(frame.dataset.src, location.href);
const shortVersion = new URLSearchParams(location.search).get('phase3') === '3';
if (shortVersion) {
  source.searchParams.set('phase3', '3');
  versionLink.href = location.pathname + '#notebook';
  versionLink.textContent = 'Switch to the full 20-question version';
}

// The sandbox has an opaque origin. Accept only a bounded layout number
// from this particular frame. No answers cross the frame.
window.addEventListener('message', (event) => {
  if (event.source !== frame.contentWindow || event.origin !== 'null') return;
  const height = event.data;
  if (!Number.isInteger(height) || height < 1 || height > 100000) return;
  frame.style.height = height + 'px';
});

frame.src = source.href;
frame.hidden = false;
versionLink.hidden = false;
