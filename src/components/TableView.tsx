import { Download } from 'lucide-react';
import { downloadCSV } from '../utils/download';

interface TableViewProps {
  data?: {
    columns: string[];
    rows: Record<string, any>[];
  };
  columns?: string[];
  rows?: Record<string, any>[];
}

export default function TableView({ data, columns: propColumns, rows: propRows }: TableViewProps) {
  const columns = data?.columns || propColumns || [];
  const rows = data?.rows || propRows || [];
  const handleDownload = () => {
    downloadCSV(rows, `export-${Date.now()}.csv`);
  };

  if (!columns.length || !rows.length) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3 px-4">
        <h4 className="text-sm font-semibold text-gray-300">Results</h4>
        <button
          onClick={handleDownload}
          className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
        >
          <Download size={14} />
          <span>CSV</span>
        </button>
      </div>
      <div className="overflow-x-auto border border-slate-600 rounded-lg">
        <table className="min-w-full divide-y divide-slate-600">
          <thead className="bg-slate-700/50">
            <tr>
              {columns.map(col => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
                >
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-slate-800/50 divide-y divide-slate-600">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-700/30">
                {columns.map(col => (
                  <td key={col} className="px-4 py-3 text-sm text-gray-200 whitespace-nowrap">
                    {typeof row[col] === 'number' && col.toLowerCase().includes('revenue')
                      ? `$${row[col].toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      : typeof row[col] === 'number'
                      ? row[col].toLocaleString()
                      : row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
