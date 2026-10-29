// Shared "draw without replacement" picker for the lunch and drink reels.
// Every option comes up once before any repeats, and the first pick of a new
// round never repeats the last pick of the previous one. State lives only in
// the page's memory: nothing is stored, and reloading starts a new round.
export function createSpinBag(random = Math.random) {
  let seen = new Set(), last = null;
  return {
    // `ids` is the current pool, which may change between draws (filters, weekly exclusions).
    draw(ids) {
      if (!ids.length) return null;
      let fresh = ids.filter(id => !seen.has(id));
      if (!fresh.length) {
        seen = new Set();
        fresh = ids.length > 1 ? ids.filter(id => id !== last) : ids;
      }
      const id = fresh[Math.min(fresh.length - 1, Math.floor(random() * fresh.length))];
      seen.add(id);
      last = id;
      return id;
    },
  };
}
