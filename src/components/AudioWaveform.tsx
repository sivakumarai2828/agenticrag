import { useEffect, useRef, useState } from 'react';

interface AudioWaveformProps {
  status: 'idle' | 'listening' | 'thinking' | 'speaking';
  audioElement?: HTMLAudioElement | null;
  audioStream?: MediaStream | null;
}

export default function AudioWaveform({ status, audioElement, audioStream }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [bars] = useState(32);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    return () => window.removeEventListener('resize', setCanvasSize);
  }, []);

  useEffect(() => {
    if (!audioElement && !audioStream) {
      analyzerRef.current = null;
      dataArrayRef.current = null;
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      return;
    }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 128;
      analyzerRef.current = analyzer;

      const bufferLength = analyzer.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      if (audioElement) {
        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyzer);
        analyzer.connect(audioContext.destination);
      } else if (audioStream) {
        const source = audioContext.createMediaStreamSource(audioStream);
        source.connect(analyzer);
      }
    } catch (error) {
      console.error('Error setting up audio analysis:', error);
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioElement, audioStream]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    let phase = 0;

    const drawWaveform = () => {
      ctx.clearRect(0, 0, width, height);

      const barWidth = width / bars;
      const maxBarHeight = height * 0.7;
      const centerY = height / 2;

      if (status === 'idle') {
        drawIdleState(ctx, barWidth, centerY, maxBarHeight, phase);
      } else if (status === 'thinking') {
        drawThinkingState(ctx, barWidth, centerY, maxBarHeight, phase);
      } else if ((status === 'listening' || status === 'speaking') && analyzerRef.current && dataArrayRef.current) {
        drawActiveState(ctx, barWidth, centerY, maxBarHeight);
      } else {
        drawIdleState(ctx, barWidth, centerY, maxBarHeight, phase);
      }

      phase += 0.05;
      animationRef.current = requestAnimationFrame(drawWaveform);
    };

    drawWaveform();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [status, bars]);

  const drawIdleState = (
    ctx: CanvasRenderingContext2D,
    barWidth: number,
    centerY: number,
    maxBarHeight: number,
    phase: number
  ) => {
    for (let i = 0; i < bars; i++) {
      const x = i * barWidth;
      const normalizedHeight = Math.sin(i * 0.3 + phase) * 0.2 + 0.1;
      const barHeight = normalizedHeight * maxBarHeight;

      const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
      gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
      gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.5)');
      gradient.addColorStop(1, 'rgba(139, 92, 246, 0.3)');

      ctx.fillStyle = gradient;
      ctx.fillRect(x + barWidth * 0.2, centerY - barHeight / 2, barWidth * 0.6, barHeight);
    }
  };

  const drawThinkingState = (
    ctx: CanvasRenderingContext2D,
    barWidth: number,
    centerY: number,
    maxBarHeight: number,
    phase: number
  ) => {
    for (let i = 0; i < bars; i++) {
      const x = i * barWidth;
      const normalizedHeight = Math.sin(i * 0.5 + phase * 2) * 0.4 + 0.3;
      const barHeight = normalizedHeight * maxBarHeight;

      const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
      gradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
      gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.7)');
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0.4)');

      ctx.fillStyle = gradient;
      ctx.fillRect(x + barWidth * 0.2, centerY - barHeight / 2, barWidth * 0.6, barHeight);
    }
  };

  const drawActiveState = (
    ctx: CanvasRenderingContext2D,
    barWidth: number,
    centerY: number,
    maxBarHeight: number
  ) => {
    if (!analyzerRef.current || !dataArrayRef.current) return;

    analyzerRef.current.getByteFrequencyData(dataArrayRef.current);

    const color = status === 'listening' ? '34, 197, 94' : '59, 130, 246';

    for (let i = 0; i < bars; i++) {
      const dataIndex = Math.floor((i / bars) * dataArrayRef.current.length);
      const value = dataArrayRef.current[dataIndex] / 255;
      const normalizedHeight = Math.max(value, 0.1);
      const barHeight = normalizedHeight * maxBarHeight;

      const x = i * barWidth;

      const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
      gradient.addColorStop(0, `rgba(${color}, 0.3)`);
      gradient.addColorStop(0.5, `rgba(${color}, 0.8)`);
      gradient.addColorStop(1, `rgba(${color}, 0.3)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(x + barWidth * 0.2, centerY - barHeight / 2, barWidth * 0.6, barHeight);
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'listening':
        return { color: 'text-green-500', icon: '🎤', text: 'Listening...' };
      case 'thinking':
        return { color: 'text-purple-500', icon: '🤔', text: 'Thinking...' };
      case 'speaking':
        return { color: 'text-blue-500', icon: '🔊', text: 'Speaking...' };
      default:
        return { color: 'text-gray-400', icon: '💤', text: 'Idle' };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">{statusConfig.icon}</div>
          <h3 className={`text-2xl font-bold ${statusConfig.color} transition-colors duration-300`}>
            {statusConfig.text}
          </h3>
        </div>

        <div className="relative w-full h-48 bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ display: 'block' }}
          />
        </div>

        <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
          <div className={`w-2 h-2 rounded-full ${
            status === 'idle' ? 'bg-gray-500' :
            status === 'listening' ? 'bg-green-500 animate-pulse' :
            status === 'thinking' ? 'bg-purple-500 animate-pulse' :
            'bg-blue-500 animate-pulse'
          }`} />
          <span>Voice Agent Active</span>
        </div>
      </div>
    </div>
  );
}
