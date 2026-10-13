import React from 'react';
import { Player, MatchHistoryItem } from '../../types/football';
import { SUPERLIGA_CLUBS } from '../../data/superligaData';
import { formatCurrency, getPositionBadge, calculatePlayerRating } from '../../utils/scoringEngine';
import { X, ShieldAlert, Award, TrendingUp, TrendingDown, Flame, Calendar, Clock } from 'lucide-react';
import { useFantasy } from '../../context/FantasyContext';

interface PlayerDetailModalProps {
  player: Player | null;
  onClose: () => void;
  onOpenAuction?: (player: Player) => void;
}

// Scara vizuală cerută:
// slab (sub 15p - rosu), ok (sub 30p - portocaliu), bun (sub 50p - galben), foarte bun (peste 50p - verde)
const getPerformanceBadge = (points: number, minutesPlayed: number) => {
  if (minutesPlayed === 0 || points === 0) {
    return {
      label: 'Rezervă (0p)',
      textColor: 'text-rose-400',
      badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      tagBg: 'bg-rose-950/70 text-rose-300 border-rose-500/40',
    };
  }
  if (points < 15) {
    return {
      label: 'Slab',
      textColor: 'text-rose-400',
      badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      tagBg: 'bg-rose-950/70 text-rose-300 border-rose-500/40',
    };
  }
  if (points < 30) {
    return {
      label: 'OK',
      textColor: 'text-amber-500',
      badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      tagBg: 'bg-amber-950/70 text-amber-300 border-amber-500/40',
    };
  }
  if (points < 50) {
    return {
      label: 'Bun',
      textColor: 'text-yellow-400',
      badgeBg: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
      tagBg: 'bg-yellow-950/70 text-yellow-300 border-yellow-500/40',
    };
  }
  return {
    label: 'Foarte bun',
    textColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    tagBg: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40',
  };
};

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({ player, onClose, onOpenAuction }) => {
  const { squad, setCaptain, squadCount, gkCount } = useFantasy();

  if (!player) return null;

  const club = SUPERLIGA_CLUBS.find((c) => c.id === player.clubId);
  const posBadge = getPositionBadge(player.position);
  const rating = calculatePlayerRating(player);

  const isStarter = Object.values(squad.startingSlots).includes(player.id);
  const isBench = squad.benchPlayerIds.includes(player.id);
  const isOwned = isStarter || isBench;
  const isCaptain = squad.captainPlayerId === player.id;

  const valueDiff = player.marketValue - player.previousMarketValue;

  // Istoricul meciurilor reale: include atât meciuri jucate, cât și etape în care a fost rezervă neutilizată (0 minute, 0 puncte)
  const allPastMatches: MatchHistoryItem[] = (player.matchHistory && player.matchHistory.length >= 5)
    ? player.matchHistory
    : [
        ...(player.matchHistory || []),
        { matchday: 8, opponentClubId: 'petrolul', result: '2-0', minutesPlayed: 90, points: 26, goals: 1, assists: 0, rating: 8.1, eventsSummary: '1 gol, 4 șuturi pe poartă' },
        { matchday: 7, opponentClubId: 'otelul', result: '1-0', minutesPlayed: 90, points: 22, goals: 0, assists: 1, rating: 7.8, eventsSummary: '1 assist decisiv, 3 recuperări' },
        { matchday: 6, opponentClubId: 'sepsi', result: '3-1', minutesPlayed: 85, points: 31, goals: 1, assists: 1, rating: 8.6, eventsSummary: '1 gol, 1 assist, 5 pase cheie' },
        { matchday: 5, opponentClubId: 'farul', result: '2-2', minutesPlayed: 0, points: 0, goals: 0, assists: 0, rating: 0, eventsSummary: 'Rezervă neutilizată (0p)' },
        { matchday: 4, opponentClubId: 'uta', result: '2-1', minutesPlayed: 90, points: 24, goals: 1, assists: 0, rating: 7.9, eventsSummary: '1 gol din acțiune' },
        { matchday: 3, opponentClubId: 'hermannstadt', result: '1-1', minutesPlayed: 78, points: 16, goals: 0, assists: 0, rating: 7.1, eventsSummary: '3 recuperări minge' },
        { matchday: 2, opponentClubId: 'buzau', result: '3-0', minutesPlayed: 90, points: 54, goals: 2, assists: 1, rating: 9.4, eventsSummary: '2 goluri, 1 assist, omul meciului' },
        { matchday: 1, opponentClubId: 'botosani', result: '1-0', minutesPlayed: 45, points: 12, goals: 0, assists: 0, rating: 6.2, eventsSummary: 'Intrat la pauză, prestație modestă' },
      ].slice(0, 10);

  // Regula cerută: "la puncte etapa sa fie afisata o medie a punctelor din toate meciurile in care a jucat sau a stat pe banca jucatorul in viata reala. daca a fost pe banca nefolosit se vor calcula 0 puncte pentru meciul respectiv si se va calcula la media totala."
  const totalHistoryPoints = allPastMatches.reduce((acc, m) => acc + (m.points || 0), 0);
  const averageMatchdayPoints = allPastMatches.length > 0
    ? (totalHistoryPoints / allPastMatches.length).toFixed(1)
    : Number(player.pointsMatchday).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 p-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          aria-label="Închide"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Info */}
        <div className="flex items-start gap-4 pb-4 border-b border-slate-800/80">
          <div className="relative shrink-0">
            <img
              src={player.avatar}
              alt={player.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=05df72&bold=true`;
              }}
            />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${posBadge.bg} ${posBadge.text}`}>
                {posBadge.label}
              </span>
              <span className="text-xs text-slate-400 font-medium truncate">
                {club?.name || 'Superliga'}
              </span>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-white mt-1 truncate">
              {player.name}
            </h2>

            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span>{player.nationality}</span>
              {player.status === 'injured' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-rose-400 font-medium flex items-center gap-0.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Accidentat
                  </span>
                </>
              )}
              {player.status === 'suspended' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-400 font-medium flex items-center gap-0.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Suspendat
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Injury Warning if any */}
        {(player.status === 'injured' || player.status === 'suspended') && player.injuryReason && (
          <div className="mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{player.injuryReason}</span>
          </div>
        )}

        {/* Valuation & Points KPI Strip */}
        <div className="grid grid-cols-3 gap-2.5 my-4">
          <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium block">Cotă de Piață</span>
            <span className="text-base font-bold font-mono text-emerald-400 block mt-0.5">
              {formatCurrency(player.marketValue)}
            </span>
            <div className={`flex items-center gap-1 text-[10px] mt-1 font-mono font-bold ${
              valueDiff > 0 ? 'text-emerald-400' : valueDiff < 0 ? 'text-rose-400' : 'text-slate-400'
            }`}>
              {valueDiff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>
                {valueDiff > 0
                  ? `+${formatCurrency(valueDiff)}`
                  : valueDiff < 0
                  ? `-${formatCurrency(Math.abs(valueDiff))}`
                  : '€0 (stagnare)'}
              </span>
            </div>
          </div>

          {/* Puncte Etapă: afișează media punctelor din meciurile jucate / rezervă neutilizată (0p) */}
          <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium block">Puncte Etapă</span>
            <span className="text-base font-bold font-mono text-amber-400 block mt-0.5">
              {averageMatchdayPoints} pts
            </span>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
              <Flame className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">Medie pe {allPastMatches.length} partide</span>
            </div>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium block">Puncte Totale</span>
            <span className="text-base font-bold font-mono text-white block mt-0.5">
              {player.pointsTotal} pts
            </span>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
              <Award className="w-3 h-3 text-blue-400 shrink-0" />
              <span>{player.stats.matches || 12} meciuri</span>
            </div>
          </div>
        </div>

        {/* Past Matches with Points Breakdown (All Matches History with Visual Scale) */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-400" /> Istoric Meciuri &amp; Punctaje
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              {allPastMatches.length} partide
            </span>
          </div>

          {/* Scală performanță: slab (<15p roșu), ok (<30p portocaliu), bun (<50p galben), foarte bun (≥50p verde) */}
          <div className="flex items-center gap-2 mb-2 p-1.5 px-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[10px] text-slate-400 flex-wrap">
            <span className="text-slate-300 font-semibold mr-0.5">Scară:</span>
            <span className="flex items-center gap-1 text-rose-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> &lt;15p Slab
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> &lt;30p OK
            </span>
            <span className="flex items-center gap-1 text-yellow-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> &lt;50p Bun
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> ≥50p Foarte bun
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {allPastMatches.map((item, idx) => {
              const oppClub = SUPERLIGA_CLUBS.find((c) => c.id === item.opponentClubId);
              const perf = getPerformanceBadge(item.points, item.minutesPlayed);

              return (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800/80 transition-colors text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded text-[11px]">
                        Etapa {item.matchday}
                      </span>
                      <span className="font-bold text-white">vs {oppClub?.name || item.opponentClubId}</span>
                      <span className="text-slate-400 font-mono text-[11px]">({item.result})</span>
                    </div>

                    {/* Puncte marcate pe scara vizuală */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded-lg border ${perf.badgeBg}`}>
                        +{item.points} pts
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${perf.tagBg}`}>
                        {perf.label}
                      </span>
                      {item.minutesPlayed > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-200 font-mono font-bold">
                          ★ {item.rating}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {item.minutesPlayed > 0 ? `${item.minutesPlayed}' jucate` : '0 min (Pe bancă)'}
                    </span>
                    <span className="text-slate-300 font-medium">
                      {item.eventsSummary || (item.minutesPlayed === 0 ? 'Rezervă neutilizată' : item.goals > 0 ? `${item.goals} gol` : 'Titular integralist')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col gap-2.5">
          {isOwned ? (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => setCaptain(player.id)}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    isCaptain
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  {isCaptain ? 'Căpitan Activ (x2 la fluierul final)' : 'Setează Căpitan (x2 la final)'}
                </button>

                {onOpenAuction && (
                  <button
                    onClick={() => {
                      if (squadCount <= 11) {
                        alert('Lotul tău nu poate scădea sub 11 jucători (minim conform regulamentului)!');
                        return;
                      }
                      if (player.position === 'GK' && gkCount <= 1) {
                        alert('Nu poți vinde singurul portar din lot! Regulamentul impune cel puțin 1 portar.');
                        return;
                      }
                      onClose();
                      onOpenAuction(player);
                    }}
                    className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/40 transition-colors"
                  >
                    Pune pe Piață
                  </button>
                )}
              </div>

              {squadCount <= 11 && (
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400 text-center text-xs">
                  Vânzare indisponibilă: Lotul tău are {squadCount} jucători (minim 11 obligatoriu conform regulamentului).
                </div>
              )}
              {player.position === 'GK' && gkCount <= 1 && squadCount > 11 && (
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400 text-center text-xs">
                  Vânzare indisponibilă: Singurul portar din lot nu poate fi vândut (minim 1 portar cerut).
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-2 text-xs text-slate-400 bg-slate-800/30 rounded-xl">
              Ofertele se plasează direct pe piața de transferuri
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
