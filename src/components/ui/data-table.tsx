import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
};

type DataTableProps<T> = {
  title?: string;
  eyebrow?: string;
  description?: string;
  rows: T[];
  columns: Array<DataTableColumn<T>>;
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  getRowActionLabel?: (row: T) => string;
  minWidth?: string;
  emptyTitle?: string;
  emptyBody?: string;
  footer?: ReactNode;
  action?: ReactNode;
};

export function DataTable<T>({
  title,
  eyebrow,
  description,
  rows,
  columns,
  getRowKey,
  onRowClick,
  getRowActionLabel,
  minWidth = "920px",
  emptyTitle = "No records found",
  emptyBody = "Adjust the filters or create a new record to populate this table.",
  footer,
  action,
}: DataTableProps<T>) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#dfe8f6] bg-white shadow-[0_20px_55px_rgba(18,31,67,0.06)]">
      {title || eyebrow || description || action ? (
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#edf1f7] bg-[linear-gradient(135deg,#ffffff,#f8fbff)] px-5 py-4">
          <div className="min-w-0">
            {eyebrow ? <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">{eyebrow}</p> : null}
            {title ? <h3 className="mt-1 text-xl font-black text-[#11143a]">{title}</h3> : null}
            {description ? <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#63708a]">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left" style={{ minWidth }}>
          <thead className="sticky top-0 z-10 bg-[#f7f9fd]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`border-b border-[#e5ebf5] px-4 py-3 text-[11px] font-black uppercase tracking-[0.04em] text-[#63708a] ${column.headerClassName ?? ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  role={onRowClick ? "button" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={onRowClick ? getRowActionLabel?.(row) ?? "Open row" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  className={`border-b border-[#edf1f7] transition hover:bg-[#fbfcff] ${
                    onRowClick ? "cursor-pointer focus-visible:bg-[#f1edff] focus-visible:outline-none" : ""
                  }`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-4 align-middle text-sm text-[#11143a] ${column.className ?? ""}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10">
                  <div className="rounded-xl border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-7 text-center">
                    <p className="text-sm font-black text-[#11143a]">{emptyTitle}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[#74809a]">{emptyBody}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {footer ? <div className="border-t border-[#edf1f7] bg-[#fbfcff] px-5 py-4">{footer}</div> : null}
    </section>
  );
}
