const MEMORY_KEY = 'dreamthread.demo.memory.v1';
let saved = [];
try { const raw = JSON.parse(localStorage.getItem(MEMORY_KEY) || '[]'); if (Array.isArray(raw)) saved = raw.filter(x => typeof x === 'string'); } catch { /* Private browsing can disable storage. */ }

export const state = {
  query: '', emotion: '', days: null, dateLabel: 'Last 30 days', motif: 'house',
  saved: new Set(saved), memory: false,
  capture: null,
  graph: {selected:'house',filter:'All',zoom:1,panX:0,panY:0,routeMotif:''},
  detective: null,
};

export function toggleMemory(id) {
  state.saved.has(id) ? state.saved.delete(id) : state.saved.add(id);
  try { localStorage.setItem(MEMORY_KEY, JSON.stringify([...state.saved])); } catch { /* In-memory fallback. */ }
  return state.saved.has(id);
}

export function clearFilters() {
  state.query = ''; state.emotion = ''; state.days = null; state.dateLabel = 'Last 30 days';
}
