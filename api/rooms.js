import { createHandler } from '../server/handler.js';
import { neonStore } from '../server/neon.js';

export default createHandler(neonStore);
