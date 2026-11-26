import { useState } from "react";

/**
 * Splits a list into pages.
 *
 * `resetKey` is anything that changes the list's contents in a way the user would
 * notice (a search box, a filter tab). When it changes, we jump back to page 1 so
 * the user isn't left on an empty page 4 of a now-short list.
 */
export function usePagination<T>(items: T[], pageSize: number, resetKey: unknown = null) {
  const [state, setState] = useState({ key: resetKey, page: 1 });
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // A new resetKey means "start again at page 1"; also never go past the last page
  // (e.g. after removing the only item on the last page).
  const requestedPage = Object.is(state.key, resetKey) ? state.page : 1;
  const page = Math.min(Math.max(1, requestedPage), totalPages);

  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  const setPage = (next: number) =>
    setState({ key: resetKey, page: Math.min(Math.max(1, next), totalPages) });

  return {
    page,
    totalPages,
    pageItems,
    setPage,
    totalItems: items.length,
    // 1-based positions of the first/last item on this page, for "Showing 6–10 of 12".
    firstItem: items.length === 0 ? 0 : start + 1,
    lastItem: start + pageItems.length,
  };
}
