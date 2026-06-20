import { type ReactNode, useMemo, useState } from "react";

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
};

export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  caption,
  initialSort
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
      <table className="data-table">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
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
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td className={column.className} key={column.key}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
