import { describe, expect, it } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import Pagination from "./Pagination";
import { usePagination } from "../utils/usePagination";

const twelve = Array.from({ length: 12 }, (_, i) => i + 1);

describe("usePagination", () => {
  it("splits a list into pages", () => {
    const { result } = renderHook(() => usePagination(twelve, 5));
    expect(result.current.totalPages).toBe(3);
    expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5]);

    act(() => result.current.setPage(3));
    expect(result.current.pageItems).toEqual([11, 12]);
    expect([result.current.firstItem, result.current.lastItem]).toEqual([11, 12]);
  });

  it("goes back to page 1 when the search/filter changes", () => {
    const { result, rerender } = renderHook(({ key }) => usePagination(twelve, 5, key), {
      initialProps: { key: "all" },
    });
    act(() => result.current.setPage(2));
    expect(result.current.page).toBe(2);

    rerender({ key: "burger" });
    expect(result.current.page).toBe(1);
  });

  it("never stays past the last page when the list gets shorter", () => {
    const { result, rerender } = renderHook(({ items }) => usePagination(items, 5), {
      initialProps: { items: twelve },
    });
    act(() => result.current.setPage(3));
    rerender({ items: twelve.slice(0, 7) }); // only 2 pages left
    expect(result.current.page).toBe(2);
    expect(result.current.pageItems).toEqual([6, 7]);
  });
});

function Demo({ totalPages }: { totalPages: number }) {
  const [page, setPage] = useState(1);
  return <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />;
}

describe("Pagination", () => {
  it("is hidden when everything fits on one page", () => {
    const { container } = render(<Demo totalPages={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("moves between pages and marks the current one", async () => {
    const user = userEvent.setup();
    render(<Demo totalPages={3} />);

    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /Prev/ })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("button", { name: "Last page" }));
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();
  });

  it("shortens long page lists with …", () => {
    render(<Pagination page={6} totalPages={12} onPageChange={() => {}} />);
    const labels = screen.getAllByRole("button", { name: /^Page \d+$/ }).map((b) => b.textContent);
    expect(labels).toEqual(["1", "5", "6", "7", "12"]);
  });
});
