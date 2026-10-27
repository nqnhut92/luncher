import { createQrHandler } from '../server/preview.js';
import { neonStore } from '../server/neon.js';

export default createQrHandler(neonStore);
