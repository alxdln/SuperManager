import React from 'react';
import { Database, RotateCcw, X, Award, CheckCircle2, Trophy, Clock, Shield } from 'lucide-react';
import { Player } from '../../types/football';

export interface DemoCompletedMatchData {
  homeScore: number;
  awayScore: number;
  resultPts: number;
  resultLabel: string;
  isCleanSheet: boolean;
  playerBonuses: Record<
    string,
    {
      totalBonus: number;
      starterBonus: number;
      minutesBonus: number;
      cleanSheetBonus: number;
      resultPts: number;
      finalPoints: number;
    }
  >;
  timestamp: number;
}

interface DemoMatchSaveModalProps {
  isOpen: boolean;
  data: DemoCompletedMatchData | null;
  teamName: string;
  starterPlayers: Player[];
  onConfirmSave: () => void;
  onCancel: () => void;
}

export const DemoMatchSaveModal: React.FC<DemoMatchSaveModalProps> = ({
  isOpen,
  data,
  teamName,
  starterPlayers,
  onConfirmSave,
  onCancel,
}) => {
  if (!isOpen || !data) return null;

  const isWin = data.homeScore > data.awayScore;
  const isDraw = data.homeScore === data.awayScore;

  // Calcul puncte totale adunate de titulari în acest meci demo
  const totalSquadPoints = starterPlayers.reduce((acc, p) => {
    const bonusInfo = data.playerBonuses[p.id];
    return acc + (bonusInfo ? bonusInfo.finalPoints : p.pointsMatchday);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header gradient banner */}
        <div className="p-5 bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                Meci Demo Finalizat (90&apos;)
              </span>
              <h2 className="text-base font-black text-white">Salvare Puncte în Baza de Date?</h2>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Închide fără salvare"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Match Score Strip */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-4 text-center">
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black uppercase text-emerald-400 truncate block">
                {teamName}
              </span>
              <span className="text-[10px] text-slate-400">Echipa Ta</span>
            </div>

            <div className="flex flex-col items-center shrink-0">
              <div className="font-mono text-3xl font-black text-white tracking-tight">
                {data.homeScore} - {data.awayScore}
              </div>
              <span
                className={`text-[10px] font-black uppercase tracking-wider mt-0.5 px-2 py-0.5 rounded-full ${
                  isWin
                    ? 'text-emerald-300 bg-emerald-950/60 border border-emerald-800'
                    : isDraw
                    ? 'text-amber-300 bg-amber-950/60 border border-amber-800'
                    : 'text-rose-300 bg-rose-950/60 border border-rose-800'
                }`}
              >
                {data.resultLabel} ({data.resultPts > 0 ? `+${data.resultPts}p` : `${data.resultPts}p`})
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-xs font-black uppercase text-slate-300 truncate block">
                Oponenți Superliga
              </span>
              <span className="text-[10px] text-slate-400">Rivali Etapă</span>
            </div>
          </div>

          {/* Contextual Bonuses Summary */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2 text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Puncte Contextuale Calculate la Fluierul Final
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Titular în meci:</span>
                <span className="font-mono font-bold text-emerald-400">+5 pts</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Minute jucate (90&apos;):</span>
                <span className="font-mono font-bold text-emerald-400">+2 pts</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Rezultat echipă:</span>
                <span
                  className={`font-mono font-bold ${
                    data.resultPts > 0 ? 'text-emerald-400' : data.resultPts === 0 ? 'text-slate-400' : 'text-rose-400'
                  }`}
                >
                  {data.resultPts > 0 ? `+${data.resultPts}` : data.resultPts} pts
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Clean Sheet (Fundași/Portari):</span>
                <span className="font-mono font-bold text-emerald-400">
                  {data.isCleanSheet ? '+30p POR / +15p FUN' : '0 pts'}
                </span>
              </div>
            </div>
          </div>

          {/* Total Squad Points & Question */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-slate-900 border border-emerald-500/30 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                Total Punctaj Titulari în Meci
              </span>
              <span className="text-xs text-slate-300">
                Punctele din acțiuni Kickbase + bonusurile finale
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono text-2xl font-black text-emerald-400">
                {totalSquadPoints > 0 ? `+${totalSquadPoints}` : totalSquadPoints}
              </span>
              <span className="text-[10px] text-slate-400 block font-bold">puncte totale</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed text-center px-2">
            Dorești să salvezi aceste date în baza de date Firestore (actualizând profilul fotbaliștilor și istoricul etapei) sau preferi să anulezi pentru a relua un nou test?
          </p>
        </div>

        {/* Action footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5 flex-wrap">
          <button
            onClick={onCancel}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 inline-flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>Anulează / Resetare Test</span>
          </button>
          <button
            onClick={onConfirmSave}
            className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase tracking-wider text-xs shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2 active:scale-95 transition-all"
          >
            <Database className="w-4 h-4" />
            <span>Salvează în Baza de Date (Firestore)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
