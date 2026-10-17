import React, { useEffect, useState } from 'react';
import { Shield, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, duration = 2000 }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Start fading out slightly before completion
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, Math.max(duration - 400, 1600));

    const finishTimer = setTimeout(() => {
      onFinish();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [duration, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0d14] text-white transition-opacity duration-500 selection:bg-emerald-500 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/40 via-[#0a0d14]/90 to-[#06080d] pointer-events-none" />

      {/* Decorative pulse rings */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute w-44 h-44 rounded-full bg-emerald-500/10 animate-ping duration-1000" />
        <div className="absolute w-36 h-36 rounded-full bg-emerald-500/15 animate-pulse" />

        {/* Central Logo Shield */}
        <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 p-0.5 shadow-2xl shadow-emerald-500/30 transform hover:scale-105 transition-transform">
          <div className="w-full h-full bg-slate-950/80 rounded-[22px] backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden border border-emerald-400/40">
            {/* Gloss shine effect */}
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-white/20 rotate-45 blur-md" />
            <Shield className="w-14 h-14 text-emerald-400 stroke-[2.2] drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
            <span className="absolute bottom-1.5 font-black text-[9px] tracking-widest text-emerald-300 font-mono">
              RO
            </span>
          </div>
        </div>
      </div>

      {/* Game Title & Brand */}
      <div className="relative text-center space-y-2 z-10 px-4">
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <span>SuperManager</span>
          <span className="text-emerald-400">Liga 1</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-medium tracking-wide">
          Fantasy Football Oficial • Master Database 2026/2027
        </p>

        {/* Progress bar */}
        <div className="w-48 h-1 bg-slate-800 rounded-full mx-auto mt-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all ease-linear"
            style={{
              width: '100%',
              transitionDuration: `${duration}ms`,
            }}
          />
        </div>

        <div className="flex items-center justify-center gap-1.5 pt-3 text-[11px] text-slate-500 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          <span>Se inițializează Master Ecosystem...</span>
        </div>
      </div>
    </div>
  );
};
