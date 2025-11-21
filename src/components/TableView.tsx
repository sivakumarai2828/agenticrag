import { Download } from 'lucide-react';
import { downloadCSV } from '../utils/download';

interface TableViewProps {
  columns: string[];
  rows: Record<string, any>[];
}

export default function TableView({ columns, rows }: TableViewProps) {
  const handleDownload = () => {
    downloadCSV(rows, `export-${Date.now()}.csv`);
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">Results</h4>
        <button
          onClick={handleDownload}
          className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
        >
          <Download size={14} />
          <span>CSV</span>
        </button>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(col => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                >
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {columns.map(col => (
                  <td key={col} className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
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
