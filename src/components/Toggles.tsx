import { Mic, MicOff, Volume2 } from 'lucide-react';

interface TogglesProps {
  voiceEnabled?: boolean;
  onVoiceToggle?: () => void;
  voiceStatus?: 'idle' | 'connecting' | 'connected' | 'error';
  onVoiceConnect?: () => void;
  isListening?: boolean;
  isSpeaking?: boolean;
  audioLevel?: number;
  selectedVoice?: string;
  onVoiceChange?: (voice: string) => void;
  enableVAD?: boolean;
  onVADChange?: (enabled: boolean) => void;
  minimal?: boolean;
}

export default function Toggles({
  voiceEnabled = false,
  onVoiceToggle,
  voiceStatus = 'idle',
  onVoiceConnect,
  isListening = false,
  isSpeaking = false,
  audioLevel = 0,
  selectedVoice = 'alloy',
  onVoiceChange,
  enableVAD = true,
  onVADChange,
  minimal = false,
}: TogglesProps) {


  const handleToggle = async () => {
    if (!voiceEnabled) {
      onVoiceToggle?.();
      return;
    }

    if (voiceStatus === 'connected') {
      onVoiceToggle?.();
    } else {
      onVoiceConnect?.();
    }
  };

  return (
    <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-gray-200">
      {onVoiceToggle && (
        <>
          <button
            onClick={onVoiceToggle}
            className={`flex items-center gap-2 rounded-full transition-all duration-200 ${minimal
              ? 'p-2 text-slate-400 hover:text-purple-600'
              : voiceEnabled
                ? 'bg-purple-50 text-purple-600 border border-purple-200 px-4 py-2 hover:bg-purple-100 shadow-sm'
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 px-4 py-2'
              }`}
            title={voiceEnabled ? 'Turn off voice mode' : 'Turn on voice mode'}
          >
            {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            {!minimal && (
              <span className="text-sm font-semibold">
                {voiceEnabled ? 'Voice On' : 'Voice Off'}
              </span>
            )}
          </button>

          {voiceEnabled && voiceStatus === 'idle' && (
            <>
              <div className="h-6 w-px bg-gray-300"></div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <span className="font-medium">Voice:</span>
                <select
                  value={selectedVoice}
                  onChange={(e) => onVoiceChange?.(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="alloy">Alloy</option>
                  <option value="echo">Echo</option>
                  <option value="shimmer">Shimmer</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={enableVAD}
                  onChange={(e) => onVADChange?.(e.target.checked)}
                  className="cursor-pointer"
                />
                <span>Auto-detect</span>
              </label>
              <button
                onClick={onVoiceConnect}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all text-sm font-semibold"
              >
                <Mic className="w-4 h-4" />
                Connect
              </button>
            </>
          )}

          {voiceEnabled && voiceStatus === 'connected' && (
            <>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center gap-3">
                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-100"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
                {isListening && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Mic className="w-4 h-4" />
                    <span className="text-xs font-medium">Listening</span>
                  </div>
                )}
                {isSpeaking && (
                  <div className="flex items-center gap-1 text-blue-600">
                    <Volume2 className="w-4 h-4" />
                    <span className="text-xs font-medium">Speaking</span>
                  </div>
                )}
              </div>
              <button
                onClick={handleToggle}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all text-sm font-semibold"
              >
                <MicOff className="w-4 h-4" />
                Disconnect
              </button>
            </>
          )}

          {voiceEnabled && voiceStatus === 'connecting' && (
            <>
              <div className="h-6 w-px bg-gray-300"></div>
              <span className="text-sm text-yellow-600 font-medium">Connecting...</span>
            </>
          )}

          {voiceEnabled && voiceStatus === 'error' && (
            <>
              <div className="h-6 w-px bg-gray-300"></div>
              <span className="text-sm text-red-600 font-medium">Connection failed</span>
            </>
          )}
        </>
      )}
    </div>
  );
}
