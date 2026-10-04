/* Loaded only in the generated GitHub Pages desktop, never in live source. */
window.SOL_STATIC_ARCHIVE = true;
// Reserve space for the archive navigation instead of covering the first icon row.
const archiveLayout = document.createElement('style');
archiveLayout.textContent = '.desktop { top: 42px !important; }';
document.head.appendChild(archiveLayout);
window.solOpenLiveService = function (path) {
  window.open(new URL(path, 'https://sol.system42.one').href, '_blank', 'noopener,noreferrer');
};
document.addEventListener('DOMContentLoaded', () => {
  const bar = document.createElement('nav');
  bar.id = 'static-archive-navigation';
  bar.setAttribute('aria-label', 'Archive and live site');
  bar.innerHTML = '<strong>Sol archive</strong> · <a href="/archive.html">Browse</a> · <a href="/live-services.html">Live services</a> · <a href="https://sol.system42.one" target="_blank" rel="noopener">Open live desktop ↗</a>';
  Object.assign(bar.style, {position:'fixed', right:'6px', top:'4px', zIndex:'1100', background:'#dfdfdf', color:'#111', padding:'6px 9px', font:'12px Arial', border:'1px solid #fff', maxWidth:'calc(100vw - 32px)'});
  document.body.appendChild(bar);
  const message = document.getElementById('assistant-message');
  if (message) message.textContent = 'You are browsing the static archive. Chat, generated speech and the built-in hold program open on the live Sol server. Local audio and the visual backdrop remain available here.';
});
