import React from 'react';
import { Player, PlayerPosition } from '../../types/football';
import { useFantasy } from '../../context/FantasyContext';
import { getPositionBadge, formatCurrency } from '../../utils/scoringEngine';
import { X, UserMinus, ShieldAlert, Check, AlertTriangle } from 'lucide-react';
import { SUPERLIGA_CLUBS } from '../../data/superligaData';

interface PlayerSelectionDrawerProps {
  slotId: string;
  slotLabel: string;
  requiredPosition: PlayerPosition;
  currentSlotPlayerId: string | null;
  onClose: () => void;
  onSelectPlayer: (playerId: string) => void;
  onRemovePlayer: () => void;
}

// Convertire strictă în doar 4 poziții fundamentale: P, D, M, A (fără MDC, MC, AS etc.)
const shortPosMap: Record<PlayerPosition, 'P' | 'D' | 'M' | 'A'> = {
  GK: 'P',
  DEF: 'D',
  MID: 'M',
  FWD: 'A',
};

const fullPosLabel: Record<PlayerPosition, string> = {
  GK: 'Portar (P)',
  DEF: 'Fundaș (D)',
  MID: 'Mijlocaș (M)',
  FWD: 'Atacant (A)',
};

export const PlayerSelectionDrawer: React.FC<PlayerSelectionDrawerProps> = ({
  requiredPosition,
  currentSlotPlayerId,
  onClose,
  onSelectPlayer,
  onRemovePlayer,
}) => {
  const { players, squad } = useFantasy();

  const posLetter = shortPosMap[requiredPosition];

  // Find all players in user's squad (starting XI + bench)
  const starters = Object.values(squad.startingSlots).filter(Boolean) as string[];
  const myPlayerIds = Array.from(new Set([...starters, ...squad.benchPlayerIds]));
  const myPlayers = players.filter((p) => myPlayerIds.includes(p.id));

  // REGULĂ DE SORTARE SWAP TITULAR:
  // 1. Jucătorii de pe bancă au prioritate maximă
  // 2. Număr mediu puncte per meci
  // 3. Număr puncte total
  const matchingPlayers = myPlayers
    .filter((p) => p.position === requiredPosition)
    .sort((a, b) => {
      const aIsBench = squad.benchPlayerIds.includes(a.id) ? 1 : 0;
      const bIsBench = squad.benchPlayerIds.includes(b.id) ? 1 : 0;
      if (aIsBench !== bIsBench) {
        return bIsBench - aIsBench; // Cei de pe bancă apar primii
      }

      const aMatches = Math.max(a.stats?.matches || 1, 1);
      const bMatches = Math.max(b.stats?.matches || 1, 1);
      const aAvg = a.pointsTotal / aMatches;
      const bAvg = b.pointsTotal / bMatches;

      if (Math.abs(bAvg - aAvg) > 0.05) {
        return bAvg - aAvg; // Număr mediu puncte mai mare
      }

      return b.pointsTotal - a.pointsTotal; // Număr puncte total mai mare
    });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[85vh] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Drag handle on mobile */}
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Alege Titular: <span className="text-emerald-400 font-mono text-lg font-black bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-lg">{posLetter}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Poziție obligatorie: <span className="font-bold text-emerald-400">{fullPosLabel[requiredPosition]}</span>
              <span className="text-slate-500 ml-1.5">(Prioritizare: Rezerve bancă → Medie puncte → Total)</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {currentSlotPlayerId && (
            <button
              onClick={() => {
                onRemovePlayer();
                onClose();
              }}
              className="w-full p-2.5 rounded-xl border border-dashed border-rose-800/80 bg-rose-950/20 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-rose-950/40 transition-colors"
            >
              <UserMinus className="w-4 h-4" /> Lasă postul liber (Atenție: -100p dacă rămâne neocupat)
            </button>
          )}

          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pt-1 flex items-center justify-between">
            <span>Jucători eligibili în lot (Post: {posLetter})</span>
            <span className="text-slate-500 text-[10px]">{matchingPlayers.length} disponibili</span>
          </div>

          {matchingPlayers.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-800/30 border border-dashed border-slate-700 text-center space-y-2">
              <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
              <p className="text-xs text-slate-300 font-semibold">
                Nu ai niciun jucător pe poziția de {posLetter} în lot!
              </p>
              <p className="text-[11px] text-slate-400">
                Fiecare post neocupat la startul etapei atrage o penalizare de <b>-100 puncte</b>. Accesează piața de transferuri pentru a cumpăra un jucător de poziție {posLetter}.
              </p>
            </div>
          ) : (
            matchingPlayers.map((player) => {
              const isCurrent = player.id === currentSlotPlayerId;
              const isBench = squad.benchPlayerIds.includes(player.id);
              const isAlreadyStarter = starters.includes(player.id) && !isCurrent;
              const club = SUPERLIGA_CLUBS.find((c) => c.id === player.clubId);
              const badge = getPositionBadge(player.position);
              const matchesCount = Math.max(player.stats?.matches || 1, 1);
              const avgPoints = (player.pointsTotal / matchesCount).toFixed(1);

              return (
                <div
                  key={player.id}
                  onClick={() => {
                    onSelectPlayer(player.id);
                    onClose();
                  }}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md'
                      : isBench
                      ? 'bg-slate-800/90 border-indigo-500/40 hover:border-emerald-500/60 hover:bg-slate-800'
                      : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className="w-11 h-11 rounded-2xl object-cover shrink-0 border border-slate-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=05df72&bold=true`;
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border font-mono ${badge.bg} ${badge.text}`}>
                          {posLetter}
                        </span>
                        <span className="text-xs font-bold text-white truncate">{player.name}</span>
                        {isBench && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                            Bancă
                          </span>
                        )}
                        {player.status === 'injured' && <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                        {player.status === 'suspended' && <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{club?.shortName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-emerald-400 font-medium">{formatCurrency(player.marketValue)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-amber-300 font-semibold">Medie {avgPoints}p</span>
                        {isAlreadyStarter && (
                          <span className="text-amber-400 text-[10px] font-bold">(Mută titular)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-amber-400 block">+{player.pointsMatchday}p etapă</span>
                      <span className="text-[10px] text-slate-400 block font-mono">Total {player.pointsTotal} pts</span>
                    </div>
                    {isCurrent && (
                      <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
