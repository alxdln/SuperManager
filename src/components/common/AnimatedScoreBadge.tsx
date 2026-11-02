import React, { useEffect, useRef, useState } from 'react';

/**
 * Returnează clasa CSS Tailwind corespunzătoare pragurilor de puncte SuperManager:
 * - sub 25p: portocaliu închis (text-orange-600)
 * - sub 50p: galben (text-yellow-400)
 * - sub 100p: verde normal (text-green-500)
 * - peste 100p: verde mai deschis, spre neon (text-[#39ff14] cu glow)
 */
export function getPointsTierColor(points: number): string {
  if (points < 25) {
    return 'text-orange-600 font-extrabold';
  } else if (points < 50) {
    return 'text-yellow-400 font-extrabold';
  } else if (points < 100) {
    return 'text-green-500 font-extrabold';
  } else {
    return 'text-[#39ff14] drop-shadow-[0_0_8px_rgba(57,255,20,0.65)] font-black';
  }
}

interface AnimatedScoreBadgeProps {
  score: number;
  prefixPlus?: boolean;
  suffix?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AnimatedScoreBadge: React.FC<AnimatedScoreBadgeProps> = ({
  score,
  prefixPlus = true,
  suffix = 'pts',
  size = 'md',
  className = '',
}) => {
  const prevScoreRef = useRef<number>(score);
  const [animDirection, setAnimDirection] = useState<'up' | 'down' | null>(null);
  const [delta, setDelta] = useState<number>(0);

  useEffect(() => {
    const prev = prevScoreRef.current;
    if (score !== prev) {
      const diff = score - prev;
      setDelta(diff);
      setAnimDirection(diff > 0 ? 'up' : 'down');
      prevScoreRef.current = score;

      const timer = setTimeout(() => {
        setAnimDirection(null);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [score]);

  const tierColor = getPointsTierColor(score);
  const isAnimating = animDirection !== null;
  const animColor = animDirection === 'up' ? 'text-emerald-400' : 'text-rose-500';

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm font-bold',
    md: 'text-base font-black',
    lg: 'text-xl font-black',
    xl: 'text-2xl font-black',
  }[size];

  const formattedValue = score > 0 && prefixPlus ? `+${score}` : `${score}`;

  return (
    <div className={`relative inline-flex items-baseline justify-end gap-1 select-none ${className}`}>
      {/* Indicator plutitor cu delta puncte pe durata animației de 1 secundă */}
      {isAnimating && (
        <span
          className={`absolute -top-3.5 right-0 text-[10px] font-mono font-black pointer-events-none transition-all duration-300 animate-bounce ${
            animDirection === 'up' ? 'text-emerald-400' : 'text-rose-500'
          }`}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}

      {/* Cifra de scor cu mărire și ridicare (scale-125 & -translate-y-1.5) timp de 1 secundă */}
      <span
        className={`font-mono transition-all duration-500 ease-out transform inline-block will-change-transform ${sizeClasses} ${
          isAnimating
            ? `scale-125 -translate-y-1.5 ${animColor} drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]`
            : `scale-100 translate-y-0 ${tierColor}`
        }`}
      >
        {formattedValue}
      </span>

      {suffix && (
        <span className="text-[10px] font-bold text-slate-400 font-sans tracking-tight">
          {suffix}
        </span>
      )}
    </div>
  );
};
