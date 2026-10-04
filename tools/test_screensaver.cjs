// Run the real renderer with controlled frames and observable DOM styles.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(process.env.VISUALIZER_SOURCE || 'site/assets/hue-visualizer.js', 'utf8');
function fixture(coarse = false, count = 40) {
  const listeners = new Map();
  const classes = new Set();
  let frame, field;
  const context = new Proxy({}, { get: (o, k) => k in o ? o[k] :
    k.startsWith('create') ? () => ({ addColorStop() {} }) : () => {} });
  const rect = { left: 380, top: 280, width: 40, height: 40 };
  const icons = Array.from({length: count}, () => ({style: {}, getBoundingClientRect: () => rect}));
  const canvas = (full = false) => ({style: {}, setAttribute() {}, remove() {},
    getContext: () => context,
    getBoundingClientRect: () => full ? {left: 0, top: 0, width: 800, height: 600} : rect});
  const window = {devicePixelRatio: 1, matchMedia: () => ({matches: coarse}),
    requestAnimationFrame: fn => (frame = fn, 1), cancelAnimationFrame() {},
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name), dispatchEvent() {}};
  const document = {body: {classList: {contains: name => classes.has(name)}, appendChild: el => field = el},
    createElement: () => canvas(true), querySelectorAll: () => icons};
  vm.runInNewContext(source, {window, document, console, Element: class {},
    CustomEvent: class {constructor(name, options) {this.detail = options.detail;}}});
  const viz = window.createHueVisualizer({canvas: canvas(), mediaEl: {paused: true, ended: false}, variant: 'multiversal'});
  return {viz, icons, classes, opacity: () => Number(field.style.opacity),
    tick(n) {for (let i = 0; i < n; i++) frame();},
    pointer(name) {listeners.get(name)({clientX: 400, clientY: 300, cancelable: false});}};
}
for (const coarse of [false, true]) {
  const f = fixture(coarse);
  f.classes.add('music-screensaver');
  f.tick(150);
  assert(f.opacity() > .95, `silent latch must fill field (coarse=${coarse})`);
  f.viz.setExternalLevel(.3, true);
  f.tick(150);
  assert(f.opacity() > .95, 'audio must sustain the full field');
  f.classes.clear();
  f.tick(700);
  assert(f.opacity() < .01, 'ordinary page audio must not latch the field');
  f.viz.destroy();
}
for (const count of [40, 540]) {
  const f = fixture(false, count);
  f.pointer('pointerdown');
  f.tick(100);
  assert.equal(f.icons.filter(i => i.style.pointerEvents === 'none').length, count);
  f.classes.add('music-screensaver');
  f.pointer('pointerup');
  f.tick(150);
  assert.equal(f.icons.filter(i => i.style.pointerEvents === 'none').length, count, 'silent latch holds dissolved icons');
  f.classes.clear();
  f.tick(700);
  for (const icon of f.icons) for (const prop of ['pointerEvents', 'opacity', 'filter', 'transform']) {
    assert.equal(icon.style[prop], '', `restore ${prop} after ${count} icons`);
  }
  assert(f.opacity() < .01, 'field fades after reassembly');
  f.pointer('pointerdown');
  f.tick(100);
  f.viz.destroy();
  assert(f.icons.every(i => i.style.pointerEvents === ''), 'destroy releases every icon');
}
console.log('PASS: desktop/touch silent latch, audio boundaries, 40/540-icon recovery, destroy');

// Exercise the shell retry policy after play() has armed a URL and then failed.
const shell = fs.readFileSync('site/index.html', 'utf8');
const name = 'shouldAutostartLatchedScreensaverAudio';
const start = shell.indexOf('  function ' + name + '(');
const end = shell.indexOf('\n  }', start) + 4;
const state = {broadcastMode: false, localAudioUrl: '', musicScreensaverPendingAutostart: false, musicScreensaverForcedStartedPlayback: false};
const retry = vm.runInNewContext('(' + shell.slice(start, end) + ')', {assistantState: state});
assert.equal(retry(), true);
state.localAudioUrl = '/audio/assistant-default-hold-loop-a.mp3';
assert.equal(retry(), false, 'do not replace user-selected audio');
state.musicScreensaverPendingAutostart = true;
state.musicScreensaverForcedStartedPlayback = true;
assert.equal(retry(), true, 'retry latch-owned audio after autoplay rejection');
state.broadcastMode = true;
assert.equal(retry(), false, 'broadcast retains priority');
console.log('PASS: pending autoplay retry preserves audio ownership and broadcast priority');
