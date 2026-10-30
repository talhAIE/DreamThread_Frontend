import { createLocalRepository } from './local-repository.js';
let storage=null;
try { if(typeof window!=='undefined')storage=globalThis.localStorage || null; } catch { /* Session-only mode. */ }
// This is the single adapter boundary for future backend integration.
export const repository=createLocalRepository(storage);
