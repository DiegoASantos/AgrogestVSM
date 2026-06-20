import { ChevronLeft, ChevronRight } from "lucide-react";

export type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
};

export function Pagination({
  page,
  totalPages,
  onPageChange,
  loading
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);

  const pages: number[] = [];

  for (let pageIndex = startPage; pageIndex <= endPage; pageIndex++) {
    pages.push(pageIndex);
  }

  return (
    <nav className="pagination" aria-label="Paginacion de resultados">
      <button
        className="pagination__btn"
        disabled={page <= 1 || loading}
        onClick={() => onPageChange(page - 1)}
        type="button"
        aria-label="Pagina anterior"
      >
        <ChevronLeft size={16} />
      </button>

      {startPage > 1 ? (
        <>
          <button
            className="pagination__page"
            onClick={() => onPageChange(1)}
            type="button"
            disabled={loading}
          >
            1
          </button>
          {startPage > 2 ? <span className="pagination__ellipsis">&hellip;</span> : null}
        </>
      ) : null}

      {pages.map((pageNumber) => (
        <button
          className={`pagination__page${pageNumber === page ? " pagination__page--active" : ""}`}
          key={pageNumber}
          onClick={() => onPageChange(pageNumber)}
          type="button"
          disabled={loading}
          aria-current={pageNumber === page ? "page" : undefined}
        >
          {pageNumber}
        </button>
      ))}

      {endPage < totalPages ? (
        <>
          {endPage < totalPages - 1 ? (
            <span className="pagination__ellipsis">&hellip;</span>
          ) : null}
          <button
            className="pagination__page"
            onClick={() => onPageChange(totalPages)}
            type="button"
            disabled={loading}
          >
            {totalPages}
          </button>
        </>
      ) : null}

      <button
        className="pagination__btn"
        disabled={page >= totalPages || loading}
        onClick={() => onPageChange(page + 1)}
        type="button"
        aria-label="Pagina siguiente"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
