export function isStandaloneApp(win = typeof window === 'undefined' ? null : window) {
  if (!win) return false;
  return Boolean(
    win.matchMedia?.('(display-mode: standalone)')?.matches ||
    win.navigator?.standalone === true
  );
}

export function watchStandaloneApp(onChange, win = typeof window === 'undefined' ? null : window) {
  const media = win?.matchMedia?.('(display-mode: standalone)');
  if (!media?.addEventListener) return () => {};
  const listener = () => onChange(isStandaloneApp(win));
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}
