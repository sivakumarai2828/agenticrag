import React, { useMemo } from 'react';

interface NexaOrbProps {
    state: 'idle' | 'listening' | 'thinking' | 'speaking';
    audioLevel?: number; // 0 to 1
    scale?: number;
}

const NexaOrb: React.FC<NexaOrbProps> = ({ state, audioLevel = 0, scale: manualScale }) => {
    const scale = useMemo(() => {
        if (manualScale) return manualScale;
        if (state === 'listening') return 1 + audioLevel * 0.4;
        if (state === 'thinking') return 1 + Math.sin(Date.now() / 300) * 0.05;
        if (state === 'speaking') return 1 + Math.sin(Date.now() / 200) * 0.08;
        return 1;
    }, [state, audioLevel, manualScale]);

    const colors = useMemo(() => {
        switch (state) {
            case 'listening': return { from: '#8B5CF6', to: '#C4B5FD', glow: 'rgba(139, 92, 246, 0.4)' };
            case 'thinking': return { from: '#A78BFA', to: '#DDD6FE', glow: 'rgba(167, 139, 250, 0.3)' };
            case 'speaking': return { from: '#7C3AED', to: '#A78BFA', glow: 'rgba(124, 58, 237, 0.4)' };
            default: return { from: '#F1F5F9', to: '#E2E8F0', glow: 'rgba(139, 92, 246, 0.1)' };
        }
    }, [state]);

    return (
        <div className="relative flex items-center justify-center w-64 h-64 scale-110">
            {/* Concentric Gravity Rings - v7 Velyx Edition */}
            {[1.4, 1.9, 2.4].map((s, i) => (
                <div
                    key={i}
                    className={`absolute rounded-full border border-purple-500/10 transition-all duration-1000 ${state !== 'idle' ? 'animate-velyx-orb' : 'opacity-0'
                        }`}
                    style={{
                        width: `${s * 40}px`,
                        height: `${s * 40}px`,
                        animationDelay: `${i * 0.4}s`
                    }}
                />
            ))}

            {/* Core Orb Container */}
            <div className="relative w-32 h-32 flex items-center justify-center">
                {/* Outer Glow Aura */}
                <div
                    className="absolute inset-[-50%] rounded-full blur-[60px] transition-all duration-1000 opacity-30 animate-pulse-soft"
                    style={{ background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)` }}
                />

                {/* The Sphera Shell */}
                <div
                    className="relative w-full h-full rounded-full bg-white/60 backdrop-blur-3xl border border-white shadow-[0_20px_40px_rgba(139, 92, 246, 0.15)] overflow-hidden transition-all duration-700 flex items-center justify-center"
                    style={{ transform: `scale(${scale})` }}
                >
                    {/* Liquid Core Gradient */}
                    <div
                        className="absolute inset-0 transition-colors duration-1000 opacity-90"
                        style={{ background: `radial-gradient(circle at 30% 30%, ${colors.to} 0%, ${colors.from} 70%)` }}
                    />

                    {/* Surface Glass Effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />

                    {/* Interaction States */}
                    <div className="relative z-10 flex items-center justify-center">
                        {state === 'listening' && (
                            <div className="flex space-x-1.5 items-center">
                                {[0, 1, 2].map((i) => (
                                    <div
                                        key={i}
                                        className="w-1.5 bg-white/90 rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                        style={{ height: `${20 + audioLevel * 70 * (i === 1 ? 1 : 0.6)}px` }}
                                    />
                                ))}
                            </div>
                        )}

                        {state === 'thinking' && (
                            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin shadow-lg" />
                        )}

                        {state === 'speaking' && (
                            <div className="relative">
                                <div className="absolute inset-[-10px] border-2 border-white/40 rounded-full animate-ping" />
                                <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse-soft" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Floating Highlight */}
                <div className="absolute top-6 left-6 w-3 h-3 bg-white/40 rounded-full blur-[2px] z-20" />
            </div>
        </div>
    );
};

export default NexaOrb;
