import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

export type SortDirection = "asc" | "desc";

export type SortState = {
  key: string;
  direction: SortDirection;
};

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  sortValue?: (row: Row) => string | number;
};

type DataTableProps<Row> = {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string | number;
  caption?: string;
  initialSort?: SortState;
  pagination?: DataTablePagination;
};

export type DataTablePagination = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  summary?: ReactNode;
};

export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  caption,
  initialSort,
  pagination
}: DataTableProps<Row>) {
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null);

  const sortedRows = useMemo(() => {
    if (!sort) {
      return rows;
    }

    const column = columns.find((col) => col.key === sort.key);

    if (!column?.sortable) {
      return rows;
    }

    return [...rows].sort((leftRow, rightRow) => {
      const leftValue = column.sortValue
        ? column.sortValue(leftRow)
        : extractCellText(column.cell(leftRow));
      const rightValue = column.sortValue
        ? column.sortValue(rightRow)
        : extractCellText(column.cell(rightRow));

      return compareValues(leftValue, rightValue, sort.direction);
    });
  }, [rows, sort, columns]);

  return (
    <div className="data-table__wrapper">
      <Table className="data-table">
        {caption ? <TableCaption>{caption}</TableCaption> : null}
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                className={column.headerClassName}
                key={column.key}
                scope="col"
              >
                {column.sortable ? (
                  <button
                    className="data-table__sort-btn"
                    onClick={() => handleSortToggle(column.key)}
                    type="button"
                    aria-label={`Ordenar por ${column.header}`}
                  >
                    {column.header}
                    <SortIndicator
                      active={sort?.key === column.key}
                      direction={sort?.key === column.key ? sort.direction : null}
                    />
                  </button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row) => (
            <TableRow key={getRowKey(row)}>
              {columns.map((column) => (
                <TableCell className={column.className} key={column.key}>
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pagination ? <DataTablePaginationControls pagination={pagination} /> : null}
    </div>
  );

  function handleSortToggle(key: string) {
    setSort((current) => {
      if (current?.key === key) {
        if (current.direction === "asc") {
          return { key, direction: "desc" };
        }

        return null;
      }

      return { key, direction: "asc" };
    });
  }
}

function DataTablePaginationControls({
  pagination
}: {
  pagination: DataTablePagination;
}) {
  const { page, totalPages, onPageChange, loading, summary } = pagination;

  if (totalPages <= 1 && !summary) {
    return null;
  }

  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);
  const pages: number[] = [];

  for (let pageIndex = startPage; pageIndex <= endPage; pageIndex++) {
    pages.push(pageIndex);
  }

  return (
    <div className="data-table__footer">
      {summary ? <p className="body-copy data-table__summary">{summary}</p> : null}
      {totalPages > 1 ? (
        <nav className="pagination pagination--datatable" aria-label="Paginacion de resultados">
          <Button
            aria-label="Pagina anterior"
            className="pagination__btn"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronLeft size={16} />
          </Button>

          {startPage > 1 ? (
            <>
              <Button
                className="pagination__page"
                disabled={loading}
                onClick={() => onPageChange(1)}
                size="icon"
                type="button"
                variant="ghost"
              >
                1
              </Button>
              {startPage > 2 ? <span className="pagination__ellipsis">&hellip;</span> : null}
            </>
          ) : null}

          {pages.map((pageNumber) => (
            <Button
              aria-current={pageNumber === page ? "page" : undefined}
              className={`pagination__page${pageNumber === page ? " pagination__page--active" : ""}`}
              disabled={loading}
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              size="icon"
              type="button"
              variant={pageNumber === page ? "default" : "ghost"}
            >
              {pageNumber}
            </Button>
          ))}

          {endPage < totalPages ? (
            <>
              {endPage < totalPages - 1 ? (
                <span className="pagination__ellipsis">&hellip;</span>
              ) : null}
              <Button
                className="pagination__page"
                disabled={loading}
                onClick={() => onPageChange(totalPages)}
                size="icon"
                type="button"
                variant="ghost"
              >
                {totalPages}
              </Button>
            </>
          ) : null}

          <Button
            aria-label="Pagina siguiente"
            className="pagination__btn"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronRight size={16} />
          </Button>
        </nav>
      ) : null}
    </div>
  );
}

function SortIndicator({
  active,
  direction
}: {
  active: boolean;
  direction: SortDirection | null;
}) {
  if (!active) {
    return <span className="data-table__sort-chevron data-table__sort-chevron--inactive">&#8693;</span>;
  }

  return (
    <span className={`data-table__sort-chevron data-table__sort-chevron--${direction}`}>
      {direction === "asc" ? "\u25B2" : "\u25BC"}
    </span>
  );
}

function compareValues(
  leftValue: string | number,
  rightValue: string | number,
  direction: SortDirection
) {
  const multiplier = direction === "asc" ? 1 : -1;

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return (leftValue - rightValue) * multiplier;
  }

  return String(leftValue).localeCompare(String(rightValue)) * multiplier;
}

function extractCellText(node: ReactNode): string {
  if (node === null || node === undefined) {
    return "";
  }

  if (typeof node === "string") {
    return node;
  }

  if (typeof node === "number") {
    return String(node);
  }

  return "";
}
