import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';

interface VoiceOrbProps {
  status: 'idle' | 'listening' | 'thinking' | 'speaking';
  audioElement?: HTMLAudioElement | null;
  audioStream?: MediaStream | null;
  transcript?: string;
}

export default function VoiceOrb({ status, audioElement, audioStream, transcript }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const particleCount = 1200;
  const particles = useRef<Array<{
    angle: number;
    radius: number;
    speed: number;
    size: number;
    opacity: number;
  }>>([]);

  useEffect(() => {
    for (let i = 0; i < particleCount; i++) {
      particles.current.push({
        angle: Math.random() * Math.PI * 2,
        radius: 0,
        speed: 0.5 + Math.random() * 1,
        size: 1.5 + Math.random() * 2.5,
        opacity: 0.5 + Math.random() * 0.5,
      });
    }
  }, []);

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
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.8;
      analyzerRef.current = analyzer;

      const bufferLength = analyzer.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      if (audioElement && audioElement.srcObject) {
        try {
          const source = audioContext.createMediaElementSource(audioElement);
          source.connect(analyzer);
          analyzer.connect(audioContext.destination);
        } catch (e) {
          console.log('Audio element already connected');
        }
      } else if (audioStream) {
        const source = audioContext.createMediaStreamSource(audioStream);
        source.connect(analyzer);
      }
    } catch (error) {
      console.error('Error setting up audio analysis:', error);
    }

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
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
    const centerX = width / 2;
    const centerY = height / 2;

    let time = 0;
    let baseRadius = Math.min(width, height) * 0.25;

    const drawOrb = () => {
      ctx.clearRect(0, 0, width, height);

      let audioLevel = 0;
      let frequencyData: number[] = [];

      if (
        (status === 'listening' || status === 'speaking') &&
        analyzerRef.current &&
        dataArrayRef.current
      ) {
        analyzerRef.current.getByteFrequencyData(dataArrayRef.current);
        const sum = dataArrayRef.current.reduce((a, b) => a + b, 0);
        audioLevel = sum / dataArrayRef.current.length / 255;
        frequencyData = Array.from(dataArrayRef.current).map(v => v / 255);
      }

      const pulseAmount = status === 'idle' ? 0.02 : status === 'thinking' ? 0.05 : audioLevel * 0.3;
      const currentRadius = baseRadius * (1 + pulseAmount);

      const orbGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, currentRadius);

      if (status === 'listening') {
        orbGradient.addColorStop(0, 'rgba(34, 197, 94, 0.4)');
        orbGradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.15)');
        orbGradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
      } else if (status === 'speaking') {
        orbGradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
        orbGradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.15)');
        orbGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      } else if (status === 'thinking') {
        orbGradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
        orbGradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.15)');
        orbGradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
      } else {
        orbGradient.addColorStop(0, 'rgba(139, 92, 246, 0.25)');
        orbGradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.08)');
        orbGradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
      }

      ctx.fillStyle = orbGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = status === 'listening'
        ? 'rgba(34, 197, 94, 0.8)'
        : status === 'speaking'
        ? 'rgba(59, 130, 246, 0.8)'
        : status === 'thinking'
        ? 'rgba(168, 85, 247, 0.8)'
        : 'rgba(139, 92, 246, 0.5)';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      const glowGradient = ctx.createRadialGradient(centerX, centerY, currentRadius * 0.7, centerX, centerY, currentRadius * 1.3);
      glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');

      if (status === 'listening') {
        glowGradient.addColorStop(1, 'rgba(34, 197, 94, 0.4)');
      } else if (status === 'speaking') {
        glowGradient.addColorStop(1, 'rgba(59, 130, 246, 0.4)');
      } else if (status === 'thinking') {
        glowGradient.addColorStop(1, 'rgba(168, 85, 247, 0.4)');
      } else {
        glowGradient.addColorStop(1, 'rgba(139, 92, 246, 0.2)');
      }

      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius * 1.3, 0, Math.PI * 2);
      ctx.fill();

      particles.current.forEach((particle, i) => {
        const freqIndex = Math.floor((i / particleCount) * frequencyData.length);
        const freqValue = frequencyData[freqIndex] || 0;

        let targetRadius = currentRadius;
        if (status === 'listening' || status === 'speaking') {
          targetRadius = currentRadius * (1 + freqValue * 0.5);
        } else if (status === 'thinking') {
          targetRadius = currentRadius * (1 + Math.sin(time * 2 + particle.angle * 2) * 0.15);
        } else {
          targetRadius = currentRadius * (1 + Math.sin(time + particle.angle) * 0.05);
        }

        particle.radius += (targetRadius - particle.radius) * 0.1;

        if (status === 'listening' || status === 'speaking') {
          particle.angle += particle.speed * 0.003 * (1 + audioLevel);
        } else {
          particle.angle += particle.speed * 0.002;
        }

        const x = centerX + Math.cos(particle.angle) * particle.radius;
        const y = centerY + Math.sin(particle.angle) * particle.radius;

        const distance = Math.abs(particle.radius - currentRadius) / currentRadius;
        const alpha = particle.opacity * Math.max(0.3, 1 - distance * 1.5);

        if (status === 'listening') {
          ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
        } else if (status === 'speaking') {
          ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
        } else if (status === 'thinking') {
          ctx.fillStyle = `rgba(168, 85, 247, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(139, 92, 246, ${alpha * 0.7})`;
        }

        ctx.shadowBlur = 8;
        ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath();
        ctx.arc(x, y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      time += 0.02;
      animationRef.current = requestAnimationFrame(drawOrb);
    };

    drawOrb();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [status]);

  return (
    <div className="relative flex flex-col items-center justify-center h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="relative w-full h-full flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />

        {transcript && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-32 max-w-xl w-full px-6 z-10 animate-in fade-in duration-300">
            <div className="bg-slate-900/95 backdrop-blur-md border border-cyan-400/40 rounded-2xl px-6 py-4 text-center shadow-2xl">
              <p className="text-white text-xl font-light leading-relaxed">{transcript}</p>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-4">
        <div className={`text-xl font-light tracking-wide transition-colors duration-300 ${
          status === 'listening' ? 'text-green-400' :
          status === 'speaking' ? 'text-blue-400' :
          status === 'thinking' ? 'text-purple-400' :
          'text-gray-500'
        }`}>
          {status === 'listening' && 'Listening...'}
          {status === 'speaking' && 'Speaking...'}
          {status === 'thinking' && 'Thinking...'}
          {status === 'idle' && 'Ready'}
        </div>

        <div className={`p-3 rounded-full transition-all duration-300 ${
          status === 'listening' ? 'bg-green-500/20 animate-pulse' :
          status === 'speaking' ? 'bg-blue-500/20 animate-pulse' :
          status === 'thinking' ? 'bg-purple-500/20 animate-pulse' :
          'bg-gray-700/20'
        }`}>
          <Mic className={`w-5 h-5 ${
            status === 'listening' ? 'text-green-400' :
            status === 'speaking' ? 'text-blue-400' :
            status === 'thinking' ? 'text-purple-400' :
            'text-gray-500'
          }`} />
        </div>
      </div>
    </div>
  );
}
