import React from 'react';
import { LeagueMember } from '../../types/football';
import { useFantasy } from '../../context/FantasyContext';
import { formatCurrency } from '../../utils/scoringEngine';
import { X, Trophy, TrendingUp, Award, BarChart3, Calendar, Flame } from 'lucide-react';

interface ManagerSeasonStatsModalProps {
  member: LeagueMember | null;
  onClose: () => void;
}

export const ManagerSeasonStatsModal: React.FC<ManagerSeasonStatsModalProps> = ({ member, onClose }) => {
  const { user } = useFantasy();

  if (!member) return null;

  const isMe = member.id === user.id;

  // Default history if not provided: 9 matchdays
  const gameweekHistory = member.gameweekHistory && member.gameweekHistory.length > 0
    ? member.gameweekHistory
    : [
        { matchday: 9, points: member.matchdayPoints || 215, rank: member.rank, topScorerName: 'D. Olaru (42p)' },
        { matchday: 8, points: 195, rank: 2, topScorerName: 'A. Mitriță (34p)' },
        { matchday: 7, points: 210, rank: 1, topScorerName: 'D. Bîrligea (38p)' },
        { matchday: 6, points: 172, rank: 3, topScorerName: 'C. Petrila (26p)' },
        { matchday: 5, points: 188, rank: 2, topScorerName: 'C. Cîrjan (28p)' },
        { matchday: 4, points: 160, rank: 4, topScorerName: 'A. Șut (22p)' },
        { matchday: 3, points: 205, rank: 1, topScorerName: 'D. Olaru (36p)' },
        { matchday: 2, points: 145, rank: 5, topScorerName: 'Șt. Târnovanu (24p)' },
        { matchday: 1, points: 175, rank: 2, topScorerName: 'D. Politic (30p)' },
      ];

  const pointsList = gameweekHistory.map((g) => g.points);
  const maxPoints = Math.max(...pointsList, 1);
  const minPoints = Math.min(...pointsList);
  const avgPoints = Math.round(pointsList.reduce((acc, p) => acc + p, 0) / pointsList.length);
  const bestMatchday = gameweekHistory.reduce((prev, curr) => (curr.points > prev.points ? curr : prev), gameweekHistory[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl text-slate-100 p-5 flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          aria-label="Închide"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Manager Header */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800 pr-8">
          <img
            src={member.avatar}
            alt={member.name}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-700 shadow-md shrink-0"
          />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-amber-400 font-mono">
                Locul #{member.rank} Sezon
              </span>
              {isMe && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950">
                  Echipa Ta
                </span>
              )}
            </div>

            <h3 className="text-base font-black text-white truncate mt-0.5">
              {member.teamName}
            </h3>

            <span className="text-xs text-slate-400 block truncate">
              Manager: {member.name} · {formatCurrency(member.squadValue)} valoare lot
            </span>
          </div>
        </div>

        {/* Season Summary KPIs */}
        <div className="grid grid-cols-3 gap-2 my-3 p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Sezon</span>
            <span className="font-mono font-black text-amber-400 text-base block mt-0.5">
              {member.totalPoints} pts
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Medie / Etapă</span>
            <span className="font-mono font-bold text-emerald-400 text-base block mt-0.5">
              ~{avgPoints} pts
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Record Etapă</span>
            <span className="font-mono font-bold text-white text-base block mt-0.5">
              {bestMatchday.points} pts
            </span>
          </div>
        </div>

        {/* Visual Bar Graph of Gameweek Performance */}
        <div className="my-2 p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Evoluție Puncte pe Etape</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Max: {maxPoints}p · Min: {minPoints}p
            </span>
          </div>

          {/* Bar Chart Container (Chronological order 1 to latest) */}
          <div className="flex items-end justify-between gap-1.5 h-28 pt-4 pb-1 px-1">
            {[...gameweekHistory].reverse().map((gw) => {
              const heightPct = Math.max(18, Math.round((gw.points / maxPoints) * 100));
              const isBest = gw.points === maxPoints;

              return (
                <div key={gw.matchday} className="flex-1 flex flex-col items-center h-full justify-end group">
                  {/* Points floating tooltip on hover */}
                  <span className="text-[9px] font-mono font-bold text-slate-300 opacity-80 mb-1 group-hover:opacity-100">
                    {gw.points}
                  </span>

                  {/* Bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-md transition-all ${
                      isBest
                        ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-sm shadow-amber-400/30'
                        : 'bg-gradient-to-t from-emerald-700 to-emerald-400/80 hover:brightness-110'
                    }`}
                  />

                  {/* Gameweek Label */}
                  <span className="text-[9px] font-mono text-slate-400 mt-1.5">
                    E{gw.matchday}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gameweek History Detailed Breakdown List */}
        <div className="mt-2 space-y-2 flex-1">
          <div className="flex items-center justify-between text-xs text-slate-300 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Punctaje pe Fiecare Etapă</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono font-normal">
              {gameweekHistory.length} etape disputate
            </span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {gameweekHistory.map((gw) => {
              const isBest = gw.points === maxPoints;

              return (
                <div
                  key={gw.matchday}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all text-xs ${
                    isBest
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-slate-800/40 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 font-mono font-bold text-[11px] px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-center">
                      E{gw.matchday}
                    </span>

                    <div>
                      <span className="font-bold text-white block">
                        Etapa {gw.matchday}
                        {isBest && (
                          <span className="ml-1.5 text-[9px] px-1 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                            Record Personal ★
                          </span>
                        )}
                      </span>
                      {gw.topScorerName && (
                        <span className="text-[10px] text-slate-400 block">
                          Top: {gw.topScorerName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-amber-400 text-sm block">
                      +{gw.points} pts
                    </span>
                    {gw.rank && (
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Locul #{gw.rank} în etapă
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info note */}
        <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 text-center">
          Statistică actualizată oficial după fluierul final al fiecărei etape din Superliga.
        </div>
      </div>
    </div>
  );
};
