import type { ReactNode } from 'react';

export type Column<T> = {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
};

type TableProps<T> = {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  empty?: string;
  loading?: boolean;
  expandedRowKey?: string | null;
  expandedRowContent?: (row: T) => ReactNode;
};

export function Table<T>({
  columns,
  data,
  rowKey,
  empty = 'Nenhum item.',
  loading,
  expandedRowKey,
  expandedRowContent,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className={`px-4 py-2.5 text-${col.align ?? 'left'} font-medium text-xs uppercase tracking-wide`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-slate-500">
                Carregando...
              </td>
            </tr>
          )}
          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                {empty}
              </td>
            </tr>
          )}
          {!loading &&
            data.map((row) => {
              const key = rowKey(row);
              const isExpanded = expandedRowKey === key;
              return (
                <>
                  <tr key={key} className="hover:bg-slate-50 transition-colors">
                    {columns.map((col, i) => (
                      <td
                        key={i}
                        className={`px-4 py-2.5 text-${col.align ?? 'left'} text-slate-700`}
                      >
                        {col.render ? col.render(row) : col.accessor ? String(row[col.accessor] ?? '—') : null}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && expandedRowContent && (
                    <tr key={`${key}-expanded`} className="bg-slate-50">
                      <td colSpan={columns.length} className="p-0">
                        {expandedRowContent(row)}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
