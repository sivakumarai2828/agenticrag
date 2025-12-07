import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

interface VoiceControlsProps {
  onTranscript: (text: string) => void;
  onAssistantMessage?: (text: string, sources?: any[], tableData?: any, chartData?: any) => void;
  isEnabled: boolean;
  onToggle: () => void;
  onConnectionChange?: (isConnected: boolean) => void;
  onStatusChange?: (status: 'idle' | 'connecting' | 'connected' | 'error') => void;
  onListeningChange?: (isListening: boolean) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onAudioLevelChange?: (level: number) => void;
  selectedVoice?: string;
  enableVAD?: boolean;
}

const VoiceControls = forwardRef<any, VoiceControlsProps>(({
  onTranscript,
  onAssistantMessage,
  isEnabled,
  // onToggle is passed but not used internally
  onConnectionChange,
  onStatusChange,
  onListeningChange,
  onSpeakingChange,
  onAudioLevelChange,
  selectedVoice: selectedVoiceProp = 'alloy',
  enableVAD: enableVADProp = true,
}, ref) => {
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
  const pendingMessageRef = useRef<{ text: string; sources?: any[]; tableData?: any; chartData?: any } | null>(null);
  const functionResultDataRef = useRef<{ tableData?: any; chartData?: any } | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const initialResponseCancelledRef = useRef<boolean>(false);
  const userHasSpokenRef = useRef<boolean>(false);

  useEffect(() => {
    setSelectedVoice(selectedVoiceProp);
  }, [selectedVoiceProp]);

  useEffect(() => {
    setEnableVAD(enableVADProp);
  }, [enableVADProp]);

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  useEffect(() => {
    onListeningChange?.(isListening);
  }, [isListening, onListeningChange]);

  useEffect(() => {
    onSpeakingChange?.(isSpeaking);
  }, [isSpeaking, onSpeakingChange]);

  useEffect(() => {
    onAudioLevelChange?.(audioLevel);
  }, [audioLevel, onAudioLevelChange]);

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
  }));


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
        console.log('🔊 Audio track received from OpenAI');
        console.log('📊 Track details:', {
          kind: event.track.kind,
          enabled: event.track.enabled,
          muted: event.track.muted,
          readyState: event.track.readyState,
          streams: event.streams.length
        });

        // Check if the stream has actual audio data
        const stream = event.streams[0];
        const audioTracks = stream.getAudioTracks();
        console.log('🎵 Audio tracks in stream:', audioTracks.length);
        audioTracks.forEach((track, idx) => {
          console.log(`  Track ${idx}:`, {
            label: track.label,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState
          });

          // Explicitly enable the track
          track.enabled = true;
          console.log(`  ✅ Track ${idx} enabled explicitly`);

          // Listen for unmute event (track.muted is read-only, but we can detect when it changes)
          track.addEventListener('unmute', () => {
            console.log(`  🔊 Track ${idx} unmuted!`);
          });

          if (track.muted) {
            console.warn(`  ⚠️ Track ${idx} is muted at source - waiting for unmute event`);
          }
        });

        // Create or reuse audio element in DOM (helps with autoplay policies)
        let audioElement = document.getElementById('openai-voice-audio') as HTMLAudioElement;
        if (!audioElement) {
          audioElement = document.createElement('audio');
          audioElement.id = 'openai-voice-audio';
          audioElement.setAttribute('playsinline', 'true'); // Important for mobile
          audioElement.setAttribute('webkit-playsinline', 'true'); // iOS compatibility
          audioElement.style.display = 'none'; // Hidden but in DOM
          document.body.appendChild(audioElement);
          console.log('📻 Created audio element in DOM');
        }

        // CRITICAL: Ensure audio is NOT muted
        audioElement.muted = false;
        audioElement.autoplay = true;
        audioElement.volume = 1.0; // Ensure volume is at maximum
        audioElement.defaultMuted = false; // Ensure default is not muted
        audioElement.srcObject = event.streams[0];
        audioElementRef.current = audioElement;

        console.log('🔊 System volume check:', {
          systemVolume: navigator.mediaDevices ? 'available' : 'unavailable',
          audioElementVolume: audioElement.volume,
          audioElementMuted: audioElement.muted
        });

        console.log('🎚️ Audio element configured:', {
          autoplay: audioElement.autoplay,
          volume: audioElement.volume,
          muted: audioElement.muted,
          paused: audioElement.paused
        });

        audioElement.onplay = () => {
          console.log('🔊 Audio playback started');
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
        };
        audioElement.onloadedmetadata = () => {
          console.log('📝 Audio metadata loaded');
        };

        // Resume AudioContext if suspended (required by browsers)
        if (audioContextRef.current?.state === 'suspended') {
          console.log('🔓 Resuming suspended AudioContext');
          audioContextRef.current.resume();
        }

        // Attempt to play immediately
        audioElement.play().then(() => {
          console.log('✅ Audio play() succeeded');
          console.log('🔊 Audio state after play:', {
            paused: audioElement.paused,
            muted: audioElement.muted,
            volume: audioElement.volume,
            readyState: audioElement.readyState,
            networkState: audioElement.networkState,
            currentTime: audioElement.currentTime,
            duration: audioElement.duration
          });
        }).catch(err => {
          console.error('❌ Failed to auto-play audio:', err);
          console.log('💡 User interaction may be required to enable audio playback');
          console.log('💡 Try clicking anywhere on the page and reconnecting voice');

          // Try to enable audio on next user interaction
          const enableAudio = () => {
            if (audioContextRef.current?.state === 'suspended') {
              audioContextRef.current.resume();
            }
            audioElement.play().catch(console.error);
            document.removeEventListener('click', enableAudio);
          };
          document.addEventListener('click', enableAudio, { once: true });
        });
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
      onConnectionChange?.(true);
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

      // Resume AudioContext if it's suspended
      if (audioContext.state === 'suspended') {
        console.log('🔓 Resuming AudioContext for microphone input');
        await audioContext.resume();
      }
      console.log('🎤 AudioContext state:', audioContext.state);

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
        instructions: `You are Nexa, a helpful AI voice assistant with access to transaction data, charts, and email capabilities.

CRITICAL RULES:
1. NEVER greet the user when the session starts
2. NEVER say "Hello" or "How can I help you?" unless the user greets you first
3. WAIT SILENTLY for the user to speak first
4. ONLY respond after the user asks a question or makes a request
5. When introducing yourself (if asked), say "I'm Nexa" or "This is Nexa"

Be concise and helpful. When users ask about transactions, use the appropriate function.
When users request charts, use the generate_transaction_chart function with the correct chartType:
- Use "pie" for pie charts (status distribution)
- Use "line" for line charts (trends over time)
- Use "bar" for bar charts (amounts over time, this is default)

IMPORTANT: When users ask to send email reports WITHOUT specifying an email address, use the default email: sivakumarai2828@gmail.com

WEB SEARCH RULES:
- When you receive web search results from the web_search function, READ THE RESULTS DIRECTLY to the user
- DO NOT say "the results didn't contain relevant information" - the results ARE the answer
- Share the top 3-5 results with their titles and descriptions
- For restaurant queries, news, weather, or any web search, present the actual search results you received

When users say goodbye (bye, goodbye, see you, etc.), respond with a brief, friendly farewell like "Goodbye!" or "See you later!" Do NOT ask how you can help.`,
        voice: selectedVoice,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
          language: 'en'
        },
        turn_detection: enableVAD ? { type: 'server_vad' } : null,
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
                  description: 'The client ID to query transactions for (e.g., "5001", "5002"). Use the exact number the user mentions. Omit to query ALL transactions.',
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
                  description: 'The client ID to generate chart for (e.g., "5001", "5002"). Use the exact number the user mentions.',
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
          onTranscript(event.transcript);
        } else {
          console.warn('⚠️ Transcript event received but no transcript text:', event);
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

      case 'response.audio.done':
      case 'response.audio_transcript.done':
        console.log('Audio output complete');
        // Audio has finished playing, display any pending message
        setTimeout(() => {
          if (pendingMessageRef.current && onAssistantMessage) {
            const { text, sources, tableData, chartData } = pendingMessageRef.current;
            onAssistantMessage(text, sources, tableData, chartData);
            pendingMessageRef.current = null;
          }
          setIsSpeaking(false);
        }, 500);
        break;

      case 'response.done':
        if (assistantResponseRef.current) {
          console.log('Assistant response:', assistantResponseRef.current);

          if (onAssistantMessage && assistantResponseRef.current.trim()) {
            // Only show text responses if no function was called
            // Function calls handle their own message display
            const hasFunctionCalls = event.response?.output?.some((item: any) =>
              item.type === 'function_call'
            );

            if (!hasFunctionCalls) {
              // Skip ONLY the very first auto-greeting before user speaks
              // Check if this looks like a greeting AND user hasn't spoken
              const looksLikeGreeting = /^(hello|hi|hey|greetings|welcome)/i.test(assistantResponseRef.current.trim());

              if (!userHasSpokenRef.current && looksLikeGreeting && !initialResponseCancelledRef.current) {
                console.log('Suppressing initial auto-greeting:', assistantResponseRef.current);
                initialResponseCancelledRef.current = true;
                assistantResponseRef.current = '';
                pendingMessageRef.current = null;
                setIsSpeaking(false);
                // Stop audio playback if it started
                if (audioElementRef.current) {
                  audioElementRef.current.pause();
                  audioElementRef.current.currentTime = 0;
                }
                return;
              }

              // Queue text message to display after audio finishes
              pendingMessageRef.current = {
                text: assistantResponseRef.current,
                sources: responseSourcesRef.current.length > 0 ? responseSourcesRef.current : ['OPENAI'],
                tableData: functionResultDataRef.current?.tableData,
                chartData: functionResultDataRef.current?.chartData,
              };
            } else {
              // Function call response - attach data to OpenAI's narrative
              pendingMessageRef.current = {
                text: assistantResponseRef.current,
                sources: responseSourcesRef.current.length > 0 ? responseSourcesRef.current : ['DB'],
                tableData: functionResultDataRef.current?.tableData,
                chartData: functionResultDataRef.current?.chartData,
              };
            }
          }

          assistantResponseRef.current = '';
          responseSourcesRef.current = [];
          functionResultDataRef.current = null;
        }

        // Fallback: If there's a pending message, display it after a delay
        // This ensures messages aren't stuck forever if audio events don't fire
        setTimeout(() => {
          if (pendingMessageRef.current && onAssistantMessage) {
            console.log('Fallback: Displaying pending message');
            const { text, sources, tableData, chartData } = pendingMessageRef.current;
            onAssistantMessage(text, sources, tableData, chartData);
            pendingMessageRef.current = null;
            setIsSpeaking(false);
          }
        }, 3000);
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
            // Store table data to attach to OpenAI's response later
            // Don't display the DB summary separately - OpenAI will narrate it
            responseSourcesRef.current = ['DB'];
            functionResultDataRef.current = {
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
            // Store chart data to attach to OpenAI's response later
            responseSourcesRef.current = ['DB'];
            functionResultDataRef.current = {
              chartData: result.chartData,
            };
          }
        }
      } else if (name === 'send_transaction_email') {
        const defaultEmail = 'sivakumarai2828@gmail.com';
        const recipientEmail = args.email || defaultEmail;

        console.log('📧 EMAIL FUNCTION CALLED - Client:', args.clientId, '| To:', recipientEmail, '| Original:', args.email);

        // First, fetch transaction data
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

          // Now send the email with transaction data
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
            const errorText = await response.text();
            console.error('Email send failed:', response.status, errorText);
            result = {
              success: false,
              error: `Failed to send email: ${response.status}`,
              voiceSummary: 'Sorry, I encountered an error sending the email.',
            };
          } else {
            result = await response.json();

            if (result.success) {
              // Queue message to display after audio finishes
              pendingMessageRef.current = {
                text: `Email report sent successfully to ${recipientEmail}`,
                sources: ['EMAIL'],
              };
              result.voiceSummary = `I've sent the transaction report to ${recipientEmail}`;
            }
          }
        }
      } else if (name === 'web_search') {
        // Call Python backend directly (not Supabase Edge Function)
        const backendUrl = 'http://localhost:8000';

        const response = await fetch(
          `${backendUrl}/web-search-tool`,
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
            // Format the search results into a detailed, readable summary
            const topResults = searchData.results.slice(0, 5);

            // Create a simple, direct response that OpenAI will read verbatim
            const directResponse = topResults.map((r: any, i: number) =>
              `${i + 1}. ${r.title}: ${r.snippet}`
            ).join('. ');

            // DON'T set pendingMessageRef - let OpenAI handle the display
            // This prevents duplicate messages (one from WEB, one from OPENAI)

            // Return ONLY the formatted text - no complex object
            result = `I found ${searchData.results.length} results. ${directResponse}`;
          } else {
            result = 'I could not find any results for that search query.';
          }
        }
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

    setStatus('idle');
    setIsListening(false);
    setIsSpeaking(false);
    setAudioLevel(0);
    assistantResponseRef.current = '';
    responseSourcesRef.current = [];
    onConnectionChange?.(false);
  };



  return null;
});

export default VoiceControls;
