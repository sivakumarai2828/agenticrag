import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface VoiceControlsProps {
  onTranscript: (text: string) => void;
  onAssistantMessage?: (text: string, sources?: any[], tableData?: any, chartData?: any) => void;
  isEnabled: boolean;
  onToggle: () => void;
}

export default function VoiceControls({
  onTranscript,
  onAssistantMessage,
  isEnabled,
  onToggle,
}: VoiceControlsProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [selectedVoice, setSelectedVoice] = useState<string>('alloy');
  const [enableVAD, setEnableVAD] = useState(true);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const assistantResponseRef = useRef<string>('');
  const responseSourcesRef = useRef<any[]>([]);
  const voiceSessionActiveRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!isEnabled && status === 'connected') {
      cleanup();
    }
  }, [isEnabled]);

  const connectToOpenAI = async () => {
    try {
      setStatus('connecting');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const sessionUrl = `${supabaseUrl}/functions/v1/openai-session?voice=${selectedVoice}`;

      const tokenResponse = await fetch(sessionUrl);
      if (!tokenResponse.ok) {
        throw new Error('Failed to get ephemeral token');
      }

      const sessionData = await tokenResponse.json();
      const ephemeralKey = sessionData.client_secret.value;

      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      pc.ontrack = (event) => {
        const audioElement = new Audio();
        audioElement.autoplay = true;
        audioElement.srcObject = event.streams[0];

        audioElement.onplay = () => setIsSpeaking(true);
        audioElement.onpause = () => setIsSpeaking(false);
        audioElement.onended = () => setIsSpeaking(false);
      };

      await setupAudioInput(pc);
      setupDataChannel(pc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      voiceSessionActiveRef.current = true;

      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      const response = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to connect to OpenAI');
      }

      const answerSdp = await response.text();
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      setStatus('connected');
      setIsListening(true);
    } catch (error) {
      console.error('Connection error:', error);
      setStatus('error');
      cleanup();
    }
  };

  const setupAudioInput = async (pc: RTCPeerConnection) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      source.connect(analyser);

      animateAudioLevel();

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    } catch (error) {
      console.error('Microphone access error:', error);
      throw error;
    }
  };

  const setupDataChannel = (pc: RTCPeerConnection) => {
    const dc = pc.createDataChannel('oai-events');
    dataChannelRef.current = dc;

    dc.addEventListener('open', () => {
      console.log('Data channel opened');
      sendSessionUpdate();
    });

    dc.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        handleServerEvent(message);
      } catch (error) {
        console.error('Error parsing server message:', error);
      }
    });

    dc.addEventListener('error', (error) => {
      console.error('Data channel error:', error);
    });

    dc.addEventListener('close', () => {
      console.log('Data channel closed');
    });
  };

  const sendSessionUpdate = () => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      return;
    }

    const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: `You are a helpful AI assistant with access to transaction data, charts, and email capabilities.
Be concise and helpful. When users ask about transactions, use the appropriate function.
When users request charts, use the generate_transaction_chart function with the correct chartType:
- Use "pie" for pie charts (status distribution)
- Use "line" for line charts (trends over time)
- Use "bar" for bar charts (amounts over time, this is default)`,
        voice: selectedVoice,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: enableVAD ? { type: 'server_vad' } : null,
        tools: [
          {
            type: 'function',
            name: 'query_transactions',
            description: 'Query transaction data from the database. Use this when users ask about transactions, purchases, refunds, or payment information.',
            parameters: {
              type: 'object',
              properties: {
                clientId: {
                  type: 'number',
                  description: 'The client ID to query transactions for',
                },
                type: {
                  type: 'string',
                  enum: ['PURCHASE', 'REFUND'],
                  description: 'Filter by transaction type (optional)',
                },
                status: {
                  type: 'string',
                  enum: ['APPROVED', 'DECLINED', 'CALL FOR AUTH'],
                  description: 'Filter by transaction status (optional)',
                },
              },
              required: ['clientId'],
            },
          },
          {
            type: 'function',
            name: 'generate_transaction_chart',
            description: 'Generate a chart visualization of transaction data. IMPORTANT: Listen carefully for chart type - if user says "pie chart", set chartType to "pie". If user says "line chart", set to "line". If user says "bar chart" or no specific type, set to "bar".',
            parameters: {
              type: 'object',
              properties: {
                clientId: {
                  type: 'number',
                  description: 'The client ID to generate chart for',
                },
                chartType: {
                  type: 'string',
                  enum: ['bar', 'line', 'pie'],
                  description: 'Chart type: "pie" for status distribution (use when user says PIE chart), "line" for trends (use when user says LINE chart), "bar" for amounts over time (use when user says BAR chart or as default)',
                },
                dateFrom: {
                  type: 'string',
                  description: 'Start date filter in YYYY-MM-DD format (optional)',
                },
                dateTo: {
                  type: 'string',
                  description: 'End date filter in YYYY-MM-DD format (optional)',
                },
              },
              required: ['clientId'],
            },
          },
          {
            type: 'function',
            name: 'send_transaction_email',
            description: 'Send an email report with transaction data to a specified email address.',
            parameters: {
              type: 'object',
              properties: {
                clientId: {
                  type: 'number',
                  description: 'The client ID to generate report for',
                },
                email: {
                  type: 'string',
                  description: 'Email address to send the report to',
                },
              },
              required: ['clientId', 'email'],
            },
          },
        ],
        tool_choice: 'auto',
      },
    };

    dataChannelRef.current.send(JSON.stringify(sessionUpdate));
  };

  const handleServerEvent = async (event: any) => {
    switch (event.type) {
      case 'session.created':
      case 'session.updated':
        console.log('Session ready:', event);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          console.log('User transcript:', event.transcript);
          onTranscript(event.transcript);
        }
        break;

      case 'response.text.delta':
        if (event.delta) {
          assistantResponseRef.current += event.delta;
        }
        break;

      case 'response.audio_transcript.delta':
        if (event.delta) {
          assistantResponseRef.current += event.delta;
        }
        break;

      case 'response.function_call_arguments.delta':
        console.log('Function call args delta:', event);
        break;

      case 'response.function_call_arguments.done':
        console.log('Function call complete:', event);
        if (event.name && event.arguments) {
          await handleFunctionCall(event.name, event.arguments, event.call_id);
        }
        break;

      case 'response.done':
        if (assistantResponseRef.current) {
          console.log('Assistant response:', assistantResponseRef.current);

          if (onAssistantMessage && assistantResponseRef.current.trim()) {
            onAssistantMessage(
              assistantResponseRef.current,
              responseSourcesRef.current
            );
          }

          assistantResponseRef.current = '';
          responseSourcesRef.current = [];
        }
        break;

      case 'error':
        console.error('OpenAI error:', event);
        break;
    }
  };

  const handleFunctionCall = async (name: string, argsJson: string, callId: string) => {
    try {
      const args = JSON.parse(argsJson);
      console.log(`Function called: ${name}`, args);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      let result: any;

      if (name === 'query_transactions') {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/transaction-query`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          }
        );
        result = await response.json();

        if (result.success && result.transactions) {
          onAssistantMessage?.(
            result.voiceSummary,
            ['DB'],
            result.transactions
          );
        }
      } else if (name === 'generate_transaction_chart') {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/transaction-chart`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId: args.clientId,
              chartType: args.chartType || 'bar',
              dateFrom: args.dateFrom,
              dateTo: args.dateTo,
            }),
          }
        );
        result = await response.json();

        if (result.success && result.chartData) {
          onAssistantMessage?.(
            result.voiceSummary,
            ['DB'],
            null,
            result.chartData
          );
        }
      } else if (name === 'send_transaction_email') {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/transaction-email`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          }
        );
        result = await response.json();
      }

      sendFunctionCallOutput(callId, result);
    } catch (error) {
      console.error('Function call error:', error);
      sendFunctionCallOutput(callId, {
        error: 'Function execution failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const sendFunctionCallOutput = (callId: string, output: any) => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      return;
    }

    const message = {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(output),
      },
    };

    dataChannelRef.current.send(JSON.stringify(message));

    const responseCreate = {
      type: 'response.create',
    };
    dataChannelRef.current.send(JSON.stringify(responseCreate));
  };

  const animateAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const updateLevel = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(Math.min(100, (average / 128) * 100));

      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  };

  const cleanup = () => {
    voiceSessionActiveRef.current = false;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setStatus('idle');
    setIsListening(false);
    setIsSpeaking(false);
    setAudioLevel(0);
    assistantResponseRef.current = '';
    responseSourcesRef.current = [];
  };

  const handleToggle = async () => {
    if (!isEnabled) {
      onToggle();
      return;
    }

    if (status === 'connected') {
      cleanup();
      onToggle();
    } else {
      await connectToOpenAI();
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          disabled={!isEnabled || status === 'connecting'}
          className={`p-3 rounded-full transition-all ${
            status === 'connected'
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
              : status === 'connecting'
              ? 'bg-yellow-500 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } ${!isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={
            !isEnabled
              ? 'Enable voice mode first'
              : status === 'connected'
              ? 'Disconnect'
              : status === 'connecting'
              ? 'Connecting...'
              : 'Connect to OpenAI Realtime'
          }
        >
          {status === 'connected' ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>

        {status === 'connected' && (
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-100"
                style={{ width: `${audioLevel}%` }}
              />
            </div>

            {isListening && (
              <div className="flex items-center gap-1 text-green-500">
                <Mic className="w-4 h-4" />
                <span className="text-xs">Listening</span>
              </div>
            )}

            {isSpeaking && (
              <div className="flex items-center gap-1 text-blue-500">
                <Volume2 className="w-4 h-4" />
                <span className="text-xs">Speaking</span>
              </div>
            )}
          </div>
        )}
      </div>

      {status === 'connected' && (
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
              disabled
              title="Voice can only be changed before connecting"
            >
              <option value="alloy">Alloy</option>
              <option value="echo">Echo</option>
              <option value="shimmer">Shimmer</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enableVAD}
              onChange={(e) => setEnableVAD(e.target.checked)}
              disabled
              title="VAD can only be changed before connecting"
            />
            Auto-detect speech
          </label>
        </div>
      )}

      {status === 'idle' && (
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span>Voice:</span>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
            >
              <option value="alloy">Alloy - Neutral</option>
              <option value="echo">Echo - Male</option>
              <option value="shimmer">Shimmer - Female</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enableVAD}
              onChange={(e) => setEnableVAD(e.target.checked)}
            />
            Auto-detect speech
          </label>
        </div>
      )}

      {status === 'error' && (
        <span className="text-red-500 text-sm">Connection failed</span>
      )}
    </div>
  );
}
