import { Download } from 'lucide-react';
import { downloadJSON } from '../utils/download';

interface JSONViewProps {
  data: any;
}

export default function JSONView({ data }: JSONViewProps) {
  const handleDownload = () => {
    downloadJSON(data, `data-${Date.now()}.json`);
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">Response Data</h4>
        <button
          onClick={handleDownload}
          className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
        >
          <Download size={14} />
          <span>JSON</span>
        </button>
      </div>
      <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <pre className="text-xs font-mono">{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
}
