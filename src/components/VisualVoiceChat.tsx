import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Mic, MicOff } from 'lucide-react';
import AudioWaveform from './AudioWaveform';
import VoiceControls from './VoiceControls';
import MessageList from './MessageList';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  sources?: string[];
  citations?: any[];
  tableData?: any;
  chartData?: any;
}

export default function VisualVoiceChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const voiceControlsRef = useRef<any>(null);

  const handleVoiceStatusChange = (status: 'idle' | 'listening' | 'thinking' | 'speaking') => {
    setVoiceStatus(status);
  };

  const handleAudioElementChange = (element: HTMLAudioElement | null) => {
    setAudioElement(element);
  };

  const handleAudioStreamChange = (stream: MediaStream | null) => {
    setAudioStream(stream);
  };

  const handleMessagesChange = (newMessages: Message[]) => {
    setMessages(newMessages);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Visual Voice Agent</h1>
              <p className="text-sm text-gray-400">AI-powered conversation with live visualization</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${
              isVoiceActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
            }`}>
              {isVoiceActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              <span className="text-sm font-medium">
                {isVoiceActive ? 'Voice Active' : 'Voice Inactive'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="hidden lg:flex lg:w-2/5 xl:w-1/3 border-r border-slate-700">
          <AudioWaveform
            status={voiceStatus}
            audioElement={audioElement}
            audioStream={audioStream}
          />
        </div>

        <div className="flex-1 flex flex-col">
          <div className="lg:hidden bg-slate-900/50 border-b border-slate-700 p-4">
            <div className="h-32">
              <AudioWaveform
                status={voiceStatus}
                audioElement={audioElement}
                audioStream={audioStream}
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <VoiceControls
              ref={voiceControlsRef}
              onMessagesChange={handleMessagesChange}
              onVoiceStatusChange={handleVoiceStatusChange}
              onAudioElementChange={handleAudioElementChange}
              onAudioStreamChange={handleAudioStreamChange}
              onVoiceActiveChange={setIsVoiceActive}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
