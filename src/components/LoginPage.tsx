import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, LogIn } from 'lucide-react';

const LoginPage: React.FC = () => {
    const { signInWithGoogle, loading } = useAuth();

    const handleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error('Login failed:', error);
            alert('Failed to sign in with Google. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/40 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-[120px] animate-pulse" />

            <div className="max-w-md w-full glass-card rounded-[3rem] p-1 border-white/50 relative z-10">
                <div className="bg-white/80 backdrop-blur-xl rounded-[2.8rem] p-12 text-center">
                    <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-200 mx-auto mb-8">
                        <Sparkles className="w-10 h-10" />
                    </div>

                    <h1 className="text-4xl font-black mb-4 tracking-tighter bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 bg-clip-text text-transparent">
                        Agentic RAG
                    </h1>
                    <p className="text-slate-500 font-medium mb-12">
                        Secure, voice-enabled enterprise intelligence. Sign in to access your personal dashboard.
                    </p>

                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center space-x-3 px-8 py-5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-[0.98] group"
                    >
                        <div className="w-6 h-6 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-5 h-5">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                        </div>
                        <span>Sign in with Google</span>
                    </button>

                    <p className="mt-12 text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center space-x-2">
                        <LogIn className="w-3 h-3" />
                        <span>Secure Enterprise Login</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
