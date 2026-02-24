import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Mic } from 'lucide-react';
import { getApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface VoiceControlsProps {
  onTranscript: (text: string) => void;
  onAssistantMessage?: (text: string, sources?: any[], tableData?: any, chartData?: any, traceSteps?: any[], metadata?: any) => void;
  isEnabled: boolean;
  onToggle: () => void;
  onConnectionChange?: (isConnected: boolean) => void;
  onStatusChange?: (status: 'idle' | 'connecting' | 'connected' | 'error') => void;
  onListeningChange?: (isListening: boolean) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onAudioLevelChange?: (level: number) => void;
  onActivityStart?: (stepId: string) => void;
  onActivityComplete?: (stepId: string) => void;
  selectedVoice?: string;
  enableVAD?: boolean;
  minimal?: boolean;
}

const VoiceControls = forwardRef<any, VoiceControlsProps>(({
  onTranscript,
  onAssistantMessage,
  isEnabled,
  onToggle,
  onConnectionChange,
  onStatusChange,
  onListeningChange,
  onSpeakingChange,
  onAudioLevelChange,
  onActivityStart,
  onActivityComplete,
  selectedVoice: selectedVoiceProp = 'alloy',
  enableVAD: enableVADProp = true,
  minimal = false,
}, ref) => {
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [selectedVoice, setSelectedVoice] = useState<string>(selectedVoiceProp);
  const [enableVAD, setEnableVAD] = useState(enableVADProp);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const assistantResponseRef = useRef<string>('');

  const responseSourcesRef = useRef<any[]>([]);
  const voiceSessionActiveRef = useRef<boolean>(false);
  const pendingMessageRef = useRef<{ text: string; sources?: any[]; tableData?: any; chartData?: any; traceSteps?: any[]; metadata?: any; citations?: any[] } | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const initialResponseCancelledRef = useRef<boolean>(false);
  const userHasSpokenRef = useRef<boolean>(false);
  const isToolPendingRef = useRef<boolean>(false);
  const isSynthesisWaitingRef = useRef<boolean>(false);
  const lastEmittedTextRef = useRef<string>('');
  const isEmittingRef = useRef<boolean>(false);
  const pendingToolMetadataRef = useRef<{ sources: string[]; traceSteps: any[] } | null>(null);

  // Refs for callbacks to avoid stale closures
  const onTranscriptRef = useRef(onTranscript);
  const onAssistantMessageRef = useRef(onAssistantMessage);
  const onActivityStartRef = useRef(onActivityStart);
  const onActivityCompleteRef = useRef(onActivityComplete);
  const onConnectionChangeRef = useRef(onConnectionChange);
  const onStatusChangeRef = useRef(onStatusChange);
  const onListeningChangeRef = useRef(onListeningChange);
  const onSpeakingChangeRef = useRef(onSpeakingChange);
  const onAudioLevelChangeRef = useRef(onAudioLevelChange);

  // Update refs when props change
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onAssistantMessageRef.current = onAssistantMessage;
    onActivityStartRef.current = onActivityStart;
    onActivityCompleteRef.current = onActivityComplete;
    onConnectionChangeRef.current = onConnectionChange;
    onStatusChangeRef.current = onStatusChange;
    onListeningChangeRef.current = onListeningChange;
    onSpeakingChangeRef.current = onSpeakingChange;
    onAudioLevelChangeRef.current = onAudioLevelChange;
  }, [
    onTranscript, onAssistantMessage, onActivityStart, onActivityComplete,
    onConnectionChange, onStatusChange, onListeningChange, onSpeakingChange, onAudioLevelChange
  ]);

  useEffect(() => {
    setSelectedVoice(selectedVoiceProp);
  }, [selectedVoiceProp]);

  useEffect(() => {
    setEnableVAD(enableVADProp);
  }, [enableVADProp]);

  useEffect(() => {
    onStatusChangeRef.current?.(status);
  }, [status]);

  useEffect(() => {
    onListeningChangeRef.current?.(isListening);
  }, [isListening]);

  useEffect(() => {
    onSpeakingChangeRef.current?.(isSpeaking);
  }, [isSpeaking]);

  useEffect(() => {
    onAudioLevelChangeRef.current?.(audioLevel);
  }, [audioLevel]);

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

  useImperativeHandle(ref, () => ({
    connectToOpenAI,
    cleanup,
    speakText: (text: string) => {
      if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
        console.warn('Cannot speak text: Data channel not open');
        return;
      }

      console.log('🗣️ AI speaking custom text:', text);

      // 1. Cancel any ongoing response
      dataChannelRef.current.send(JSON.stringify({ type: 'response.cancel' }));

      // 2. Add the text as a system message/instruction that forces it to be spoken
      const itemEvent = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: `URGENT: Speak the following message to the user immediately and do not say anything else: "${text}"`
            }
          ]
        }
      };
      dataChannelRef.current.send(JSON.stringify(itemEvent));

      // 3. Trigger a manual response
      dataChannelRef.current.send(JSON.stringify({ type: 'response.create' }));
    }
  }));


  const connectToOpenAI = async () => {
    try {
      setStatus('connecting');

      const sessionUrl = getApiUrl(`/openai-session?voice=${selectedVoice}`);

      // PRIME AUDIO: Some browsers require a sync play call from a user gesture
      // We do this here as connectToOpenAI is usually called from an onClick handler
      let existingAudio = document.getElementById('openai-voice-audio') as HTMLAudioElement;
      if (!existingAudio) {
        existingAudio = document.createElement('audio');
        existingAudio.id = 'openai-voice-audio';
        existingAudio.style.display = 'none';
        document.body.appendChild(existingAudio);
      }

      // Try to resume AudioContext if it exists and is suspended
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      // Try a silent play to 'unlock' audio
      existingAudio.play().catch(() => {
        console.log('🔇 Initial audio prime failed, will try again on track arrival');
      });

      const tokenResponse = await fetch(sessionUrl);
      if (!tokenResponse.ok) {
        throw new Error('Failed to get ephemeral token from backend');
      }

      const sessionData = await tokenResponse.json();
      const ephemeralKey = sessionData.client_secret.value;

      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      pc.ontrack = (event) => {
        console.log('🔊 Audio track received from OpenAI');
        console.log('📊 Track details:', {
          kind: event.track.kind,
          enabled: event.track.enabled,
          muted: event.track.muted,
          readyState: event.track.readyState,
          streams: event.streams.length
        });

        // CRITICAL: Unmute the track if it's muted
        if (event.track.muted) {
          console.log('🔇 Track is muted, attempting to unmute...');
          // Note: track.muted is read-only, but we can ensure the audio element isn't muted
        }

        // Create or reuse audio element in DOM (helps with autoplay policies)
        let audioElement = document.getElementById('openai-voice-audio') as HTMLAudioElement;
        if (!audioElement) {
          audioElement = document.createElement('audio');
          audioElement.id = 'openai-voice-audio';
          // Using style object instead of attribute for better control
          Object.assign(audioElement.style, {
            position: 'absolute',
            width: '1px',
            height: '1px',
            opacity: '0.01',
            pointerEvents: 'none'
          });
          document.body.appendChild(audioElement);
          console.log('📻 Created audio element in DOM');
        }

        audioElement.autoplay = true;
        audioElement.controls = false;
        audioElement.volume = 1.0;
        audioElement.muted = false;

        // Get the stream
        const stream = event.streams[0] || new MediaStream([event.track]);
        audioElement.srcObject = stream;
        audioElementRef.current = audioElement;

        console.log('🎚️ Audio element configured:', {
          autoplay: audioElement.autoplay,
          volume: audioElement.volume,
          muted: audioElement.muted,
          paused: audioElement.paused,
          readyState: audioElement.readyState
        });

        audioElement.onplay = () => {
          console.log('🔊 Audio playback started (onplay)');
          setIsSpeaking(true);
        };
        audioElement.onpause = () => {
          console.log('⏸️ Audio playback paused');
          setIsSpeaking(false);
        };
        audioElement.onended = () => {
          console.log('🔇 Audio playback ended');
          setIsSpeaking(false);
        };
        audioElement.onerror = (error) => {
          console.error('❌ Audio playback error:', error);
          console.error('Error details:', audioElement.error);
        };
        audioElement.oncanplay = () => {
          console.log('✅ Audio can play - buffer ready');
          audioElement.play().catch(err => {
            console.error('❌ Failed to play() in oncanplay:', err);
          });
        };
        audioElement.onloadedmetadata = () => {
          console.log('📝 Audio metadata loaded');
          audioElement.play().catch(err => {
            console.error('❌ Failed to play() in onloadedmetadata:', err);
          });
        };

        // Attempt to play immediately as well
        audioElement.play().then(() => {
          console.log('✅ Initial audio play() succeeded');
        }).catch(err => {
          console.error('❌ Failed to auto-play audio:', err);
          console.log('💡 User interaction might still be restricted. Try clicking the page.');
        });
      };

      await setupAudioInput(pc);
      setupDataChannel(pc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      voiceSessionActiveRef.current = true;

      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview';
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
      onConnectionChangeRef.current?.(true);
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
        instructions: `You are Velix, a high-performance AI assistant powering Business Intelligence and Transaction Queries. You offer instant, personalized support by processing private knowledge bases, transaction databases, and real-time web data. 

CAPABILITIES:
- Transaction Analysis: Query purchases, refunds, and client-specific data.
- Visual Analytics: Generate Bar, Line, and Pie charts for transaction trends.
- Email Integration: Send transaction reports and summaries to users.
- RAG Knowledge Base: Answer complex questions from indexed documents.
- Real-time Data: Access Stocks, Weather, and Web Search results.

DEFAULT EMAIL:
- If the user asks to email ANY information (reports, search results, or general text) without specifying an email address, ALWAYS use sivakumarai2828@gmail.com as the default recipient.

LANGUAGE REQUIREMENT:
- ALWAYS respond in English by default.
- ONLY switch to another language if the user EXPLICITLY asks you to speak in that language.
- Otherwise, ALWAYS use English regardless of the user's accent or language detected.

CRITICAL RULES:
1. NEVER greet the user when the session starts.
2. WAIT SILENTLY for the user to speak first.
3. When introducing yourself (if asked), say "I'm Velix, your AI personal support engine" or "This is Velix".

Be concise and professional. When referring to or asking for client IDs, ALWAYS use the format "Client 1", "Client 2", etc.
When users request charts, use the generate_transaction_chart function with the correct chartType:
- Use "pie" for status distribution (e.g. "show me status breakdown")
- Use "line" for trends over time (e.g. "show me amount trend")
- Use "bar" for amounts over time (default)

IMPORTANT: For email reports without a specified address, use sivakumarai2828@gmail.com.

WEB SEARCH RULES:
- Read the actual search results to the user.
- Share top 3-5 results with titles and descriptions.
- The results ARE the answer.
  `,
        voice: selectedVoice,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: enableVAD ? {
          type: 'server_vad',
          threshold: 0.65, // Increased from default 0.5 to be less sensitive to noise
          prefix_padding_ms: 300,
          silence_duration_ms: 800, // Increased from 500ms to avoid cutting off users and reduce accidental triggers
        } : null,
        tools: [
          {
            type: 'function',
            name: 'query_transactions',
            description: 'Query transaction data from the database. Use this when users ask about transactions, purchases, refunds, or payment information. If user asks for "all transactions", omit clientId to get all data.',
            parameters: {
              type: 'object',
              properties: {
                clientId: {
                  type: 'string',
                  description: 'The client name to query transactions for (e.g., "Client 1", "Client 2"). Omit to query ALL transactions.',
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
                  type: 'string',
                  description: 'The client name to generate chart for (e.g., "Client 1", "Client 2"). Omit this or use "all" to generate a chart for all transactions across all clients.',
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
              required: [],
            },
          },
          {
            type: 'function',
            name: 'send_general_email',
            description: 'Send a general email with any text content (like search results, restaurant lists, or general information). Use this for non-transactional content.',
            parameters: {
              type: 'object',
              properties: {
                to: {
                  type: 'string',
                  description: 'Recipient email. Default: sivakumarai2828@gmail.com',
                  default: 'sivakumarai2828@gmail.com',
                },
                subject: {
                  type: 'string',
                  description: 'Brief subject line for the email',
                },
                content: {
                  type: 'string',
                  description: 'The body text to send in the email',
                },
              },
              required: ['subject', 'content'],
            },
          },
          {
            type: 'function',
            name: 'send_email_report',
            description: 'Send a structured transaction report via email. Use this when users ask for transaction reports or database summaries.',
            parameters: {
              type: 'object',
              properties: {
                to: {
                  type: 'string',
                  description: 'Recipient email. Default: sivakumarai2828@gmail.com',
                  default: 'sivakumarai2828@gmail.com',
                },
                clientId: {
                  type: 'string',
                  description: 'The client ID to include in the report',
                },
                subject: {
                  type: 'string',
                  description: 'Subject line for the report email',
                },
              },
              required: ['clientId', 'subject'],
            },
          },
          {
            type: 'function',
            name: 'web_search',
            description: 'Search the web for current information, news, weather, restaurants, or any real-time data. Use this when users ask about things outside of the transaction database. IMPORTANT: After calling this function, you MUST read the actual search results to the user - do not reinterpret or say they are not relevant. The function returns real Google search results that answer the user\'s question.',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query to look up on the web',
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of search results to return (default: 5)',
                  default: 5,
                },
              },
              required: ['query'],
            },
          },
          {
            type: 'function',
            name: 'get_weather',
            description: 'Get real-time weather information for a specific city.',
            parameters: {
              type: 'object',
              properties: {
                city: { type: 'string', description: 'The city name (e.g., "London", "San Francisco")' },
              },
              required: ['city'],
            },
          },
          {
            type: 'function',
            name: 'get_stock_price',
            description: 'Get the latest stock price for a given ticker symbol.',
            parameters: {
              type: 'object',
              properties: {
                symbols: { type: 'string', description: 'Stock ticker symbol (e.g., "AAPL", "TSLA", "MSFT")' },
              },
              required: ['symbols'],
            },
          },
          {
            type: 'function',
            name: 'doc_rag',
            description: 'Query the internal knowledge base for company policies, documentation, and specific information. Use this when users ask detailed questions about the company or operations.',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query to look up in the knowledge base',
                }
              },
              required: ['query'],
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
      case 'session.created':
      case 'session.updated':
        console.log('Session ready:', event);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          console.log('✅ User transcript captured:', event.transcript);
          userHasSpokenRef.current = true;
          onActivityStartRef.current?.('intent');
          onTranscriptRef.current(event.transcript);
          // Auto-complete intent after a second or when tool starts
          setTimeout(() => onActivityCompleteRef.current?.('intent'), 1000);
        } else {
          console.warn('⚠️ Transcript event received but no transcript text:', event);
        }
        break;

      case 'response.text.delta':
        // Prefer audio_transcript.delta if available, but collect text if not
        if (event.delta && !isSpeaking) {
          // Check if we already have this segment to avoid duplicates
          if (!assistantResponseRef.current.endsWith(event.delta)) {
            assistantResponseRef.current += event.delta;
          }
        }
        break;

      case 'response.audio_transcript.delta':
        if (event.delta) {
          // Prioritize transcript for voice mode
          if (!assistantResponseRef.current.endsWith(event.delta)) {
            assistantResponseRef.current += event.delta;
          }
        }
        break;

      case 'response.function_call_arguments.delta':
        console.log('Function call args delta:', event);
        break;

      case 'response.function_call_arguments.done':
        console.log('Function call complete:', event);
        if (event.name && event.arguments) {
          isToolPendingRef.current = true;
          await handleFunctionCall(event.name, event.arguments, event.call_id);
          isToolPendingRef.current = false;
        }
        break;

      case 'response.audio.done':
      case 'response.audio_transcript.done':
        console.log('🔊 Audio output complete');

        const checkAndEmit = () => {
          // If a tool is still working or we are expecting a synthesis response, keep waiting
          if (isToolPendingRef.current || isSynthesisWaitingRef.current) {
            console.log('⏳ Waiting for tool/synthesis before emitting...');
            setTimeout(checkAndEmit, 200);
            return;
          }

          if (pendingMessageRef.current && onAssistantMessageRef.current) {
            if (isEmittingRef.current) return;
            isEmittingRef.current = true;

            const { text, sources, tableData, chartData, traceSteps, metadata } = pendingMessageRef.current;

            // Synthesis should have been merged by response.done or delta handlers
            // But we do one final check here
            let finalText = text;
            const currentSynthesis = assistantResponseRef.current.trim();

            if (currentSynthesis) {
              if (text === "" || text === null) {
                finalText = currentSynthesis;
              } else if (!text.includes(currentSynthesis)) {
                finalText = `${text}\n\n${currentSynthesis}`;
              }
              assistantResponseRef.current = '';
            }

            // DEDUPLICATION: Ensure we don't emit empty or duplicate text
            if (finalText && finalText !== lastEmittedTextRef.current) {
              console.log('📤 Emitting unified response:', { sources, textLength: finalText.length });
              onAssistantMessageRef.current(finalText, sources, tableData, chartData, traceSteps, metadata);
              lastEmittedTextRef.current = finalText;
            }

            pendingMessageRef.current = null;
            onActivityCompleteRef.current?.('synthesis');
            isEmittingRef.current = false;
          }
          setIsSpeaking(false);
        };
        setTimeout(checkAndEmit, 300);
        break;

      case 'response.done':
        // Only trigger synthesis activity if there's actual output coming
        const hasOutput = event.response?.output?.some((item: any) =>
          item.type === 'message' || item.type === 'function_call'
        );

        if (hasOutput) {
          onActivityStartRef.current?.('synthesis');
        }

        if (assistantResponseRef.current && assistantResponseRef.current.trim()) {
          const synthesisContent = assistantResponseRef.current.trim();
          console.log('Assistant synthesis done:', synthesisContent.substring(0, 30) + '...');

          const hasFunctionCalls = event.response?.output?.some((item: any) =>
            item.type === 'function_call'
          );

          if (pendingMessageRef.current) {
            // Merge synthesis into existing tool response
            console.log('🔄 Merging synthesis into tool response');
            if (pendingMessageRef.current.text === "" || pendingMessageRef.current.text === null) {
              pendingMessageRef.current.text = synthesisContent;
            } else if (!pendingMessageRef.current.text.includes(synthesisContent)) {
              pendingMessageRef.current.text += `\n\n${synthesisContent}`;
            }
            isSynthesisWaitingRef.current = false;
          } else if (!hasFunctionCalls) {
            // Text-only message or synthesis that arrived after tool metadata was set
            const sources = pendingToolMetadataRef.current?.sources ||
              (responseSourcesRef.current.length > 0 ? responseSourcesRef.current : ['OPENAI']);
            const traceSteps = pendingToolMetadataRef.current?.traceSteps || [];

            if (userHasSpokenRef.current) {
              pendingMessageRef.current = {
                text: synthesisContent,
                sources: sources,
                traceSteps: traceSteps
              };
              isSynthesisWaitingRef.current = false; // We have a message now
              pendingToolMetadataRef.current = null; // Consume metadata
            }
          }

          assistantResponseRef.current = '';
          responseSourcesRef.current = [];
        } else {
          // If response.done arrived with no text but we were waiting, 
          // check if it was for a function call or the final part
          const isFinal = !event.response?.output?.some((item: any) => item.type === 'function_call');
          if (isFinal && isSynthesisWaitingRef.current) {
            console.log('⏹️ Synthesis finished with no text, clearing wait');
            isSynthesisWaitingRef.current = false;
          }
        }
        break;

      case 'error':
        console.error('OpenAI error:', event);
        break;
    }
  };

  const handleFunctionCall = async (name: string, argsJson: string, callId: string) => {
    try {
      pendingMessageRef.current = null;
      const args = JSON.parse(argsJson);
      console.log(`Function called: ${name}`, args);

      onActivityStartRef.current?.('retrieval');
      isSynthesisWaitingRef.current = true; // Signal that we expect synthesis after function_call_output

      const headers = {
        'Content-Type': 'application/json',
      };

      let result: any;

      if (name === 'doc_rag') {
        const response = await fetch(
          getApiUrl('/rag-retrieval'),
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              query: args.query,
              userId: user?.id
            }),
          }
        );

        if (!response.ok) {
          result = { success: false, voiceSummary: 'Failed to retrieve information from the knowledge base.' };
        } else {
          result = await response.json();
          pendingMessageRef.current = {
            text: result.enhancedResponse || result.voiceSummary,
            sources: ['VECTOR'],
            citations: result.documents,
            traceSteps: result.traceSteps || [{ name: 'Knowledge Retrieval', latency: 450, timestamp: Date.now() }],
          };
        }
        onActivityCompleteRef.current?.('retrieval');
        onActivityStartRef.current?.('synthesis');
      } else if (name === 'query_transactions') {
        const response = await fetch(
          getApiUrl('/transaction-query'),
          {
            method: 'POST',
            headers,
            body: JSON.stringify(args),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Transaction query failed:', response.status, errorText);
          result = {
            success: false,
            error: `Failed to query transactions: ${response.status}`,
            voiceSummary: 'Sorry, I encountered an error accessing the transaction data.',
          };
        } else {
          result = await response.json();

          if (result.success && result.summary) {
            // Queue message to display after audio finishes
            pendingMessageRef.current = {
              text: result.voiceSummary,
              sources: ['DB'],
              tableData: result.summary,
              traceSteps: result.traceSteps || [{ name: 'Database Query', latency: 150, timestamp: Date.now() }],
            };
          }
        }

        onActivityCompleteRef.current?.('retrieval');
        onActivityStartRef.current?.('synthesis');
      } else if (name === 'generate_transaction_chart') {
        const response = await fetch(
          getApiUrl('/transaction-chart'),
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
          const errorText = await response.text();
          console.error('Chart generation failed:', response.status, errorText);
          result = {
            success: false,
            error: `Failed to generate chart: ${response.status}`,
            voiceSummary: 'Sorry, I encountered an error generating the chart.',
          };
        } else {
          result = await response.json();

          if (result.success && result.chartData) {
            // Queue message to display after audio finishes
            pendingMessageRef.current = {
              text: result.voiceSummary,
              sources: ['DB'],
              chartData: result.chartData,
              traceSteps: result.traceSteps || [{ name: 'Chart Generation', latency: 200, timestamp: Date.now() }],
            };
          }
        }

        onActivityCompleteRef.current?.('retrieval');
        onActivityStartRef.current?.('synthesis');
      } else if (name === 'send_general_email') {
        const defaultEmail = 'sivakumarai2828@gmail.com';
        const recipientEmail = args.to || defaultEmail;

        const response = await fetch(getApiUrl('/transaction-email'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: recipientEmail,
            subject: args.subject,
            body: args.content,
          }),
        });

        if (!response.ok) {
          let errorMsg = `Error ${response.status}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.detail || errorMsg;
          } catch (e) { }
          result = { success: false, voiceSummary: `I failed to send the email: ${errorMsg}` };
        } else {
          result = await response.json();
          pendingMessageRef.current = {
            text: result.voiceSummary,
            sources: ['EMAIL'],
            traceSteps: [{ name: 'Send Email', latency: 300, timestamp: Date.now() }],
          };
        }
      } else if (name === 'send_email_report') {
        const defaultEmail = 'sivakumarai2828@gmail.com';
        const recipientEmail = args.to || defaultEmail;

        console.log('📧 EMAIL FUNCTION CALLED - Client:', args.clientId, '| To:', recipientEmail, '| Original:', args.to);

        // First, fetch transaction data
        const transactionResponse = await fetch(
          getApiUrl('/transaction-query'),
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


          // 3. Send email with summary and chart
          const response = await fetch(
            getApiUrl('/transaction-email'),
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                to: recipientEmail,
                subject: args.subject,
                transactionSummary: transactionData.summary
              }),
            }
          );

          if (!response.ok) {
            let errorMsg = `Error ${response.status}`;
            try {
              const errorData = await response.json();
              errorMsg = errorData.detail || errorMsg;
            } catch (e) {
              const errorText = await response.text();
              errorMsg = errorText || errorMsg;
            }
            console.error('Email send failed:', response.status, errorMsg);
            result = {
              success: false,
              error: errorMsg,
              voiceSummary: `Sorry, I encountered an error: ${errorMsg}`,
            };
          } else {
            result = await response.json();

            result.voiceSummary = `I've sent the transaction report to ${recipientEmail}`;
            pendingMessageRef.current = {
              text: result.voiceSummary,
              sources: ['EMAIL'],
              traceSteps: [{ name: 'Send Email', latency: 400, timestamp: Date.now() }],
            };
          }
        }

        onActivityComplete?.('retrieval');
        onActivityStart?.('synthesis');
      } else if (name === 'get_weather') {
        const response = await fetch(getApiUrl('/weather'), {
          method: 'POST',
          headers,
          body: JSON.stringify(args),
        });
        result = await response.json();
        if (result.success) {
          pendingMessageRef.current = {
            text: result.voiceSummary,
            sources: result.sources || ['OPEN-METEO'],
            traceSteps: result.traceSteps,
          };
        }

        onActivityComplete?.('retrieval');
        onActivityStart?.('synthesis');
      } else if (name === 'get_stock_price') {
        const response = await fetch(getApiUrl('/stock-price'), {
          method: 'POST',
          headers,
          body: JSON.stringify(args),
        });
        result = await response.json();
        if (result.success) {
          pendingMessageRef.current = {
            text: result.voiceSummary,
            sources: result.sources || ['YAHOO-FINANCE'],
            traceSteps: result.traceSteps,
          };
        }

        onActivityComplete?.('retrieval');
        onActivityStart?.('synthesis');
      } else if (name === 'web_search') {
        const response = await fetch(
          getApiUrl('/web-search-tool'),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: args.query,
              maxResults: args.maxResults || 5,
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Web search failed:', response.status, errorText);
          result = {
            success: false,
            error: `Failed to search the web: ${response.status}`,
          };
        } else {
          const searchData = await response.json();
          console.log('✅ Web search results:', searchData);

          if (searchData.results && searchData.results.length > 0) {
            const topResults = searchData.results.slice(0, 5);
            // Return THE RAW SEARCH DATA for OpenAI to synthesize
            result = topResults.map((r: any, i: number) =>
              `${i + 1}. ${r.title}: ${r.snippet}`
            ).join('. ');

            // Store metadata to be used by the synthesis response turn
            pendingToolMetadataRef.current = {
              sources: ['WEB'],
              traceSteps: searchData.traceSteps || [{ name: "Web Search", latency: 500, timestamp: Date.now() }],
            };
          } else {
            result = 'I could not find any results for that search query.';
          }
        }

        // Mark retrieval as complete
        onActivityComplete?.('retrieval');
        onActivityStart?.('synthesis');
      }

      sendFunctionCallOutput(callId, result);
    } catch (error) {
      console.error('Function call error:', error);
      sendFunctionCallOutput(callId, {
        success: false,
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

    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }

    pendingMessageRef.current = null;
    initialResponseCancelledRef.current = false;
    userHasSpokenRef.current = false;
    isSynthesisWaitingRef.current = false;
    isToolPendingRef.current = false;
    lastEmittedTextRef.current = '';
    isEmittingRef.current = false;

    setStatus('idle');
    setIsListening(false);
    setIsSpeaking(false);
    setAudioLevel(0);
    assistantResponseRef.current = '';
    responseSourcesRef.current = [];
    onConnectionChange?.(false);
  };



  return minimal ? (
    <button
      onClick={onToggle}
      className={`p-2 transition-colors ${isEnabled ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}
    >
      <Mic size={16} />
    </button>
  ) : null;
});

export default VoiceControls;
