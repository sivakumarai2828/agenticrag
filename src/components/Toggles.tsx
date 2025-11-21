import { useState, useEffect } from 'react';
import { configStore, TimeRange } from '../store/ConfigStore';
import { Mic, MicOff } from 'lucide-react';

interface TogglesProps {
  voiceEnabled?: boolean;
  onVoiceToggle?: () => void;
}

export default function Toggles({ voiceEnabled = false, onVoiceToggle }: TogglesProps) {
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
    <div className="flex items-center px-6 py-3 bg-white border-b border-gray-200">
      {onVoiceToggle && (
        <button
          onClick={onVoiceToggle}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all shadow-sm ${
            voiceEnabled
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
          title={voiceEnabled ? 'Click to turn off voice mode' : 'Click to turn on voice mode'}
        >
          {voiceEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
      )}
    </div>
  );
}
