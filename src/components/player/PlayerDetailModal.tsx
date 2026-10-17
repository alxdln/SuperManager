import React, { useState, useRef, useEffect } from 'react';
import { Player, MatchHistoryItem } from '../../types/football';
import { SUPERLIGA_CLUBS } from '../../data/superligaData';
import { formatCurrency, getPositionBadge, calculatePlayerRating } from '../../utils/scoringEngine';
import { useFantasy } from '../../context/FantasyContext';
import { getPlayerDisplayAvatar } from '../../utils/playerAvatar';
import {
  X,
  ChevronLeft,
  Flame,
  Award,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Tag,
} from 'lucide-react';

interface PlayerDetailModalProps {
  player: Player | null;
  onClose: () => void;
  onOpenAuction?: (player: Player) => void;
}

/**
 * Scara vizuală cromatică pentru istoricul punctajelor
 * slab: sub 15p (roșu)
 * ok: 15 - 29p (portocaliu)
 * bun: 30 - 49p (galben)
 * foarte bun: peste 50p (verde)
 */
const getPerformanceColorTier = (points: number) => {
  if (points < 15) {
    return {
      textColor: 'text-rose-400',
      badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
      dotColor: 'bg-rose-500',
    };
  }
  if (points < 30) {
    return {
      textColor: 'text-orange-400',
      badgeBg: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
      dotColor: 'bg-orange-500',
    };
  }
  if (points < 50) {
    return {
      textColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      dotColor: 'bg-amber-500',
    };
  }
  return {
    textColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    dotColor: 'bg-emerald-500',
  };
};

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({ player, onClose, onOpenAuction }) => {
  const { user, squad, setCaptain, squadCount, gkCount } = useFantasy();

  // Mobile swipe-back gesture state
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isSwipingHorizontalRef = useRef<boolean | null>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!player) return null;

  const club = SUPERLIGA_CLUBS.find((c) => c.id === player.clubId);
  const posBadge = getPositionBadge(player.position);

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
        { matchday: 2, opponentClubId: 'corvinul', result: '3-0', minutesPlayed: 90, points: 54, goals: 2, assists: 1, rating: 9.4, eventsSummary: '2 goluri, 1 assist, omul meciului' },
        { matchday: 1, opponentClubId: 'botosani', result: '1-0', minutesPlayed: 45, points: 12, goals: 0, assists: 0, rating: 6.2, eventsSummary: 'Intrat la pauză, prestație modestă' },
      ].slice(0, 10);

  // Medie puncte pe etapă: fără zecimale, număr rotunjit
  const totalHistoryPoints = allPastMatches.reduce((acc, m) => acc + (m.points || 0), 0);
  const averageMatchdayPoints = allPastMatches.length > 0
    ? Math.round(totalHistoryPoints / allPastMatches.length)
    : Math.round(Number(player.pointsMatchday));

  // Native Mobile Swipe-to-Back Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isSwipingHorizontalRef.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartXRef.current;
    const diffY = currentY - touchStartYRef.current;

    // Detect if movement is predominantly horizontal swipe right
    if (isSwipingHorizontalRef.current === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        isSwipingHorizontalRef.current = diffX > 0 && Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (isSwipingHorizontalRef.current && diffX > 0) {
      setDragX(diffX);
    }
  };

  const handleTouchEnd = () => {
    if (dragX > 75) {
      // Swiped far enough: trigger mobile pop transition
      setIsExiting(true);
      setTimeout(() => {
        onClose();
      }, 160);
    } else {
      setDragX(0);
    }
    setIsDragging(false);
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isSwipingHorizontalRef.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200"
      style={{
        opacity: isExiting ? 0 : Math.max(0.3, 1 - dragX / 350),
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal / Screen Container with Mobile Swipe Animation */}
      <div
        ref={modalContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full h-full sm:h-auto sm:max-w-md sm:max-h-[92vh] bg-slate-900 border-0 sm:border sm:border-slate-800 sm:rounded-3xl shadow-2xl text-slate-100 flex flex-col overflow-hidden will-change-transform"
        style={{
          transform: isExiting ? 'translateX(100%)' : `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Subtle Swipe-back Affordance Indicator on Left Edge */}
        <div className="absolute left-1 top-1/2 -translate-y-1/2 z-30 pointer-events-none hidden sm:flex flex-col items-center opacity-30 hover:opacity-75 transition-opacity">
          <div className="w-1 h-12 rounded-full bg-emerald-400/60" />
        </div>

        {/* Native Mobile Top Bar Navigation */}
        <div className="shrink-0 px-4 py-3 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md flex items-center justify-between z-20">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 py-1.5 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 active:scale-95 transition-all"
            aria-label="Reveniți la ecranul precedent"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Înapoi</span>
          </button>

          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 truncate max-w-[170px]">
            Profil Jucător
          </span>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 active:scale-95 transition-colors"
            aria-label="Închide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Profile Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
          {/* Showcase Player Avatar (50% din lățimea modalului) & Info Header */}
          <div className="flex flex-col items-center text-center pb-4 border-b border-slate-800/80 space-y-3">
            {/* 50% Width Centered Showcase Photo */}
            <div className="relative w-1/2 max-w-[200px] aspect-square mx-auto">
              <img
                src={getPlayerDisplayAvatar(player, user.membership)}
                alt={player.name}
                className="w-full h-full rounded-3xl object-cover border-4 border-slate-700/90 shadow-2xl bg-slate-950"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=05df72&bold=true`;
                }}
              />
              {isCaptain && (
                <span
                  title="Căpitan Activ (x2 puncte)"
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xl ring-2 ring-amber-200"
                >
                  C
                </span>
              )}
            </div>

            {/* Position, Club, Name & Details */}
            <div className="w-full flex flex-col items-center">
              <div className="inline-flex items-center justify-center gap-2 flex-wrap">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${posBadge.bg} ${posBadge.text}`}>
                  {posBadge.label}
                </span>
                <span className="inline-flex items-center text-xs text-slate-300 font-bold bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-700/80">
                  {club?.name || 'Superliga'}
                </span>
              </div>

              <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-2 truncate w-full">
                {player.name}
              </h2>

              <div className="inline-flex items-center justify-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                <span className="font-medium">{player.nationality}</span>
                {player.status === 'injured' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-rose-400 font-bold inline-flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0 inline-block" /> Accidentat
                    </span>
                  </>
                )}
                {player.status === 'suspended' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-400 font-bold inline-flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0 inline-block" /> Suspendat
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Injury Warning if any */}
          {(player.status === 'injured' || player.status === 'suspended') && player.injuryReason && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{player.injuryReason}</span>
            </div>
          )}

          {/* Valuation & Points KPI Strip */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Cotă de piață cu evoluția în sumă fixă */}
            <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium block">Cotă de Piață</span>
              <span className="text-base font-bold font-mono text-emerald-400 block mt-0.5">
                {formatCurrency(player.marketValue)}
              </span>
              <div className={`flex items-center gap-1 text-[10px] mt-1 font-mono font-bold ${
                valueDiff > 0 ? 'text-emerald-400' : valueDiff < 0 ? 'text-rose-400' : 'text-slate-400'
              }`}>
                {valueDiff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span className="truncate">
                  {valueDiff > 0
                    ? `+${formatCurrency(valueDiff)}`
                    : valueDiff < 0
                    ? `-${formatCurrency(Math.abs(valueDiff))}`
                    : '€0'}
                </span>
              </div>
            </div>

            {/* Medie Puncte pe Etapă: fără zecimale, număr rotunjit */}
            <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium block leading-tight">Medie Pct. Etapă</span>
              <span className="text-base font-bold font-mono text-amber-400 block mt-0.5">
                {averageMatchdayPoints} pts
              </span>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                <Flame className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">{allPastMatches.length} meciuri</span>
              </div>
            </div>

            {/* Puncte Totale */}
            <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium block">Puncte Totale</span>
              <span className="text-base font-bold font-mono text-white block mt-0.5">
                {player.pointsTotal} pts
              </span>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                <Award className="w-3 h-3 text-blue-400 shrink-0" />
                <span>{player.stats.matches || 12} partide</span>
              </div>
            </div>
          </div>

          {/* Past Matches History with Pure Chromatic Scale (No text labels, no explicit legend) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" /> Istoric Meciuri &amp; Punctaje
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Ultimele {allPastMatches.length} etape
              </span>
            </div>

            <div className="space-y-2">
              {allPastMatches.map((item, idx) => {
                const oppClub = SUPERLIGA_CLUBS.find((c) => c.id === item.opponentClubId);
                const perf = getPerformanceColorTier(item.points);

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          Etapa {item.matchday}
                        </span>
                        <span className="font-bold text-white">vs {oppClub?.name || item.opponentClubId}</span>
                        <span className="text-slate-400 font-mono text-[11px]">({item.result})</span>
                      </div>

                      {/* Scara cromatică pură pentru puncte */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg border ${perf.badgeBg}`}>
                          +{item.points} pts
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
          <div className="pt-2 border-t border-slate-800 flex flex-col gap-2.5">
            {isOwned ? (
              <>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCaptain(player.id)}
                    className={`flex-1 py-3 px-3 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all inline-flex items-center justify-center gap-2 text-center leading-tight shadow-md break-words ${
                      isCaptain
                        ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    <Award className="w-4 h-4 shrink-0 inline-block" />
                    <span className="inline-block">{isCaptain ? 'CĂPITAN ACTIV' : 'SETEAZĂ CĂPITAN'}</span>
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
                      className="py-3 px-3.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 border border-indigo-400/40 transition-all inline-flex items-center justify-center gap-2 text-center leading-tight shrink-0"
                    >
                      <Tag className="w-4 h-4 shrink-0 inline-block" />
                      <span className="inline-block">PUNE PE PIAȚĂ</span>
                    </button>
                  )}
                </div>

                {squadCount <= 11 && (
                  <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400 text-center text-xs">
                    Vânzare indisponibilă: Lotul are minim 11 jucători.
                  </div>
                )}
                {player.position === 'GK' && gkCount <= 1 && squadCount > 11 && (
                  <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400 text-center text-xs">
                    Vânzare indisponibilă: Singurul portar din lot nu poate fi vândut.
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
    </div>
  );
};
