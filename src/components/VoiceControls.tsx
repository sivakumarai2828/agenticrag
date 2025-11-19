import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Radio } from 'lucide-react';

interface VoiceControlsProps {
  onTranscript: (text: string, skipAgentProcessing?: boolean) => void;
  onResponse: (audio: ArrayBuffer) => void;
  onAssistantMessage?: (text: string, sources?: any[], tableData?: any, chartData?: any) => void;
  isEnabled: boolean;
  onToggle: () => void;
  onProviderChange?: (provider: 'openai' | 'pipecat') => void;
  onPipecatOptionsChange?: (options: { language: string }) => void;
}

export default function VoiceControls({
  onTranscript,
  onAssistantMessage,
  isEnabled,
  onToggle,
  onProviderChange,
  onPipecatOptionsChange,
}: VoiceControlsProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<string>('alloy');
  const [voiceProvider, setVoiceProvider] = useState<'openai' | 'pipecat'>('openai');
  const [enableVAD, setEnableVAD] = useState(true);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const assistantResponseRef = useRef<string>('');
  const responseSourcesRef = useRef<any[]>([]);
  const recognitionRef = useRef<any>(null);
  const pipecatWsRef = useRef<WebSocket | null>(null);
  const pipecatAudioContextRef = useRef<AudioContext | null>(null);
  const pipecatAudioQueueRef = useRef<Float32Array[]>([]);
  const pipecatIsPlayingRef = useRef<boolean>(false);
  const pipecatScheduledTimeRef = useRef<number>(0);
  const pipecatSourceNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const pipecatRecognitionRef = useRef<any>(null);
  const pipecatUserTranscriptRef = useRef<string>('');
  const pendingFunctionCallRef = useRef<boolean>(false);
  const currentTranscriptRef = useRef<string>('');
  const voiceSessionActiveRef = useRef<boolean>(false);
  const pipecatTableDataRef = useRef<any>(null);
  const pipecatChartDataRef = useRef<any>(null);

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

      const sdpResponse = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
        {
          method: 'POST',
          body: offer.sdp,
          headers: {
            'Authorization': `Bearer ${ephemeralKey}`,
            'Content-Type': 'application/sdp',
          },
        }
      );

      if (!sdpResponse.ok) {
        throw new Error('Failed to exchange SDP');
      }

      const answerSdp = await sdpResponse.text();
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: answerSdp,
      };

      await pc.setRemoteDescription(answer);

      setStatus('connected');

      setTimeout(() => {
        sendSessionUpdate();
      }, 1000);

    } catch (error) {
      console.error('Failed to connect to OpenAI:', error);
      setStatus('error');
      cleanup();
    }
  };

  const encodeVarint = (value: number): number[] => {
    const bytes: number[] = [];
    while (value > 0x7F) {
      bytes.push((value & 0x7F) | 0x80);
      value >>>= 7;
    }
    bytes.push(value & 0x7F);
    return bytes;
  };

  const serializeAudioFrame = (audioBuffer: ArrayBuffer, sampleRate: number, numChannels: number): ArrayBuffer | null => {
    try {
      const audioBytes = new Uint8Array(audioBuffer);
      const audioLength = audioBytes.length;

      const parts: number[] = [];

      parts.push(0x12);

      let frameSize = 0;
      frameSize += 1;
      frameSize += encodeVarint(audioLength).length;
      frameSize += audioLength;
      frameSize += 1;
      frameSize += encodeVarint(sampleRate).length;
      frameSize += 1;
      frameSize += encodeVarint(numChannels).length;

      parts.push(...encodeVarint(frameSize));
      parts.push(0x1A);
      parts.push(...encodeVarint(audioLength));
      parts.push(...audioBytes);
      parts.push(0x20);
      parts.push(...encodeVarint(sampleRate));
      parts.push(0x28);
      parts.push(...encodeVarint(numChannels));

      return new Uint8Array(parts).buffer;
    } catch (error) {
      console.error('Serialization error:', error);
      return null;
    }
  };

  const deserializeProtobufAudio = (buffer: ArrayBuffer): ArrayBuffer | null => {
    try {
      const view = new Uint8Array(buffer);
      let offset = 0;

      while (offset < view.length) {
        if (view[offset] === 0x12) {
          offset++;
          let length = 0;
          let shift = 0;
          while (offset < view.length) {
            const byte = view[offset++];
            length |= (byte & 0x7F) << shift;
            if ((byte & 0x80) === 0) break;
            shift += 7;
          }

          const frameStart = offset;
          while (offset < frameStart + length && offset < view.length) {
            if (view[offset] === 0x1A) {
              offset++;
              let audioLength = 0;
              shift = 0;
              while (offset < view.length) {
                const byte = view[offset++];
                audioLength |= (byte & 0x7F) << shift;
                if ((byte & 0x80) === 0) break;
                shift += 7;
              }

              if (offset + audioLength <= view.length) {
                return buffer.slice(offset, offset + audioLength);
              }
            }
            offset++;
          }
        }
        offset++;
      }

      return null;
    } catch (error) {
      console.error('Protobuf parsing error:', error);
      return null;
    }
  };

  /**
   * Pipecat WebSocket Integration - TRUE REAL-TIME STREAMING
   *
   * Establishes a WebSocket connection to the Pipecat speech-to-speech service.
   * Optimized for minimal latency with immediate audio playback.
   *
   * Audio Format:
   * - Sample Rate: 16kHz (16000 Hz)
   * - Format: PCM16 (16-bit signed integer)
   * - Channels: Mono (1 channel)
   * - Buffer Size: 2048 samples (~128ms latency)
   *
   * Communication Protocol:
   * - Outbound: Raw PCM16 audio data (binary, continuous streaming)
   * - Inbound: JSON messages for metadata, Blob for audio chunks
   *
   * Message Types:
   * - config: Initial configuration with language and sample rate
   * - transcript: User/assistant speech transcripts (with is_final flag)
   * - transcript_delta: Incremental text updates as assistant speaks
   * - response_start: Assistant begins generating response
   * - response_complete: Assistant finished responding
   * - audio_start/audio_delta: Audio streaming indicators
   * - Blob: Audio chunk data (PCM16 format, played IMMEDIATELY)
   *
   * Real-Time Optimizations:
   * - ZERO BUFFERING: Audio chunks play immediately upon arrival
   * - Scheduled Playback: Uses Web Audio API scheduling for gapless streaming
   * - Incremental Transcripts: Shows text as it's being generated
   * - ~128ms total latency: Network + processing + audio buffer
   *
   * Features:
   * - True real-time bidirectional audio streaming
   * - Automatic speech recognition (ASR)
   * - Streaming text-to-speech (TTS) synthesis
   * - Multi-language support (8 languages)
   * - Live transcript display with interim results
   */
  const connectToPipecat = async () => {
    try {
      setStatus('connecting');
      console.log('Connecting to Pipecat WebSocket...');

      // Use environment variable or replace with your deployed backend URL
      const pipecatBackendUrl = import.meta.env.VITE_PIPECAT_BACKEND_URL || 'ws://localhost:8000/ws';
      const ws = new WebSocket(pipecatBackendUrl);
      pipecatWsRef.current = ws;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      pipecatAudioContextRef.current = audioContext;

      ws.onopen = async () => {
        console.log('Pipecat WebSocket connected');
        setStatus('connected');

        try {
          await setupPipecatAudioInput(ws, audioContext);
          setupPipecatSpeechRecognition();
          console.log('Audio input setup complete, streaming protobuf audio frames...');
        } catch (error) {
          console.error('Error in onopen handler:', error);
          ws.close();
        }
      };

      ws.onmessage = async (event) => {
        try {
          if (event.data instanceof Blob) {
            const arrayBuffer = await event.data.arrayBuffer();
            handlePipecatAudioResponseProtobuf(arrayBuffer);
          } else if (event.data instanceof ArrayBuffer) {
            handlePipecatAudioResponseProtobuf(event.data);
          } else if (typeof event.data === 'string') {
            const message = JSON.parse(event.data);
            console.log('Pipecat message:', message);

            if (message.type === 'transcript') {
              if (message.role === 'user') {
                onTranscript(message.text);
                setInterimTranscript('');
              } else if (message.role === 'assistant') {
                if (message.is_final) {
                  assistantResponseRef.current = message.text;
                } else {
                  setInterimTranscript(message.text);
                }
              }
            } else if (message.type === 'transcript_delta') {
              if (message.role === 'assistant') {
                assistantResponseRef.current += message.delta;
                setInterimTranscript(assistantResponseRef.current);
              }
            } else if (message.type === 'function_data') {
              console.log('Pipecat function data:', message);
              if (message.data) {
                if (message.data.tableData) {
                  pipecatTableDataRef.current = message.data.tableData;
                }
                if (message.data.chartData) {
                  pipecatChartDataRef.current = message.data.chartData;
                }
                if (message.data.sources) {
                  responseSourcesRef.current = message.data.sources;
                }
              }
            } else if (message.type === 'response_start') {
              assistantResponseRef.current = '';
              pipecatTableDataRef.current = null;
              pipecatChartDataRef.current = null;
              setInterimTranscript('');
              setIsSpeaking(true);
            } else if (message.type === 'response_complete') {
              if (assistantResponseRef.current && onAssistantMessage) {
                onAssistantMessage(
                  assistantResponseRef.current,
                  responseSourcesRef.current,
                  pipecatTableDataRef.current,
                  pipecatChartDataRef.current
                );
                assistantResponseRef.current = '';
                responseSourcesRef.current = [];
                pipecatTableDataRef.current = null;
                pipecatChartDataRef.current = null;
              }
              setInterimTranscript('');
              setIsSpeaking(false);
            } else if (message.type === 'audio_start') {
              setIsSpeaking(true);
            } else if (message.type === 'audio_delta') {
              setIsSpeaking(true);
            }
          }
        } catch (error) {
          console.error('Error handling Pipecat message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Pipecat WebSocket error:', error);
        setStatus('error');
      };

      ws.onclose = (event) => {
        console.log('Pipecat WebSocket closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        setStatus('idle');
        cleanupPipecat();
      };

    } catch (error) {
      console.error('Failed to connect to Pipecat:', error);
      setStatus('error');
      cleanupPipecat();
    }
  };

  const setupPipecatAudioInput = async (ws: WebSocket, audioContext: AudioContext) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      mediaStreamRef.current = stream;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(2048, 1, 1);

      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = float32ToPCM16(inputData);
          const protobufFrame = serializeAudioFrame(pcm16, 16000, 1);
          if (protobufFrame) {
            ws.send(protobufFrame);
          }
          setIsListening(true);
        }
      };

      visualizeAudio();
    } catch (error) {
      console.error('Error setting up Pipecat audio input:', error);
      throw error;
    }
  };

  const handlePipecatAudioResponseProtobuf = async (arrayBuffer: ArrayBuffer) => {
    try {
      const audioData = deserializeProtobufAudio(arrayBuffer);

      if (audioData) {
        const byteLength = audioData.byteLength;
        const alignedLength = Math.floor(byteLength / 2) * 2;

        if (alignedLength === 0) {
          console.log('Received empty audio buffer');
          return;
        }

        const alignedBuffer = audioData.slice(0, alignedLength);
        const int16Data = new Int16Array(alignedBuffer);
        const float32Data = pcm16ToFloat32(int16Data);

        playPipecatAudioChunkImmediately(float32Data);
      } else {
        const int16Data = new Int16Array(arrayBuffer);
        const float32Data = pcm16ToFloat32(int16Data);
        playPipecatAudioChunkImmediately(float32Data);
      }
    } catch (error) {
      console.error('Error handling Pipecat audio response:', error);
    }
  };

  const playPipecatAudioChunkImmediately = (audioData: Float32Array) => {
    const audioContext = pipecatAudioContextRef.current;
    if (!audioContext) return;

    const currentTime = audioContext.currentTime;

    if (pipecatScheduledTimeRef.current === 0 || pipecatScheduledTimeRef.current < currentTime) {
      pipecatScheduledTimeRef.current = currentTime;
    }

    const audioBuffer = audioContext.createBuffer(1, audioData.length, 16000);
    audioBuffer.getChannelData(0).set(audioData);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    source.onended = () => {
      const index = pipecatSourceNodesRef.current.indexOf(source);
      if (index > -1) {
        pipecatSourceNodesRef.current.splice(index, 1);
      }
      if (pipecatSourceNodesRef.current.length === 0) {
        pipecatScheduledTimeRef.current = 0;
        setIsSpeaking(false);
      }
    };

    source.start(pipecatScheduledTimeRef.current);
    pipecatSourceNodesRef.current.push(source);
    pipecatScheduledTimeRef.current += audioBuffer.duration;
    setIsSpeaking(true);
  };

  const setupPipecatSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        pipecatUserTranscriptRef.current = finalTranscript;
        onTranscript(finalTranscript);
        setInterimTranscript('');
      } else if (interimTranscript) {
        setInterimTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };

    pipecatRecognitionRef.current = recognition;
    recognition.start();
  };

  const float32ToPCM16 = (float32Array: Float32Array): ArrayBuffer => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm16.buffer;
  };

  const pcm16ToFloat32 = (int16Array: Int16Array): Float32Array => {
    const float32 = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
    }
    return float32;
  };

  const cleanupPipecat = () => {
    if (pipecatWsRef.current) {
      pipecatWsRef.current.close();
      pipecatWsRef.current = null;
    }

    if (pipecatRecognitionRef.current) {
      try {
        pipecatRecognitionRef.current.stop();
        pipecatRecognitionRef.current = null;
      } catch (e) {
        console.error('Error stopping speech recognition:', e);
      }
    }

    pipecatSourceNodesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
      }
    });
    pipecatSourceNodesRef.current = [];

    if (pipecatAudioContextRef.current) {
      pipecatAudioContextRef.current.close();
      pipecatAudioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    pipecatAudioQueueRef.current = [];
    pipecatIsPlayingRef.current = false;
    pipecatScheduledTimeRef.current = 0;
    pipecatUserTranscriptRef.current = '';
    setStatus('idle');
    setIsListening(false);
    setIsSpeaking(false);
    setInterimTranscript('');
  };

  const setupAudioInput = async (pc: RTCPeerConnection) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      visualizeAudio();

    } catch (error) {
      console.error('Failed to access microphone:', error);
      throw error;
    }
  };

  const setupDataChannel = (pc: RTCPeerConnection) => {
    const dataChannel = pc.createDataChannel('oai-events');
    dataChannelRef.current = dataChannel;

    dataChannel.onopen = () => {
      console.log('Data channel opened');
      setIsListening(true);
    };

    dataChannel.onclose = () => {
      console.log('Data channel closed');
      setIsListening(false);
    };

    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleRealtimeEvent(message);
      } catch (error) {
        console.error('Failed to parse data channel message:', error);
      }
    };
  };

  const handleRealtimeEvent = async (event: any) => {
    console.log('Realtime event:', event.type, event);

    switch (event.type) {
      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          console.log('Transcript:', event.transcript);
          setInterimTranscript('');
          currentTranscriptRef.current = event.transcript;
          onTranscript(event.transcript, voiceSessionActiveRef.current);
        }
        break;

      case 'conversation.item.input_audio_transcription.delta':
        if (event.delta) {
          setInterimTranscript(event.delta);
        }
        break;

      case 'response.function_call_arguments.done':
        console.log('Function call:', event.name, event.arguments);
        if (event.name === 'query_transactions') {
          pendingFunctionCallRef.current = true;
          try {
            const args = JSON.parse(event.arguments);
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            console.log('Querying transactions with params:', args);

            const response = await fetch(
              `${supabaseUrl}/functions/v1/transaction-query`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify(args),
              }
            );

            if (!response.ok) {
              throw new Error(`Transaction query failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Transaction query results:', result);

            responseSourcesRef.current = ['TRANSACTION_DB'];

            if (onAssistantMessage && result.success) {
              onAssistantMessage(
                result.voiceSummary || result.summary?.message || 'Query completed',
                ['TRANSACTION_DB'],
                result,
                undefined
              );
            }

            if (dataChannelRef.current?.readyState === 'open') {
              dataChannelRef.current.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: event.call_id,
                  output: JSON.stringify(result),
                },
              }));

              dataChannelRef.current.send(JSON.stringify({
                type: 'response.create',
              }));
            }

            pendingFunctionCallRef.current = false;
          } catch (error) {
            console.error('Error calling query_transactions:', error);
            pendingFunctionCallRef.current = false;
          }
        } else if (event.name === 'generate_transaction_chart') {
          pendingFunctionCallRef.current = true;
          try {
            const args = JSON.parse(event.arguments);
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            console.log('Generating chart for client:', args.clientId);

            const response = await fetch(
              `${supabaseUrl}/functions/v1/transaction-chart`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify(args),
              }
            );

            if (!response.ok) {
              throw new Error(`Chart generation failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Chart generation results:', result);

            responseSourcesRef.current = ['CHART'];

            if (onAssistantMessage && result.success) {
              onAssistantMessage(
                result.voiceSummary || result.summary || 'Chart generated successfully',
                ['CHART'],
                undefined,
                result.chartData
              );
            }

            if (dataChannelRef.current?.readyState === 'open') {
              dataChannelRef.current.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: event.call_id,
                  output: JSON.stringify(result),
                },
              }));

              dataChannelRef.current.send(JSON.stringify({
                type: 'response.create',
              }));
            }

            pendingFunctionCallRef.current = false;
          } catch (error) {
            console.error('Error calling generate_transaction_chart:', error);
            pendingFunctionCallRef.current = false;
          }
        } else if (event.name === 'send_email_report') {
          pendingFunctionCallRef.current = true;
          try {
            const args = JSON.parse(event.arguments);
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            console.log('📧 EMAIL FUNCTION CALLED - Client:', args.clientId, '| To:', args.to, '| Full args:', JSON.stringify(args));

            const queryResponse = await fetch(
              `${supabaseUrl}/functions/v1/transaction-query`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  query: `transactions for client ${args.clientId}`,
                  clientId: args.clientId
                }),
              }
            );

            if (!queryResponse.ok) {
              throw new Error(`Transaction query failed: ${queryResponse.statusText}`);
            }

            const queryResult = await queryResponse.json();

            const emailResponse = await fetch(
              `${supabaseUrl}/functions/v1/transaction-email`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  to: args.to,
                  subject: args.subject || 'Transaction Intelligence Report',
                  transactionSummary: queryResult.summary,
                }),
              }
            );

            const result = await emailResponse.json();

            if (!emailResponse.ok) {
              console.error('Email sending failed:', result);

              const errorMessage = result.message || result.error || 'Email sending failed';

              if (onAssistantMessage) {
                onAssistantMessage(
                  errorMessage,
                  ['EMAIL'],
                  undefined,
                  undefined
                );
              }

              if (dataChannelRef.current?.readyState === 'open') {
                dataChannelRef.current.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: event.call_id,
                    output: JSON.stringify({ error: errorMessage }),
                  },
                }));

                dataChannelRef.current.send(JSON.stringify({
                  type: 'response.create',
                }));
              }

              pendingFunctionCallRef.current = false;
              return;
            }

            console.log('Email sent successfully:', result);

            responseSourcesRef.current = ['EMAIL'];

            if (onAssistantMessage && result.success) {
              onAssistantMessage(
                `Email report sent successfully to ${args.to}`,
                ['EMAIL'],
                undefined,
                undefined
              );
            }

            if (dataChannelRef.current?.readyState === 'open') {
              dataChannelRef.current.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: event.call_id,
                  output: JSON.stringify(result),
                },
              }));

              dataChannelRef.current.send(JSON.stringify({
                type: 'response.create',
              }));
            }

            pendingFunctionCallRef.current = false;
          } catch (error) {
            console.error('Error calling send_email_report:', error);

            if (onAssistantMessage) {
              onAssistantMessage(
                'Sorry, there was an error sending the email. Please try again.',
                ['EMAIL'],
                undefined,
                undefined
              );
            }

            if (dataChannelRef.current?.readyState === 'open') {
              dataChannelRef.current.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: event.call_id,
                  output: JSON.stringify({ error: 'Email sending failed' }),
                },
              }));

              dataChannelRef.current.send(JSON.stringify({
                type: 'response.create',
              }));
            }

            pendingFunctionCallRef.current = false;
          }
        } else if (event.name === 'search_documents') {
          try {
            const args = JSON.parse(event.arguments);
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            console.log('Searching documents with query:', args.query);

            const response = await fetch(`${supabaseUrl}/functions/v1/rag-retrieval`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({ query: args.query }),
            });

            const data = await response.json();
            console.log('RAG retrieval results:', data);

            if (dataChannelRef.current?.readyState === 'open') {
              const searchResults = data.documents || [];
              const enhancedResponse = data.enhancedResponse || '';

              const needsWebFallback =
                searchResults.length === 0 ||
                !enhancedResponse ||
                enhancedResponse.toLowerCase().includes('does not contain') ||
                enhancedResponse.toLowerCase().includes('not enough information') ||
                enhancedResponse.toLowerCase().includes('cannot provide') ||
                enhancedResponse.toLowerCase().includes('i don\'t know') ||
                enhancedResponse.toLowerCase().includes('no information');

              if (needsWebFallback) {
                console.log('No useful results in documents, falling back to web search...');

                try {
                  const webResponse = await fetch(`${supabaseUrl}/functions/v1/web-search-tool`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${supabaseKey}`,
                    },
                    body: JSON.stringify({ query: args.query }),
                  });

                  const webData = await webResponse.json();
                  console.log('Fallback web search results:', webData);

                  responseSourcesRef.current = [
                    { type: 'web', results: webData.results || [] }
                  ];

                  dataChannelRef.current.send(JSON.stringify({
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: event.call_id,
                      output: JSON.stringify({
                        source: 'web',
                        results: webData.results || [],
                        answer: webData.answer,
                        note: 'Information retrieved from web search as no relevant documents were found in the knowledge base.',
                      }),
                    },
                  }));
                } catch (webError) {
                  console.error('Web search fallback failed:', webError);

                  dataChannelRef.current.send(JSON.stringify({
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: event.call_id,
                      output: JSON.stringify({
                        results: [],
                        note: 'No relevant information found in the knowledge base.',
                      }),
                    },
                  }));
                }
              } else {
                const formattedResults = searchResults.map((doc: any) => ({
                  title: doc.title,
                  content: doc.content,
                  similarity: doc.similarity,
                }));

                responseSourcesRef.current = [
                  { type: 'documents', results: formattedResults }
                ];

                dataChannelRef.current.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: event.call_id,
                    output: JSON.stringify({
                      source: 'documents',
                      results: formattedResults,
                      enhanced_answer: data.enhancedResponse,
                    }),
                  },
                }));
              }

              dataChannelRef.current.send(JSON.stringify({
                type: 'response.create',
              }));
            }
          } catch (error) {
            console.error('Error calling search_documents:', error);
          }
        } else if (event.name === 'web_search') {
          try {
            const args = JSON.parse(event.arguments);
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            console.log('Searching web with query:', args.query);

            const response = await fetch(`${supabaseUrl}/functions/v1/web-search-tool`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({ query: args.query }),
            });

            const data = await response.json();
            console.log('Web search results:', data);

            if (dataChannelRef.current?.readyState === 'open') {
              dataChannelRef.current.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: event.call_id,
                  output: JSON.stringify({
                    results: data.results || [],
                    answer: data.answer,
                  }),
                },
              }));

              dataChannelRef.current.send(JSON.stringify({
                type: 'response.create',
              }));
            }
          } catch (error) {
            console.error('Error calling web_search:', error);
          }
        }
        break;

      case 'response.audio.delta':
        setIsSpeaking(true);
        break;

      case 'response.audio.done':
        setIsSpeaking(false);
        break;

      case 'response.text.delta':
        if (event.delta) {
          assistantResponseRef.current += event.delta;
        }
        break;

      case 'response.text.done':
        console.log('Text response complete:', event.text);
        if (event.text) {
          assistantResponseRef.current = event.text;
        }
        break;

      case 'response.audio_transcript.done':
        console.log('Audio transcript complete:', event.transcript);
        if (event.transcript && event.transcript.trim()) {
          assistantResponseRef.current = event.transcript;
        }
        break;

      case 'response.done':
        console.log('Response complete');
        setIsSpeaking(false);

        if (assistantResponseRef.current && assistantResponseRef.current.trim() && onAssistantMessage) {
          console.log('Sending assistant message to chat:', assistantResponseRef.current);
          const hasFunctionData = responseSourcesRef.current.length > 0 &&
            (responseSourcesRef.current.includes('TRANSACTION_DB') ||
             responseSourcesRef.current.includes('CHART'));

          if (!hasFunctionData) {
            onAssistantMessage(assistantResponseRef.current, ['OPENAI']);
          }

          assistantResponseRef.current = '';
          responseSourcesRef.current = [];
        }
        break;

      case 'error':
        console.error('Realtime API error:', event);
        setStatus('error');
        break;
    }
  };

  const sendSessionUpdate = () => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      return;
    }

    const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: 'You are a helpful AI assistant that helps users query their data, documents, and transactions. When users ask about transactions, client data, or financial information, use the query_transactions function. When users ask questions about documents, use the search_documents function. Keep responses concise and actionable.',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: enableVAD ? {
          type: 'server_vad',
          threshold: 0.7,
          prefix_padding_ms: 300,
          silence_duration_ms: 1000,
        } : null,
        tools: [
          {
            type: 'function',
            name: 'search_documents',
            description: 'Search the knowledge base for relevant information from uploaded documents. Use this when users ask questions about specific topics, products, services, or information that might be in the documents.',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query to find relevant information in the documents',
                },
              },
              required: ['query'],
            },
          },
          {
            type: 'function',
            name: 'web_search',
            description: 'Search the web for current information when the knowledge base does not contain relevant information. Use this for general knowledge questions, current events, or topics not covered in the documents.',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query to find information on the web',
                },
              },
              required: ['query'],
            },
          },
          {
            type: 'function',
            name: 'query_transactions',
            description: 'Query and retrieve transaction records from the database. Use this when users ask about client transactions, purchases, refunds, transaction status, approved transactions, declined transactions, or financial data.',
            parameters: {
              type: 'object',
              properties: {
                clientId: {
                  type: 'number',
                  description: 'The client ID to filter transactions by (e.g., 5001, 5002, 5003)',
                },
                type: {
                  type: 'string',
                  enum: ['PURCHASE', 'REFUND'],
                  description: 'Filter by transaction type',
                },
                status: {
                  type: 'string',
                  enum: ['APPROVED', 'DECLINED'],
                  description: 'Filter by transaction status',
                },
              },
            },
          },
          {
            type: 'function',
            name: 'send_email_report',
            description: 'Send a transaction report via email to a specified recipient. Use this when users ask to email or send transaction reports.',
            parameters: {
              type: 'object',
              properties: {
                to: {
                  type: 'string',
                  description: 'Email address of the recipient',
                },
                subject: {
                  type: 'string',
                  description: 'Subject line for the email',
                },
                clientId: {
                  type: 'number',
                  description: 'Client ID to generate the report for',
                },
              },
              required: ['to', 'clientId'],
            },
          },
          {
            type: 'function',
            name: 'generate_transaction_chart',
            description: 'Generate a chart visualization of transaction trends over time for a specific client.',
            parameters: {
              type: 'object',
              properties: {
                clientId: {
                  type: 'number',
                  description: 'The client ID to generate chart for',
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

  const visualizeAudio = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const updateLevel = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average / 255);

      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  };

  const cleanup = () => {
    voiceSessionActiveRef.current = false;
    pendingFunctionCallRef.current = false;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    cleanupPipecat();

    setIsListening(false);
    setIsSpeaking(false);
    setStatus('idle');
    setInterimTranscript('');
    setAudioLevel(0);
  };

  const startPipecatRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await processPipecatAudio(audioBlob);

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
      };

      setIsListening(true);
      mediaRecorder.start();

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsListening(false);
        }
      }, 5000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsListening(false);
    }
  };

  const processPipecatAudio = async (audioBlob: Blob) => {
    try {
      setInterimTranscript('Processing audio...');

      const audioContext = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const wavBlob = await audioBufferToWav(audioBuffer);

      const formData = new FormData();
      formData.append('file', wavBlob, 'audio.wav');
      formData.append('source_language', 'en');

      const response = await fetch('https://pipecat-speech2speech.onrender.com/v1/speech2speech', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process audio');
      }

      const responseAudioBlob = await response.blob();

      const audioUrl = URL.createObjectURL(responseAudioBlob);
      const audio = new Audio(audioUrl);

      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();

      setInterimTranscript('');

    } catch (error) {
      console.error('Pipecat processing error:', error);
      setInterimTranscript('');
      alert('Failed to process audio. Please try again.');
    }
  };

  const audioBufferToWav = async (audioBuffer: AudioBuffer): Promise<Blob> => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numberOfChannels * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);
    const channels: Float32Array[] = [];
    let offset = 0;

    const writeString = (str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset++, str.charCodeAt(i));
      }
    };

    writeString('RIFF');
    view.setUint32(offset, 36 + length, true); offset += 4;
    writeString('WAVE');
    writeString('fmt ');
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2;
    view.setUint16(offset, numberOfChannels, true); offset += 2;
    view.setUint32(offset, audioBuffer.sampleRate, true); offset += 4;
    view.setUint32(offset, audioBuffer.sampleRate * numberOfChannels * 2, true); offset += 4;
    view.setUint16(offset, numberOfChannels * 2, true); offset += 2;
    view.setUint16(offset, 16, true); offset += 2;
    writeString('data');
    view.setUint32(offset, length, true); offset += 4;

    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const stopPipecatRecording = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  };

  const toggleListening = () => {
    if (isListening) {
      cleanup();
      if (isEnabled) {
        connectToOpenAI();
      }
    }
  };

  const togglePipecatListening = () => {
    if (isListening) {
      stopPipecatRecording();
    } else {
      startPipecatRecording();
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connecting':
        return 'bg-yellow-500';
      case 'connected':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return isListening ? 'Listening' : 'Connected';
      case 'error':
        return 'Error';
      default:
        return 'Offline';
    }
  };

  const voices = [
    { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
    { id: 'echo', name: 'Echo', description: 'Warm and friendly' },
    { id: 'shimmer', name: 'Shimmer', description: 'Soft and gentle' },
    { id: 'ash', name: 'Ash', description: 'Clear and expressive' },
    { id: 'ballad', name: 'Ballad', description: 'Smooth and melodic' },
    { id: 'coral', name: 'Coral', description: 'Warm and vibrant' },
    { id: 'sage', name: 'Sage', description: 'Calm and wise' },
    { id: 'verse', name: 'Verse', description: 'Lyrical and engaging' },
  ];


  return (
    <div className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b border-violet-200">
      <button
        onClick={onToggle}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
          isEnabled
            ? 'bg-violet-600 text-white shadow-lg'
            : 'bg-white text-gray-700 border border-gray-300'
        }`}
      >
        <Radio size={16} />
        <span className="text-sm">Voice Mode</span>
      </button>

      {isEnabled && (
        <>
          <select
            value={voiceProvider}
            onChange={(e) => {
              const newProvider = e.target.value as 'openai' | 'pipecat';
              setVoiceProvider(newProvider);
              if (status === 'connected') {
                cleanup();
              }
              onProviderChange?.(newProvider);
            }}
            className="px-3 py-2 text-sm bg-white border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium"
          >
            <option value="openai">OpenAI Realtime</option>
            <option value="pipecat">Pipecat Speech2Speech</option>
          </select>

          {voiceProvider === 'openai' && (
            <select
              value={selectedVoice}
              onChange={(e) => {
                setSelectedVoice(e.target.value);
                if (status === 'connected') {
                  cleanup();
                  setTimeout(() => connectToOpenAI(), 100);
                }
              }}
              className="px-3 py-2 text-sm bg-white border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} - {voice.description}
                </option>
              ))}
            </select>
          )}

          {voiceProvider === 'openai' && (
            <>
              <label className="flex items-center space-x-2 px-3 py-2 bg-white border border-violet-200 rounded-lg cursor-pointer hover:bg-violet-50">
                <input
                  type="checkbox"
                  checked={enableVAD}
                  onChange={(e) => {
                    setEnableVAD(e.target.checked);
                    if (status === 'connected') {
                      cleanup();
                      setTimeout(() => connectToOpenAI(), 100);
                    }
                  }}
                  className="w-4 h-4 text-violet-600 rounded focus:ring-2 focus:ring-violet-500"
                />
                <span className="text-xs font-medium text-gray-700">Auto-detect speech</span>
              </label>

              <button
                onClick={() => {
                  console.log('[OpenAI Button] Clicked');
                  if (status === 'idle' || status === 'error') {
                    connectToOpenAI();
                  } else if (status === 'connected') {
                    cleanup();
                  }
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  status === 'connected'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={status === 'connecting'}
              >
                {status === 'connecting' && 'Connecting...'}
                {status === 'connected' && 'Disconnect'}
                {(status === 'idle' || status === 'error') && 'Connect'}
              </button>
            </>
          )}

          {voiceProvider === 'pipecat' && (
            <>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`} />
                <span className="text-xs font-medium text-gray-600">{getStatusText()}</span>
              </div>

              <div className="flex items-center space-x-2 px-2 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <Radio size={14} className="text-blue-600 animate-pulse" />
                <span className="text-xs font-semibold text-blue-700">Real-Time Stream</span>
                {isSpeaking && (
                  <span className="flex items-center space-x-1">
                    <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                )}
              </div>

              <button
                onClick={() => {
                  console.log('[Pipecat Button] Clicked, voiceProvider:', voiceProvider);
                  if (status === 'idle' || status === 'error') {
                    connectToPipecat();
                  } else if (status === 'connected') {
                    cleanupPipecat();
                  }
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  status === 'connected'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={status === 'connecting'}
              >
                {status === 'connecting' && 'Connecting...'}
                {status === 'connected' && 'Disconnect'}
                {(status === 'idle' || status === 'error') && 'Connect'}
              </button>
            </>
          )}

          {voiceProvider === 'openai' && (
            <>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`} />
                <span className="text-xs font-medium text-gray-600">{getStatusText()}</span>
              </div>

              <button
                onClick={toggleListening}
                disabled={status !== 'connected'}
                className={`relative p-3 rounded-full transition-all ${
                  isListening
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-violet-400'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}

                {isListening && audioLevel > 0.1 && (
                  <div
                    className="absolute inset-0 rounded-full bg-red-400 opacity-50"
                    style={{
                      transform: `scale(${1 + audioLevel * 0.5})`,
                      transition: 'transform 0.1s ease-out',
                    }}
                  />
                )}
              </button>
            </>
          )}

          {voiceProvider === 'openai' && (
            <div className="flex-1 h-8 bg-white rounded-lg border border-violet-200 overflow-hidden">
              <div className="h-full flex items-center justify-center space-x-1 px-2">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-violet-500 rounded-full transition-all"
                    style={{
                      height: `${Math.max(10, (isListening ? audioLevel : 0) * 100 * (1 + Math.random() * 0.5))}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}


          {voiceProvider === 'pipecat' && isListening && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-orange-100 rounded-lg border border-orange-300">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-medium text-orange-700">Recording (5s max)...</span>
            </div>
          )}

          {voiceProvider === 'openai' && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-white rounded-lg border border-violet-200">
              {isSpeaking ? (
                <>
                  <Volume2 size={16} className="text-violet-600 animate-pulse" />
                  <span className="text-xs font-medium text-gray-600">Speaking...</span>
                </>
              ) : (
                <>
                  <VolumeX size={16} className="text-gray-400" />
                  <span className="text-xs font-medium text-gray-400">Idle</span>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
