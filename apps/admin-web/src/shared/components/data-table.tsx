import { ReactNode } from "react";

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  className?: string;
  headerClassName?: string;
};

type DataTableProps<Row> = {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  caption?: string;
};

export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  caption
}: DataTableProps<Row>) {
  return (
    <div className="data-table__wrapper">
      <table className="data-table">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.headerClassName} key={column.key} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
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
}
