import { useState, useEffect } from 'react';
import { configStore, TimeRange } from '../store/ConfigStore';

export default function Toggles() {
  const [config, setConfig] = useState(configStore.getConfig());

  useEffect(() => {
    return configStore.subscribe(setConfig);
  }, []);

  const toggleSource = (source: keyof typeof config.sources) => {
    configStore.updateSources({ [source]: !config.sources[source] });
  };

  const setTimeRange = (range: TimeRange) => {
    configStore.setTimeRange(range);
  };

  return (
    <div className="flex items-center space-x-6 px-6 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center space-x-3">
        <span className="text-sm font-medium text-gray-700">Sources:</span>
        {(['vector', 'db', 'web', 'api'] as const).map(source => (
          <button
            key={source}
            onClick={() => toggleSource(source)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              config.sources[source]
                ? 'bg-violet-100 text-violet-700 border border-violet-300'
                : 'bg-gray-100 text-gray-500 border border-gray-300'
            }`}
          >
            {source.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex items-center space-x-3">
        <span className="text-sm font-medium text-gray-700">Time:</span>
        {(['7d', '30d', 'custom'] as const).map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              config.timeRange === range
                ? 'bg-violet-100 text-violet-700 border border-violet-300'
                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            {range === 'custom' ? 'Custom' : range}
          </button>
        ))}
      </div>
    </div>
  );
}
