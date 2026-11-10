import { createManifestHandler } from '../server/manifest.js';
import { neonStore } from '../server/neon.js';

export default createManifestHandler(neonStore);
