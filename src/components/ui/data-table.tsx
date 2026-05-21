import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
}

/**
 * Shared DataTable — renders a styled HTML table with consistent header/row
 * styling that matches the xcare admin and dashboard design language.
 *
 * @example
 * <DataTable
 *   columns={[
 *     { key: "name", header: "Name", cell: (r) => r.name },
 *     { key: "status", header: "Status", cell: (r) => <Badge>{r.status}</Badge> },
 *   ]}
 *   data={rows}
 *   keyExtractor={(r) => r.id}
 *   emptyMessage="Keine Einträge gefunden."
 * />
 */
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "Keine Einträge gefunden.",
  className,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className={cn("bg-white rounded-xl border border-[--border] shadow-sm overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[--border] bg-[--muted]/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "text-left px-4 py-3 text-xs font-semibold text-[--muted-foreground] uppercase tracking-wide whitespace-nowrap",
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[--border]">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-[--muted-foreground]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className={cn(
                    "transition-colors",
                    onRowClick && "cursor-pointer hover:bg-[--muted]/30"
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn("px-4 py-3 text-[--foreground]", col.className)}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
