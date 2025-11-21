import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Zap, MessageSquare, Volume2 } from 'lucide-react';
import AudioWaveform from './AudioWaveform';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  sources?: string[];
  tableData?: any;
  chartData?: any;
}

export default function VisualVoiceAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('alloy');

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = new Audio();
    audioElementRef.current = audio;

    audio.addEventListener('play', () => setVoiceStatus('speaking'));
    audio.addEventListener('ended', () => setVoiceStatus('idle'));

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectVoiceAgent = async () => {
    if (isConnected) {
      disconnectVoiceAgent();
      return;
    }

    try {
      setVoiceStatus('thinking');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const tokenResponse = await fetch(
        `${supabaseUrl}/functions/v1/openai-session`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-realtime-preview-2024-12-17',
            voice: selectedVoice,
          }),
        }
      );

      if (!tokenResponse.ok) {
        throw new Error('Failed to get session token');
      }

      const { client_secret } = await tokenResponse.json();
      const ephemeralToken = client_secret.value;

      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      const audioEl = audioElementRef.current!;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
        audioEl.play();
      };

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = ms;
      pc.addTrack(ms.getTracks()[0]);

      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      dc.addEventListener('open', () => {
        setIsConnected(true);
        setVoiceStatus('idle');
        sendSessionUpdate();
      });

      dc.addEventListener('message', (e) => {
        const event = JSON.parse(e.data);
        handleServerEvent(event);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralToken}`,
          'Content-Type': 'application/sdp',
        },
      });

      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: await sdpResponse.text(),
      };
      await pc.setRemoteDescription(answer);

      setIsVoiceActive(true);
    } catch (error) {
      console.error('Connection error:', error);
      setVoiceStatus('idle');
      setIsConnected(false);
    }
  };

  const disconnectVoiceAgent = () => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.srcObject = null;
    }

    setIsConnected(false);
    setIsVoiceActive(false);
    setVoiceStatus('idle');
  };

  const sendSessionUpdate = () => {
    if (!dataChannelRef.current) return;

    const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: 'You are a helpful AI assistant. Be concise and conversational.',
        voice: selectedVoice,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      },
    };

    dataChannelRef.current.send(JSON.stringify(sessionUpdate));
  };

  const handleServerEvent = (event: any) => {
    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        setVoiceStatus('listening');
        break;

      case 'input_audio_buffer.speech_stopped':
        setVoiceStatus('thinking');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          addMessage(event.transcript, 'user');
        }
        break;

      case 'response.audio_transcript.delta':
        break;

      case 'response.audio_transcript.done':
        if (event.transcript) {
          addMessage(event.transcript, 'assistant');
        }
        break;

      case 'response.done':
        setVoiceStatus('idle');
        break;

      case 'error':
        console.error('OpenAI error:', event.error);
        setVoiceStatus('idle');
        break;
    }
  };

  const addMessage = (text: string, sender: 'user' | 'assistant') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  return (
    <div className="flex h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="hidden lg:flex lg:w-2/5 border-r border-slate-700">
        <AudioWaveform
          status={voiceStatus}
          audioElement={audioElementRef.current}
          audioStream={audioStreamRef.current}
        />
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2.5 rounded-xl">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Visual Voice Agent</h1>
                <p className="text-xs text-gray-400">Real-time AI conversation with waveform visualization</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                disabled={isConnected}
                className="bg-slate-800 text-white px-3 py-2 rounded-lg text-sm border border-slate-600 focus:outline-none focus:border-purple-500"
              >
                <option value="alloy">Alloy</option>
                <option value="echo">Echo</option>
                <option value="shimmer">Shimmer</option>
              </select>
              <button
                onClick={connectVoiceAgent}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  isConnected
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                }`}
              >
                {isConnected ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isConnected ? 'Disconnect' : 'Connect Voice'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:hidden bg-slate-900/50 border-b border-slate-700 p-4">
          <div className="h-32">
            <AudioWaveform
              status={voiceStatus}
              audioElement={audioElementRef.current}
              audioStream={audioStreamRef.current}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4 max-w-md">
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-6 rounded-2xl border border-purple-500/30">
                  <Volume2 className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                  <h2 className="text-2xl font-bold text-white mb-2">Voice Agent Ready</h2>
                  <p className="text-gray-400">
                    Click "Connect Voice" to start a real-time conversation with AI.
                    The waveform will visualize the audio in real-time.
                  </p>
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'bg-slate-800 text-gray-100 border border-slate-700'
                }`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
