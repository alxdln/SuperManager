import React, { useState, useMemo } from 'react';
import { Player } from '../../types/football';
import { formatCurrency } from '../../utils/scoringEngine';
import {
  Shield,
  ArrowRight,
  Sparkles,
  Trophy,
  CheckCircle2,
  TrendingUp,
  Activity,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { useFantasy } from '../../context/FantasyContext';
import { getPlayerDisplayAvatar } from '../../utils/playerAvatar';

interface StarterSquadRevealViewProps {
  allocatedSquad: Player[];
  onCompleteSquad: (squad: Player[]) => void;
}

export const StarterSquadRevealView: React.FC<StarterSquadRevealViewProps> = ({
  allocatedSquad,
  onCompleteSquad,
}) => {
  const { user } = useFantasy();
  const [currentIndex, setCurrentIndex] = useState(0);

  const totalPlayers = allocatedSquad.length || 14;
  const currentPlayer = allocatedSquad[currentIndex] || allocatedSquad[0];

  // Calculate cumulative package value
  const totalPackageValue = useMemo(() => {
    return allocatedSquad.reduce((acc, p) => acc + p.marketValue, 0);
  }, [allocatedSquad]);

  const progressPercent = Math.round(((currentIndex + 1) / totalPlayers) * 100);

  const handleNext = () => {
    if (currentIndex < totalPlayers - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Final player reached
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
      });
      onCompleteSquad(allocatedSquad);
    }
  };

  const getPositionLabel = (pos: string) => {
    switch (pos) {
      case 'GK':
        return { text: 'Portar (GK)', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'DEF':
        return { text: 'Fundaș (DEF)', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'MID':
        return { text: 'Mijlocaș (MID)', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      case 'FWD':
        return { text: 'Atacant (FWD)', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
      default:
        return { text: pos, color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
    }
  };

  const posBadge = getPositionLabel(currentPlayer?.position || 'MID');

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto">
      {/* Top Header & Visual Clue Progress Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pachet de Debut (€5.00M)</span>
          </div>
          <span className="font-mono font-bold text-slate-300">
            Jucătorul <span className="text-emerald-400 text-sm">{currentIndex + 1}</span> din {totalPlayers}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Squad mini-slots visual row */}
        <div className="flex items-center justify-between gap-1 pt-1 overflow-x-auto no-scrollbar">
          {allocatedSquad.map((player, idx) => {
            const isCurrent = idx === currentIndex;
            const isRevealed = idx <= currentIndex;
            return (
              <div
                key={player.id || idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-7 flex-1 min-w-[20px] rounded-lg text-[9px] font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400 scale-105 z-10'
                    : isRevealed
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                    : 'bg-slate-900/60 text-slate-600 border border-slate-800/80'
                }`}
                title={`${player.name} (${player.position})`}
              >
                {player.position}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Player Profile Card (Format identic cu profilul normal al unui jucător) */}
      <div className="my-4 bg-gradient-to-b from-[#141822] to-[#0F1219] rounded-3xl border border-slate-800/90 p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between">
        {/* Glow ambient background */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Card Row: Club Badge, Club Name & Position */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/70">
          <div className="flex items-center gap-2.5 min-w-0">
            {currentPlayer.clubBadge ? (
              <img
                src={currentPlayer.clubBadge}
                alt={currentPlayer.clubName}
                className="w-8 h-8 rounded-full bg-slate-900 object-contain p-0.5 border border-slate-700 shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-300">
                {currentPlayer.clubId?.toUpperCase().slice(0, 3)}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Superliga României 2026/27
              </span>
              <h3 className="text-xs font-black text-white truncate">
                {currentPlayer.clubName || 'Club Superliga'}
              </h3>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${posBadge.color} shrink-0`}>
            {posBadge.text}
          </span>
        </div>

        {/* Middle Section: Player Portrait & Name */}
        <div className="py-5 flex flex-col items-center text-center">
          <div className="relative mb-3">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-slate-800 bg-slate-900 shadow-xl ring-2 ring-emerald-500/30">
              <img
                src={getPlayerDisplayAvatar(currentPlayer, user.membership)}
                alt={currentPlayer.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&h=250&q=80';
                }}
              />
            </div>
            {/* Jersey Number */}
            <span className="absolute bottom-0 right-1 w-8 h-8 rounded-full bg-slate-950 border-2 border-emerald-500 text-emerald-400 font-mono font-black text-xs flex items-center justify-center shadow-lg">
              #{currentPlayer.number || 10}
            </span>
          </div>

          {/* First Name & Last Name */}
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {currentPlayer.firstName || currentPlayer.name.split(' ')[0]}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase mt-0.5">
            {currentPlayer.lastName || currentPlayer.name.split(' ').slice(1).join(' ') || currentPlayer.name}
          </h2>

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span>{currentPlayer.nationality || 'România'}</span>
            <span>·</span>
            <span>{currentPlayer.age || 25} ani</span>
            <span>·</span>
            <span className="font-mono font-bold text-emerald-400">
              {formatCurrency(currentPlayer.marketValue)}
            </span>
          </div>
        </div>

        {/* Key Stats Bar */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 text-center">
          <div>
            <span className="text-[9px] font-bold text-slate-500 block uppercase">Meciuri</span>
            <span className="text-sm font-mono font-black text-slate-200">
              {currentPlayer.stats?.matches || 14}
            </span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 block uppercase">
              {currentPlayer.position === 'GK' ? 'Invincibil' : 'Goluri'}
            </span>
            <span className="text-sm font-mono font-black text-emerald-400">
              {currentPlayer.position === 'GK' ? currentPlayer.stats?.cleanSheets || 5 : currentPlayer.stats?.goals || 0}
            </span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 block uppercase">
              {currentPlayer.position === 'GK' ? 'Parade' : 'Pase Gol'}
            </span>
            <span className="text-sm font-mono font-black text-teal-400">
              {currentPlayer.position === 'GK' ? currentPlayer.stats?.penaltySaves || 1 : currentPlayer.stats?.assists || 0}
            </span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 block uppercase">Puncte</span>
            <span className="text-sm font-mono font-black text-amber-400">
              {currentPlayer.pointsTotal || 120}p
            </span>
          </div>
        </div>

        {/* Clarification Box: Starter package + upcoming transfer budget */}
        <div className="mt-3.5 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Lot debut gratuit (~€5M)</span>
          </div>
          <span className="font-mono font-bold text-emerald-400">
            Buget transferuri: €5.00M
          </span>
        </div>
      </div>

      {/* Bottom Sticky Action Area (Thumb Zone Ergonomics) */}
      <div className="pt-2 space-y-2">
        <button
          type="button"
          onClick={handleNext}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 active:scale-[0.98] transition-all"
        >
          {currentIndex < totalPlayers - 1 ? (
            <>
              <span>Următorul Jucător ({currentIndex + 2}/{totalPlayers})</span>
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </>
          ) : (
            <>
              <span>Finalizează Lotul & Mergi la Club</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </>
          )}
        </button>

        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span>Valoare cumulată lot: ~€5.00M</span>
          <span>14 jucători echilibrați pe posturi</span>
        </div>
      </div>
    </div>
  );
};
