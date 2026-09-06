const STORAGE_KEY = 'nexovira_search_history';
const MAX_HISTORY_ITEMS = 10;

/**
 * Retrieves the list of recent search queries from localStorage safely.
 */
export function getSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .slice(0, MAX_HISTORY_ITEMS);
    }
  } catch (err) {
    console.warn('Failed to read search history from localStorage:', err);
  }
  return [];
}

/**
 * Adds a new search query to the beginning of the history list,
 * deduplicating and trimming to MAX_HISTORY_ITEMS.
 */
export function saveSearchQuery(query: string): string[] {
  const cleanQuery = query.trim();
  if (!cleanQuery || typeof window === 'undefined') return getSearchHistory();

  try {
    const current = getSearchHistory();
    // Remove if already exists (case-insensitive check for deduplication, keeping user's latest case)
    const filtered = current.filter(
      (item) => item.toLowerCase() !== cleanQuery.toLowerCase()
    );
    const updated = [cleanQuery, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Dispatch an event so any other search components can sync in real-time
    window.dispatchEvent(new CustomEvent('nexovira_search_history_changed', { detail: { history: updated } }));
    return updated;
  } catch (err) {
    console.warn('Failed to save search query to localStorage:', err);
    return getSearchHistory();
  }
}

/**
 * Removes a specific search query from the history list.
 */
export function removeSearchQuery(queryToRemove: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = getSearchHistory();
    const updated = current.filter(
      (item) => item.toLowerCase() !== queryToRemove.toLowerCase()
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('nexovira_search_history_changed', { detail: { history: updated } }));
    return updated;
  } catch (err) {
    console.warn('Failed to remove search query from localStorage:', err);
    return getSearchHistory();
  }
}

/**
 * Clears the entire search history from localStorage.
 */
export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('nexovira_search_history_changed', { detail: { history: [] } }));
  } catch (err) {
    console.warn('Failed to clear search history from localStorage:', err);
  }
}
