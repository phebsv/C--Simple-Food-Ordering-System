import "./Pagination.css";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Optional "Showing 1–5 of 12 orders" summary. */
  firstItem?: number;
  lastItem?: number;
  totalItems?: number;
  itemLabel?: string;
};

/** First / Prev / page numbers / Next / Last. Hidden when everything fits on one page. */
export default function Pagination({
  page,
  totalPages,
  onPageChange,
  firstItem,
  lastItem,
  totalItems,
  itemLabel = "items",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const atStart = page === 1;
  const atEnd = page === totalPages;

  return (
    <nav className="pager" aria-label="Pagination">
      {totalItems !== undefined && (
        <p className="pager-summary">
          Showing {firstItem}–{lastItem} of {totalItems} {itemLabel}
        </p>
      )}
      <div className="pager-controls">
        <button
          type="button"
          className="pager-btn"
          onClick={() => onPageChange(1)}
          disabled={atStart}
          aria-label="First page"
        >
          «
        </button>
        <button
          type="button"
          className="pager-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={atStart}
        >
          ‹ Prev
        </button>

        {pageNumbers(page, totalPages).map((number, index) =>
          number === null ? (
            <span key={`gap-${index}`} className="pager-gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={number}
              type="button"
              className={`pager-btn pager-number${number === page ? " pager-current" : ""}`}
              onClick={() => onPageChange(number)}
              aria-label={`Page ${number}`}
              aria-current={number === page ? "page" : undefined}
            >
              {number}
            </button>
          ),
        )}

        <button
          type="button"
          className="pager-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={atEnd}
        >
          Next ›
        </button>
        <button
          type="button"
          className="pager-btn"
          onClick={() => onPageChange(totalPages)}
          disabled={atEnd}
          aria-label="Last page"
        >
          »
        </button>
      </div>
    </nav>
  );
}

/** Page numbers to show, with null for "…": e.g. 1 … 4 5 6 … 12. */
function pageNumbers(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const numbers = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...numbers].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);

  const result: (number | null)[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) result.push(null);
    result.push(n);
  });
  return result;
}
