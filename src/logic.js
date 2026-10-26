export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function weekStart(date = new Date()) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - (monday.getDay()+6)%7);
  return dateKey(monday);
}
export function availableFoods(foods, history, category = 'all', repeat = false, date = new Date()) {
  const used = new Set(history.filter(h => h.date >= weekStart(date) && h.date <= dateKey(date)).map(h => h.foodId));
  return foods.filter(f => (category === 'all' || f.type === category) && (repeat || !used.has(f.id)));
}
export function confirmFood(history, foodId, date = new Date()) {
  const today = dateKey(date);
  return [...history.filter(h => h.date !== today), {foodId, date: today}].sort((a,b)=>a.date.localeCompare(b.date));
}
export function pickIndex(length, random = Math.random) {
  return length ? Math.min(length-1, Math.floor(random()*length)) : -1;
}
export function readState(raw, ids) {
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(h => h && ids.includes(h.foodId) && /^\d{4}-\d{2}-\d{2}$/.test(h.date) && dateKey(new Date(`${h.date}T12:00:00`)) === h.date)
      .filter((h,i,a)=>a.findLastIndex(x=>x.date===h.date)===i);
  } catch { return []; }
}
