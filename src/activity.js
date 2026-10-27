import { confirmFood, dateKey, readState } from './logic.js';

// Personal mode stores the current choices and their journal in one atomic value.
export function readPersonal(raw, legacyRaw, ids, now = new Date()) {
  let state;
  try { state = JSON.parse(raw); } catch { state = null; }
  const history = readState(state && Array.isArray(state.history) ? JSON.stringify(state.history) : legacyRaw, ids);
  const events = (Array.isArray(state?.events) ? state.events : []).filter(e => {
    if (!e || !['confirm', 'replace', 'snapshot'].includes(e.action) || !ids.includes(e.foodId)) return false;
    if (!readState(JSON.stringify([{ foodId: e.foodId, date: e.date }]), ids).length) return false;
    if (!Number.isFinite(Date.parse(e.occurredAt))) return false;
    return e.action !== 'replace' || (ids.includes(e.previousFoodId) && e.previousFoodId !== e.foodId);
  });
  for (const h of history) {
    if (!events.some(e => e.date === h.date)) events.push({
      id: `snapshot:${h.date}`, action: 'snapshot', date: h.date, foodId: h.foodId,
      previousFoodId: null, occurredAt: now.toISOString(),
    });
  }
  return { history, events };
}
export function confirmPersonal(state, foodId, now = new Date()) {
  const date = dateKey(now);
  const previous = state.history.find(h => h.date === date);
  if (previous?.foodId === foodId) return state;
  return {
    history: confirmFood(state.history, foodId, now),
    events: [...state.events, {
      id: crypto.randomUUID(), action: previous ? 'replace' : 'confirm', date, foodId,
      previousFoodId: previous?.foodId || null, occurredAt: now.toISOString(),
    }],
  };
}
