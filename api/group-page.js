import { createPageHandler } from '../server/preview.js';
import { neonStore } from '../server/neon.js';

// The built SPA shell is a static asset of the same deployment; fetch it once per instance.
let shell;
async function loadHtml(req) {
  shell ??= fetch(`https://${req.headers.host}/index.html`).then(response => {
    if (!response.ok) throw new Error('SPA shell unavailable');
    return response.text();
  }).catch(error => { shell = undefined; throw error; });
  return shell;
}

export default createPageHandler(neonStore, loadHtml);
