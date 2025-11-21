import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Zap, Volume2, Database, BarChart3 } from 'lucide-react';
import AudioWaveform from './AudioWaveform';
import TableView from './TableView';
import ChartView from './ChartView';

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
  const assistantResponseRef = useRef<string>('');
  const pendingMessageRef = useRef<{ text: string; sources?: any[]; tableData?: any; chartData?: any } | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioElementRef.current = audio;

    audio.addEventListener('play', () => setVoiceStatus('speaking'));
    audio.addEventListener('ended', () => {
      setVoiceStatus('idle');
      if (pendingMessageRef.current) {
        const { text, sources, tableData, chartData } = pendingMessageRef.current;
        addMessage(text, 'assistant', sources, tableData, chartData);
        pendingMessageRef.current = null;
      }
    });

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
        instructions: `You are a voice-enabled AI assistant that can access transaction data, generate charts, and send email reports.

When users ask about transactions or clients:
- Use query_transactions to fetch data from the database
- Use generate_transaction_chart to create visualizations
- Use send_transaction_email to send reports

Chart types:
- Use "pie" for pie charts (status distribution)
- Use "line" for line charts (trends over time)
- Use "bar" for bar charts (amounts over time, this is default)

IMPORTANT: When users ask to send email reports WITHOUT specifying an email address, use the default email: sivakumarai2828@gmail.com`,
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
        tools: [
          {
            type: 'function',
            name: 'query_transactions',
            description: 'Query transaction data from the database. Use this when users ask about transactions, purchases, refunds, or payment information. If user asks for "all transactions", omit clientId to get all data.',
            parameters: {
              type: 'object',
              properties: {
                clientId: {
                  type: 'number',
                  description: 'The client ID to query transactions for. Omit to query ALL transactions.',
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
                limit: {
                  type: 'number',
                  description: 'Maximum number of transactions to return. Default 100, can set higher for "all" queries.',
                },
              },
              required: [],
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
            description: 'Send an email report with transaction data. If user does not specify an email address, use the default email: sivakumarai2828@gmail.com',
            parameters: {
              type: 'object',
              properties: {
                clientId: {
                  type: 'number',
                  description: 'The client ID to generate report for',
                },
                email: {
                  type: 'string',
                  description: 'Email address to send the report to. Default: sivakumarai2828@gmail.com',
                  default: 'sivakumarai2828@gmail.com',
                },
              },
              required: ['clientId'],
            },
          },
        ],
        tool_choice: 'auto',
      },
    };

    dataChannelRef.current.send(JSON.stringify(sessionUpdate));
  };

  const handleServerEvent = async (event: any) => {
    console.log('OpenAI event:', event.type, event);

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
        if (event.delta) {
          assistantResponseRef.current += event.delta;
        }
        break;

      case 'response.function_call_arguments.done':
        console.log('Function call complete:', event);
        if (event.name && event.arguments) {
          await handleFunctionCall(event.name, event.arguments, event.call_id);
        }
        break;

      case 'response.audio_transcript.done':
      case 'response.audio.done':
        setTimeout(() => {
          if (pendingMessageRef.current) {
            const { text, sources, tableData, chartData } = pendingMessageRef.current;
            addMessage(text, 'assistant', sources, tableData, chartData);
            pendingMessageRef.current = null;
          }
          setVoiceStatus('idle');
        }, 500);
        break;

      case 'response.done':
        if (assistantResponseRef.current) {
          const hasFunctionCalls = event.response?.output?.some((item: any) =>
            item.type === 'function_call'
          );

          if (!hasFunctionCalls && assistantResponseRef.current.trim()) {
            pendingMessageRef.current = {
              text: assistantResponseRef.current,
              sources: ['OPENAI'],
            };
          }

          assistantResponseRef.current = '';
        }

        setTimeout(() => {
          if (pendingMessageRef.current) {
            const { text, sources, tableData, chartData } = pendingMessageRef.current;
            addMessage(text, 'assistant', sources, tableData, chartData);
            pendingMessageRef.current = null;
            setVoiceStatus('idle');
          }
        }, 3000);
        break;

      case 'error':
        console.error('OpenAI error:', event.error);
        setVoiceStatus('idle');
        break;
    }
  };

  const handleFunctionCall = async (name: string, argsJson: string, callId: string) => {
    try {
      const args = JSON.parse(argsJson);
      console.log(`Function called: ${name}`, args);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      };

      let result: any;

      if (name === 'query_transactions') {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/transaction-query`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(args),
          }
        );

        if (!response.ok) {
          result = {
            success: false,
            error: `Failed to query transactions: ${response.status}`,
            voiceSummary: 'Sorry, I encountered an error accessing the transaction data.',
          };
        } else {
          result = await response.json();

          if (result.success && result.summary) {
            pendingMessageRef.current = {
              text: result.voiceSummary,
              sources: ['DB'],
              tableData: result.summary,
            };
          }
        }
      } else if (name === 'generate_transaction_chart') {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/transaction-chart`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              clientId: args.clientId,
              chartType: args.chartType || 'bar',
              dateFrom: args.dateFrom,
              dateTo: args.dateTo,
            }),
          }
        );

        if (!response.ok) {
          result = {
            success: false,
            error: `Failed to generate chart: ${response.status}`,
            voiceSummary: 'Sorry, I encountered an error generating the chart.',
          };
        } else {
          result = await response.json();

          if (result.success && result.chartData) {
            pendingMessageRef.current = {
              text: result.voiceSummary,
              sources: ['DB'],
              chartData: result.chartData,
            };
          }
        }
      } else if (name === 'send_transaction_email') {
        const defaultEmail = 'sivakumarai2828@gmail.com';
        const recipientEmail = args.email || defaultEmail;

        const transactionResponse = await fetch(
          `${supabaseUrl}/functions/v1/transaction-query`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ clientId: args.clientId }),
          }
        );

        if (!transactionResponse.ok) {
          result = {
            success: false,
            error: 'Failed to fetch transaction data',
            voiceSummary: 'Sorry, I could not retrieve the transaction data to send.',
          };
        } else {
          const transactionData = await transactionResponse.json();

          const response = await fetch(
            `${supabaseUrl}/functions/v1/transaction-email`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                to: recipientEmail,
                subject: `Transaction Report for Client ${args.clientId}`,
                transactionSummary: transactionData.summary,
              }),
            }
          );

          if (!response.ok) {
            result = {
              success: false,
              error: `Failed to send email: ${response.status}`,
              voiceSummary: 'Sorry, I encountered an error sending the email.',
            };
          } else {
            result = await response.json();

            if (result.success) {
              pendingMessageRef.current = {
                text: result.voiceSummary || `Email sent successfully to ${recipientEmail}`,
                sources: ['EMAIL'],
              };
            }
          }
        }
      }

      if (dataChannelRef.current) {
        dataChannelRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify(result),
          },
        }));
      }
    } catch (error) {
      console.error('Function call error:', error);
    }
  };

  const addMessage = (text: string, sender: 'user' | 'assistant', sources?: string[], tableData?: any, chartData?: any) => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random(),
      text,
      sender,
      timestamp: new Date(),
      sources,
      tableData,
      chartData,
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
                <p className="text-xs text-gray-400">Real-time AI with database access</p>
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
                  <p className="text-gray-400 mb-4">
                    Click "Connect Voice" to start. Ask about transactions, request charts, or send email reports!
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div className="flex items-center justify-center space-x-1">
                      <Database className="w-3 h-3" />
                      <span>Query DB</span>
                    </div>
                    <div className="flex items-center justify-center space-x-1">
                      <BarChart3 className="w-3 h-3" />
                      <span>Generate Charts</span>
                    </div>
                  </div>
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
                className={`max-w-[85%] rounded-2xl ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              >
                {message.sender === 'assistant' && (
                  <div className="px-4 pt-3">
                    <p className="text-sm leading-relaxed text-gray-100">{message.text}</p>
                    {message.sources && message.sources.length > 0 && (
                      <div className="flex items-center space-x-2 mt-2">
                        {message.sources.map((source, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full"
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {message.sender === 'user' && (
                  <p className="text-sm leading-relaxed">{message.text}</p>
                )}
                {message.tableData && (
                  <div className="mt-3">
                    <TableView data={message.tableData} />
                  </div>
                )}
                {message.chartData && (
                  <div className="mt-3">
                    <ChartView data={message.chartData} />
                  </div>
                )}
                {message.sender === 'assistant' && (
                  <span className="text-xs opacity-70 mt-2 block px-4 pb-3">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                )}
                {message.sender === 'user' && (
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
