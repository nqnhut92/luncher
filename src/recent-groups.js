export const RECENT_GROUPS_KEY = 'luncher-recent-groups-v1';
export const RECENT_GROUPS_LIMIT = 10;

export function readRecentGroups(raw) {
  try {
    const values = JSON.parse(raw);
    if (!Array.isArray(values)) return [];
    const seen = new Set();
    return values.filter(group => group && typeof group.id === 'string' && /^[A-Za-z0-9]{6}$/.test(group.id)
      && typeof group.name === 'string' && group.name.trim().length > 0 && group.name.trim().length <= 60
      && typeof group.lastVisited === 'number' && Number.isFinite(group.lastVisited) && group.lastVisited >= 0)
      .sort((a, b) => b.lastVisited - a.lastVisited)
      .filter(group => { if (seen.has(group.id)) return false; seen.add(group.id); return true; })
      .slice(0, RECENT_GROUPS_LIMIT)
      .map(({ id, name, lastVisited }) => ({ id, name: name.trim(), lastVisited }));
  } catch { return []; }
}

export function rememberGroup(groups, room, now = Date.now()) {
  return readRecentGroups(JSON.stringify([
    { id: room.id, name: room.name, lastVisited: now },
    ...groups.filter(group => group.id !== room.id),
  ]));
}
export function updateRememberedGroup(groups, room) {
  // Renaming/refreshing must not re-add an entry forgotten in another tab.
  return readRecentGroups(JSON.stringify(groups.map(group => group.id === room.id ? { ...group, name: room.name } : group)));
}
