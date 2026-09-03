import React from 'react';

export const DataTable = ({ columns, data, emptyMessage = 'No records found.' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 bg-[#0f172a]/40 rounded-xl border border-dashed border-[#222f4c]">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full rounded-xl border border-[#222f4c]">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-[#0b0f19]/80 text-slate-400 uppercase text-[11px] tracking-wider font-semibold border-b border-[#222f4c]">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-4 py-3.5 whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#222f4c]/60 bg-[#131b2e]">
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-slate-800/40 transition-colors">
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="px-4 py-3.5 text-slate-200 whitespace-nowrap">
                  {col.render ? col.render(row, rowIdx) : row[col.accessor] || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
