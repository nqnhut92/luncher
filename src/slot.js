// Shared slot-machine pieces for the lunch reel and the afternoon drink reel.
export const ROW_HEIGHT = 112;
// The window shows three rows; row i holds pool[i-1], so translating by
// `rotation` rows centers pool[rotation % pool.length].
export function reelSequence(pool) {
  const size = pool.length;
  return Array.from({length: size*7+3}, (_, i) => pool[(i+size-1)%size]).filter(Boolean);
}
// Restart from the top, then ease down to `rotation`; reduced motion settles almost at once.
export function runReel(track, rotation, done) {
  track.style.transition = 'none';
  track.style.transform = 'translateY(0)';
  void track.offsetHeight;
  track.style.transition = '';
  requestAnimationFrame(() => requestAnimationFrame(() => { track.style.transform = `translateY(-${rotation*ROW_HEIGHT}px)`; }));
  setTimeout(done, matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : 4250);
}
export const leverSvg = `<svg viewBox="0 0 64 244" aria-hidden="true" focusable="false"><defs>
<linearGradient id="lever-metal"><stop stop-color="#79512c"/><stop offset=".24" stop-color="#e7c27b"/><stop offset=".46" stop-color="#fff0bc"/><stop offset=".65" stop-color="#bd8a42"/><stop offset=".87" stop-color="#f3d394"/><stop offset="1" stop-color="#805527"/></linearGradient>
<radialGradient id="lever-ball" cx="32%" cy="25%" r="78%"><stop stop-color="#f3b68b"/><stop offset=".23" stop-color="#de7945"/><stop offset=".65" stop-color="#b74b24"/><stop offset="1" stop-color="#71351c"/></radialGradient>
</defs><path d="M1 180H33V213H1Z" fill="url(#lever-metal)" stroke="#95662e"/><ellipse cx="32" cy="196" rx="20" ry="28" fill="url(#lever-metal)" stroke="#805527"/><ellipse cx="36" cy="196" rx="11" ry="20" fill="#8e612f"/><ellipse cx="38" cy="196" rx="8" ry="15" fill="url(#lever-metal)"/>
<g class="lever-arm"><path d="M35 194L42 46" stroke="#5f3b22" stroke-width="11" stroke-linecap="round"/><path d="M35 193L42 46" stroke="url(#lever-metal)" stroke-width="8" stroke-linecap="round"/><ellipse cx="43" cy="32" rx="21" ry="25" fill="#61371c" opacity=".14" transform="translate(1 3)"/><ellipse cx="42" cy="30" rx="21" ry="25" fill="url(#lever-ball)" stroke="#bc683c"/><ellipse cx="35" cy="17" rx="7" ry="4" fill="#ffe0b9" opacity=".45" transform="rotate(-30 35 17)"/></g></svg>`;
