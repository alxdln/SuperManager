import React, { useState, useMemo, useEffect } from 'react';
import { useFantasy } from '../../context/FantasyContext';
import { SUPERLIGA_CLUBS, SUPERLIGA_STANDINGS } from '../../data/superligaData';
import { Player, PlayerPosition, Fixture } from '../../types/football';
import { PlayerLiveStreamModal } from './PlayerLiveStreamModal';
import { DemoMatchSaveModal } from './DemoMatchSaveModal';
import { AnimatedScoreBadge, getPointsTierColor } from '../common/AnimatedScoreBadge';
import {
  Play,
  Pause,
  Activity,
  Flame,
  Shield,
  Award,
  Clock,
  ChevronRight,
  Users,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Timer,
  Zap,
  AlertTriangle,
  Lock,
  Trash2,
  Database,
} from 'lucide-react';
import { formatCurrency, formatFullCurrency } from '../../utils/scoringEngine';
import { getPlayerDisplayAvatar } from '../../utils/playerAvatar';
import { SportmonksLiveService } from '../../services/liveFootballApis';

const fullPosMap: Record<PlayerPosition, string> = {
  GK: 'PORTAR',
  DEF: 'FUNDAȘ',
  MID: 'MIJLOCAȘ',
  FWD: 'ATACANT',
};

const posColorMap: Record<PlayerPosition, { bg: string; text: string }> = {
  GK: { bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-400' },
  DEF: { bg: 'bg-blue-500/20 border-blue-500/40', text: 'text-blue-400' },
  MID: { bg: 'bg-emerald-500/20 border-emerald-500/40', text: 'text-emerald-400' },
  FWD: { bg: 'bg-rose-500/20 border-rose-500/40', text: 'text-rose-400' },
};

export const LiveMatchdayView: React.FC = () => {
  const {
    user,
    updateUserMembership,
    fixtures,
    players,
    squad,
    isSimulating,
    toggleSimulation,
    simulationSpeed,
    setSimulationSpeed,
    squadPointsMatchday,
    rawSquadPointsMatchday,
    squadTotalValue,
    isBudgetNegative,
    isOverdraftPenalized,
    isDemoMatchActive,
    demoTimeRemaining,
    demoMinute,
    demoHomeScore,
    demoAwayScore,
    demoEvents,
    demoEventsByPlayer,
    pendingDemoMatchSave,
    showDemoSaveModal,
    setShowDemoSaveModal,
    confirmSaveDemoMatch,
    cancelDemoMatch,
    resetMatchdayDataToZero,
    startDemoMatch,
    resetDemoMatch,
    sportmonksScores,
    sportmonksPlayerDetails,
    sportmonksActiveMatches,
    isSportmonksPolling,
    refreshSportmonksLiveScores,
    testFixturesEnabled,
    toggleTestFixtures,
    applyCraiovaBotosaniSquad,
    finalizeMatchNow,
    finalizedMatchIds,
  } = useFantasy();

  useEffect(() => {
    refreshSportmonksLiveScores();
  }, [refreshSportmonksLiveScores]);

  const nextMatch = useMemo(() => {
    return SportmonksLiveService.getNextUpcomingSuperligaMatch();
  }, []);

  const [countdown, setCountdown] = useState<{ hours: string; minutes: string; seconds: string }>({
    hours: '18',
    minutes: '30',
    seconds: '00',
  });

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, nextMatch.kickoffTimestamp - Date.now());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown({
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextMatch]);

  const [isSavingMatch, setIsSavingMatch] = useState<boolean>(false);

  // Primary tab is "myPlayers" as requested by user
  const [activeTab, setActiveTab] = useState<'myPlayers' | 'fixtures' | 'table' | 'topPerformers'>('myPlayers');
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>(fixtures[0]?.id || 'fix_1');
  const [topPositionFilter, setTopPositionFilter] = useState<PlayerPosition | 'ALL'>('ALL');
  const [showProUpgradeModal, setShowProUpgradeModal] = useState(false);

  // Selected player for "Flux Evenimente Live & Puncte" modal
  const [selectedPlayerForLive, setSelectedPlayerForLive] = useState<{
    player: Player;
    fixture?: Fixture;
    isCaptain: boolean;
    isStarter: boolean;
  } | null>(null);

  const selectedFixture = fixtures.find((f) => f.id === selectedFixtureId) || fixtures[0];
  const homeClub = SUPERLIGA_CLUBS.find((c) => c.id === selectedFixture?.homeClubId);
  const awayClub = SUPERLIGA_CLUBS.find((c) => c.id === selectedFixture?.awayClubId);

  // Map of all players by ID
  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Find user's starters
  const starterIds = Object.values(squad.startingSlots).filter(Boolean) as string[];
  const starterPlayers = starterIds.map((id) => playerMap.get(id)).filter(Boolean) as Player[];

  // Find user's bench players
  const benchPlayers = squad.benchPlayerIds.map((id) => playerMap.get(id)).filter(Boolean) as Player[];

  // Captain player
  const captainPlayer = squad.captainPlayerId ? playerMap.get(squad.captainPlayerId) : null;

  // Helper to find what match a player is currently playing in this matchday
  const getPlayerFixture = (clubId: string): Fixture | undefined => {
    return fixtures.find((f) => f.homeClubId === clubId || f.awayClubId === clubId);
  };

  // Calculare punctaj curent pentru un jucător (Sportmonks live sau meci curent + multiplicator căpitan)
  const getPlayerMatchdayPoints = (p: Player): number => {
    const isCaptain = squad.captainPlayerId === p.id;
    const smId = p.sportmonksId ? Number(p.sportmonksId) : undefined;
    const liveSmScore = smId ? sportmonksScores.get(smId) : undefined;
    const currentBasePts = typeof liveSmScore === 'number' ? liveSmScore : p.pointsMatchday;
    return currentBasePts * (isCaptain ? 2 : 1);
  };

  // Sortare Titulari descrescător după puncte (cei cu cele mai multe puncte afișați primii)
  const sortedStarterPlayers = useMemo(() => {
    return [...starterPlayers].sort((a, b) => {
      const ptsA = getPlayerMatchdayPoints(a);
      const ptsB = getPlayerMatchdayPoints(b);
      if (ptsB !== ptsA) return ptsB - ptsA;
      return a.name.localeCompare(b.name);
    });
  }, [starterPlayers, sportmonksScores, squad.captainPlayerId]);

  // Sortare Rezerve descrescător după puncte (cei cu cele mai multe puncte afișați primii)
  const sortedBenchPlayers = useMemo(() => {
    return [...benchPlayers].sort((a, b) => {
      const ptsA = getPlayerMatchdayPoints(a);
      const ptsB = getPlayerMatchdayPoints(b);
      if (ptsB !== ptsA) return ptsB - ptsA;
      return a.name.localeCompare(b.name);
    });
  }, [benchPlayers, sportmonksScores, squad.captainPlayerId]);

  // Mod de afișare pentru secțiunea Jucătorii Mei: 'sections' (Titulari / Rezerve) sau 'ranking' (Top 1-15 combinat)
  const [squadViewMode, setSquadViewMode] = useState<'sections' | 'allRanked'>('sections');

  // Toți cei 15 jucători din lot sortați descrescător după punctaj
  const sortedAllSquadPlayers = useMemo(() => {
    const all = [
      ...starterPlayers.map((p) => ({ player: p, isStarter: true })),
      ...benchPlayers.map((p) => ({ player: p, isStarter: false })),
    ];
    return all.sort((a, b) => {
      const ptsA = getPlayerMatchdayPoints(a.player);
      const ptsB = getPlayerMatchdayPoints(b.player);
      if (ptsB !== ptsA) return ptsB - ptsA;
      return a.player.name.localeCompare(b.player.name);
    });
  }, [starterPlayers, benchPlayers, sportmonksScores, squad.captainPlayerId]);

  // Render a player card inside the "Jucătorii Tăi" section
  const renderPlayerRow = (player: Player, isStarter: boolean, rankIndex?: number) => {
    const isCaptain = squad.captainPlayerId === player.id;
    const playerClub = SUPERLIGA_CLUBS.find((c) => c.id === player.clubId);
    const fixture = getPlayerFixture(player.clubId);
    const posFullName = fullPosMap[player.position];
    const posStyle = posColorMap[player.position];

    // Determine opponent and status
    const isHome = fixture?.homeClubId === player.clubId;
    const oppClubId = isHome ? fixture?.awayClubId : fixture?.homeClubId;
    const oppClub = SUPERLIGA_CLUBS.find((c) => c.id === oppClubId);

    const smId = player.sportmonksId ? Number(player.sportmonksId) : undefined;
    const liveSmScore = smId ? sportmonksScores.get(smId) : undefined;
    const currentBasePts = typeof liveSmScore === 'number' ? liveSmScore : player.pointsMatchday;
    const ptsEarned = currentBasePts * (isCaptain ? 2 : 1);
    const isFinished = fixture?.isFinished;
    const hidePlayerLivePoints = false; // Permite vizualizarea live a punctelor și accesul la fluxul de acțiuni

    return (
      <div
        key={player.id}
        onClick={() => {
          setSelectedPlayerForLive({
            player: { ...player, pointsMatchday: currentBasePts },
            fixture,
            isCaptain,
            isStarter,
          });
        }}
        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
          isCaptain
            ? 'bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border-amber-500/50 shadow-md hover:border-amber-400'
            : isStarter
            ? 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/60 hover:bg-slate-800/80'
            : 'bg-slate-900/60 border-slate-800/70 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {typeof rankIndex === 'number' && (
            <span
              className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-[11px] shrink-0 ${
                rankIndex === 0
                  ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/30'
                  : rankIndex === 1
                  ? 'bg-slate-300 text-slate-950'
                  : rankIndex === 2
                  ? 'bg-amber-700 text-amber-100'
                  : 'bg-slate-800 text-slate-400 border border-slate-700/60'
              }`}
            >
              #{rankIndex + 1}
            </span>
          )}
          <div className="relative shrink-0">
            <img
              src={getPlayerDisplayAvatar(player, user.membership)}
              alt={player.name}
              className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=05df72&bold=true`;
              }}
            />
            {isCaptain && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-full shadow border border-amber-300">
                👑 C
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${posStyle.bg} ${posStyle.text}`}>
                {posFullName}
              </span>
              <span className="text-sm font-extrabold uppercase tracking-tight text-white truncate">{player.name}</span>
              {isCaptain && (
                <span className="text-[10px] font-bold text-amber-300">👑 (x2)</span>
              )}
            </div>

            {/* Match info row */}
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="font-semibold text-slate-300">{playerClub?.shortName}</span>
              {fixture ? (
                <>
                  <span>vs</span>
                  <span className="text-slate-300">{oppClub?.shortName}</span>
                  {fixture.isLive ? (
                    <span className="font-mono text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      {fixture.minute}&apos; ({fixture.homeScore}-{fixture.awayScore})
                    </span>
                  ) : fixture.isFinished ? (
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded-full">
                      Fin ({fixture.homeScore}-{fixture.awayScore})
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {fixture.scheduledTime}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-slate-500 text-[10px]">Fără meci în etapă</span>
              )}
            </div>
          </div>
        </div>

        {/* Right side: Points badge and action prompt */}
        <div className="flex items-center gap-2.5 shrink-0">
          {hidePlayerLivePoints ? (
            <div className="text-right">
              <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-mono text-[10px] font-bold border border-slate-700/60 inline-flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>După final</span>
              </span>
              <span className="text-[9px] text-amber-400 font-medium block flex items-center gap-0.5 justify-end mt-0.5">
                <span>Deblocabil PRO</span>
              </span>
            </div>
          ) : (
            <div className="text-right flex flex-col items-end justify-center">
              <AnimatedScoreBadge score={ptsEarned} prefixPlus={true} suffix="pts" size="md" />
              <span className="text-[9px] text-emerald-400/90 font-medium block flex items-center gap-0.5 justify-end mt-0.5">
                <span>Flux Live</span>
                <ChevronRight className="w-3 h-3 text-emerald-400" />
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3.5 pb-20">
      {/* Overdraft Alert Banner if team is negative at round start */}
      {isOverdraftPenalized && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 shadow-md">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                Avertisment Sold Negativ ({formatCurrency(user.budget)})
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Puncte Înghețate în Clasament
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Jucătorii tăi acumulează acțiuni și puncte în meci în mod normal (total brut: <b className="text-white font-mono">{rawSquadPointsMatchday} pts</b>), însă în clasamentul live și cel general nu se adaugă punctele echipei până când soldul nu revine pe plus înainte de salvarea etapei!
            </p>
          </div>
        </div>
      )}

      {/* Meciuri Live Sportmonks vs Ecran de Așteptare Standby */}
      {sportmonksActiveMatches && sportmonksActiveMatches.length > 0 ? (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/50 shadow-xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <span>Meciuri Live SuperLiga (Sportmonks v3)</span>
                  <span className="bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full">
                    INPLAY
                  </span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshSportmonksLiveScores}
                  className="text-[10px] text-amber-300 hover:text-white font-mono bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 flex items-center gap-1 active:scale-95 transition-all"
                  title="Reîmprospătează datele live"
                >
                  <RotateCcw className={`w-3 h-3 ${isSportmonksPolling ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>Sincronizează</span>
                </button>
                {testFixturesEnabled && (
                  <button
                    onClick={toggleTestFixtures}
                    className="text-[10px] text-slate-400 hover:text-slate-200 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800"
                  >
                    Închide Test
                  </button>
                )}
              </div>
            </div>

            {sportmonksActiveMatches.map((match: any, idx: number) => {
              const homePart = match.participants?.[0] || { name: 'Gazde' };
              const awayPart = match.participants?.[1] || { name: 'Oaspeți' };
              const homeScore =
                match.scores?.find((s: any) => s.description === 'CURRENT' && s.score?.participant === 'home')?.score?.goals ?? 0;
              const awayScore =
                match.scores?.find((s: any) => s.description === 'CURRENT' && s.score?.participant === 'away')?.score?.goals ?? 0;
              const liveEvents = match.events || [];

              return (
                <div key={match.id || idx} className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-center gap-2">
                    <div className="flex-1 text-left min-w-0">
                      <span className="text-xs font-black text-white truncate block">{homePart.name}</span>
                      <span className="text-[10px] text-slate-400">Gazde</span>
                    </div>
                    <div className="px-3 shrink-0">
                      <span className="font-mono text-xl font-black text-emerald-400">
                        {homeScore} - {awayScore}
                      </span>
                      <span className="block text-[9px] font-bold text-amber-400 animate-pulse">
                        {match.minute ? `${match.minute}' LIVE` : 'INPLAY'}
                      </span>
                    </div>
                    <div className="flex-1 text-right min-w-0">
                      <span className="text-xs font-black text-white truncate block">{awayPart.name}</span>
                      <span className="text-[10px] text-slate-400">Oaspeți</span>
                    </div>
                  </div>

                  {liveEvents.length > 0 && (
                    <div className="space-y-1 max-h-36 overflow-y-auto pt-2 border-t border-slate-800/80">
                      <span className="text-[9px] font-bold uppercase text-slate-400 block">
                        Evenimente Extrase în Direct:
                      </span>
                      {liveEvents.slice(0, 6).map((ev: any, eIdx: number) => (
                        <div key={ev.id || eIdx} className="text-[10px] text-slate-300 flex items-center justify-between">
                          <span>
                            {ev.minute}&apos; <b className="text-amber-300">{ev.type?.name || 'Eveniment'}</b> - {ev.player_name || ev.player?.display_name || 'Jucător'}
                          </span>
                          <span className="text-emerald-400 font-mono font-bold text-[9px] bg-slate-900 px-1 py-0.2 rounded">
                            {ev.type?.code || 'STAT'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Action Bar for Live Matches */}
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 shadow-md flex-wrap">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-200">
                Punctajele fotbaliștilor se actualizează automat la fiecare 30 de secunde.
              </span>
            </div>

            <button
              onClick={async () => {
                setIsSavingMatch(true);
                try {
                  await finalizeMatchNow('19729653');
                  await finalizeMatchNow('19729652');
                } finally {
                  setIsSavingMatch(false);
                }
              }}
              disabled={isSavingMatch}
              className={`py-1.5 px-3 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 active:scale-95 transition-all ${
                finalizedMatchIds.includes('19729653') || finalizedMatchIds.includes('fix_19729653')
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
              }`}
            >
              <Database className={`w-3.5 h-3.5 ${isSavingMatch ? 'animate-spin' : ''}`} />
              <span>
                {isSavingMatch
                  ? 'Se salvează...'
                  : finalizedMatchIds.includes('19729653') || finalizedMatchIds.includes('fix_19729653')
                  ? 'Salvat în Firestore'
                  : 'Salvează în Baza de Date'}
              </span>
            </button>
          </div>
        </div>
      ) : (
        /* Standby View: Ecran de Așteptare Următorul Meci Programat (curat, fără telemetrie) */
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-black text-xs uppercase tracking-wider border border-emerald-500/20">
                SuperLiga României · Etapa {nextMatch.round}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Următorul Meci Programat</span>
            </span>
          </div>

          {/* Card Central Următorul Meci cu Countdown */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-2">
            {/* Echipele */}
            <div className="flex items-center justify-center gap-6 w-full md:w-auto text-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-red-600 flex items-center justify-center text-white font-black text-sm shadow-md border border-white/10">
                  FCSB
                </div>
                <span className="text-xs font-black text-white">{nextMatch.homeClubName}</span>
                <span className="text-[10px] text-slate-400">Gazde</span>
              </div>

              <div className="flex flex-col items-center px-3">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">VS</span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold mt-1">
                  {nextMatch.scheduledTime}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[160px]">
                  {nextMatch.stadium}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-700 to-red-900 flex items-center justify-center text-white font-black text-sm shadow-md border border-white/10">
                  RAP
                </div>
                <span className="text-xs font-black text-white">{nextMatch.awayClubName}</span>
                <span className="text-[10px] text-slate-400">Oaspeți</span>
              </div>
            </div>

            {/* Countdown Timer */}
            <div className="flex flex-col items-center md:items-end">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                Timp până la start
              </span>
              <div className="flex items-center gap-1.5 font-mono">
                <div className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-center min-w-[44px]">
                  <span className="text-base font-black text-white">{countdown.hours}</span>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block">Ore</span>
                </div>
                <span className="text-slate-600 font-bold">:</span>
                <div className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-center min-w-[44px]">
                  <span className="text-base font-black text-white">{countdown.minutes}</span>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block">Min</span>
                </div>
                <span className="text-slate-600 font-bold">:</span>
                <div className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-center min-w-[44px]">
                  <span className="text-base font-black text-emerald-400">{countdown.seconds}</span>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block">Sec</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bară de Acțiuni Discrete */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            <button
              onClick={() => refreshSportmonksLiveScores()}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 inline-flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isSportmonksPolling ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
              <span>Verifică Meciuri Live</span>
            </button>

            <button
              onClick={toggleTestFixtures}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all border inline-flex items-center gap-1.5 active:scale-95 ${
                testFixturesEnabled
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
              }`}
            >
              <span>{testFixturesEnabled ? 'Meciuri Test Active (Craiova vs Botoșani)' : 'Previzualizează Meci Test Craiova'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
        <button
          onClick={() => setActiveTab('myPlayers')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'myPlayers'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Jucătorii Mei ({starterPlayers.length + benchPlayers.length})</span>
          <span className="bg-rose-600 text-white text-[8px] font-black px-1 rounded-full animate-pulse">
            LIVE
          </span>
        </button>

        <button
          onClick={() => setActiveTab('fixtures')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'fixtures'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Meciuri Etapă</span>
        </button>

        <button
          onClick={() => setActiveTab('table')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'table'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Clasament
        </button>

        <button
          onClick={() => setActiveTab('topPerformers')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'topPerformers'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Top Jucători
        </button>
      </div>

      {/* TAB 1: JUCĂTORII MEI PENTRU ETAPA CURENTĂ (CORE REQUIREMENT) */}
      {activeTab === 'myPlayers' && (
        <div className="space-y-4">
          {/* Craiova vs Botoșani Live Match Sync Card */}
          <div className="p-3 bg-gradient-to-r from-blue-950/70 via-slate-900 to-slate-900 border border-blue-500/40 rounded-2xl flex items-center justify-between gap-3 shadow-md flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-xs shrink-0 shadow">
                UCV
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-white">Meci Live: Universitatea Craiova vs FC Botoșani</span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Sportmonks #19729653
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 truncate mt-0.5">
                  11 Titulari + 4 Rezerve · Toate regulile de azi active: gol echipă (±5p), greșeli Popescu (51&apos;), rezerve cu minut exact
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => applyCraiovaBotosaniSquad()}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-slate-950 text-xs font-black transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-1.5"
              >
                <span>Aplică Lotul Craiova</span>
              </button>
              <button
                onClick={() => refreshSportmonksLiveScores()}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700"
                title="Reîmprospătează scorurile live"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Top Quick Stats Strip */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">
                Puncte Etapă
              </span>
              <AnimatedScoreBadge score={rawSquadPointsMatchday} prefixPlus={false} suffix="pts" size="lg" />
              {isOverdraftPenalized && (
                <span className="text-[9px] font-bold text-amber-400 block mt-0.5">
                  (0 pts în clasament)
                </span>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Titulari Ocupați
              </span>
              <span className="font-mono text-xl font-black text-emerald-400 block mt-0.5">
                {starterPlayers.length}/11
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Căpitan Activ
              </span>
              <span className="text-xs font-bold text-amber-300 truncate block mt-1">
                {captainPlayer ? `👑 ${captainPlayer.name}` : 'Neselectat'}
              </span>
            </div>
          </div>

          {/* Sub-view toggle & Sorting Indicator */}
          <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex-wrap">
            <div className="flex items-center gap-1.5 px-1.5">
              <span className="text-[11px] font-bold text-slate-300">Ierarhie Live:</span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Top puncte sus ⬇
              </span>
            </div>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
              <button
                onClick={() => setSquadViewMode('sections')}
                className={`py-1 px-2.5 rounded-lg text-[10px] font-bold transition-all ${
                  squadViewMode === 'sections'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Titulari &amp; Bancă
              </button>
              <button
                onClick={() => setSquadViewMode('allRanked')}
                className={`py-1 px-2.5 rounded-lg text-[10px] font-bold transition-all ${
                  squadViewMode === 'allRanked'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Clasament Lot (1-15)
              </button>
            </div>
          </div>

          {squadViewMode === 'sections' ? (
            <>
              {/* Section: Titulari (Primul 11) - Sortați descrescător după puncte */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Titulari în Etapă ({starterPlayers.length}/11)
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Apasă pentru <b>Flux Evenimente</b>
                  </span>
                </div>

                {sortedStarterPlayers.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                    Nu ai selectat încă niciun titular în primul 11. Mergi la secțiunea <b>Echipa</b> pentru a-ți așeza formația!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedStarterPlayers.map((p, idx) => renderPlayerRow(p, true, idx))}
                  </div>
                )}
              </div>

              {/* Section: Rezerve pe bancă - Sortate descrescător după puncte */}
              {sortedBenchPlayers.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Bancă de Rezerve ({benchPlayers.length})
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-500">Flux meciuri</span>
                  </div>

                  <div className="space-y-2">
                    {sortedBenchPlayers.map((p, idx) => renderPlayerRow(p, false, idx + sortedStarterPlayers.length))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Mod Vizualizare: Clasament Unificat Toți Jucătorii din Lot (1 - 15) */
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Clasament Lot ({sortedAllSquadPlayers.length} Jucători)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  Ordonat strict după punctaj
                </span>
              </div>

              <div className="space-y-2">
                {sortedAllSquadPlayers.map((item, idx) =>
                  renderPlayerRow(item.player, item.isStarter, idx)
                )}
              </div>
            </div>
          )}

          {/* Legendă Culori Punctaje SuperManager */}
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Legendă Culori Punctaj Live
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono font-bold">
              <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-sans font-normal">&lt; 25 pts:</span>
                <span className="text-orange-600">Portocaliu închis</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-sans font-normal">&lt; 50 pts:</span>
                <span className="text-yellow-400">Galben</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-sans font-normal">&lt; 100 pts:</span>
                <span className="text-green-500">Verde normal</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-sans font-normal">≥ 100 pts:</span>
                <span className="text-[#39ff14] drop-shadow-[0_0_6px_rgba(57,255,20,0.6)]">Verde neon</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MECIURI ETAPĂ & SCOREBOARD */}
      {activeTab === 'fixtures' && (
        <div className="space-y-4">
          {/* Fixtures Horizontal Scroller */}
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {fixtures.map((fix) => {
              const hClub = SUPERLIGA_CLUBS.find((c) => c.id === fix.homeClubId);
              const aClub = SUPERLIGA_CLUBS.find((c) => c.id === fix.awayClubId);
              const isSelected = fix.id === selectedFixtureId;

              return (
                <div
                  key={fix.id}
                  onClick={() => setSelectedFixtureId(fix.id)}
                  className={`shrink-0 w-64 p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span className="text-slate-400">Etapa {fix.round}</span>
                    {fix.isLive ? (
                      <span className="font-mono font-bold text-rose-400 bg-rose-950/60 border border-rose-800 px-1.5 py-0.2 rounded-full text-[10px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        {fix.minute}&apos;
                      </span>
                    ) : fix.isFinished ? (
                      <span className="text-slate-400 font-mono text-[10px]">Final</span>
                    ) : (
                      <span className="text-emerald-400 text-[10px]">{fix.scheduledTime}</span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate max-w-[140px]">
                        {hClub?.shortName || fix.homeClubId}
                      </span>
                      <span className="font-mono font-bold text-sm text-white">
                        {fix.isLive || fix.isFinished ? fix.homeScore : '-'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate max-w-[140px]">
                        {aClub?.shortName || fix.awayClubId}
                      </span>
                      <span className="font-mono font-bold text-sm text-white">
                        {fix.isLive || fix.isFinished ? fix.awayScore : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Fixture Big Scoreboard */}
          {selectedFixture && (
            <div className="p-5 bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-slate-700/80 rounded-3xl shadow-xl">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                <span>{homeClub?.stadium || 'Superliga Arena'}</span>
                {selectedFixture.isLive ? (
                  <span className="text-rose-400 font-mono font-bold text-sm bg-rose-950/80 border border-rose-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    Minutul {selectedFixture.minute}&apos; (LIVE)
                  </span>
                ) : (
                  <span className="text-slate-400">{selectedFixture.scheduledTime}</span>
                )}
              </div>

              <div className="grid grid-cols-3 items-center text-center">
                <div className="flex flex-col items-center">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md mb-2"
                    style={{ backgroundColor: homeClub?.logoColor || '#333' }}
                  >
                    {homeClub?.badgeText || 'H'}
                  </div>
                  <span className="text-sm font-bold text-white truncate w-full">{homeClub?.name}</span>
                </div>

                <div>
                  <div className="font-mono text-3xl font-black text-white tracking-wider">
                    {selectedFixture.isLive || selectedFixture.isFinished
                      ? `${selectedFixture.homeScore} - ${selectedFixture.awayScore}`
                      : 'VS'}
                  </div>
                  <span className="text-[11px] text-emerald-400 font-semibold block mt-1">Superliga Live</span>
                </div>

                <div className="flex flex-col items-center">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md mb-2"
                    style={{ backgroundColor: awayClub?.logoColor || '#555' }}
                  >
                    {awayClub?.badgeText || 'A'}
                  </div>
                  <span className="text-sm font-bold text-white truncate w-full">{awayClub?.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* Live Action Ticker Feed (Kickbase real-time log) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Flux Evenimente Live &amp; Puncte
            </h3>

            {selectedFixture?.events && selectedFixture.events.length > 0 ? (
              <div className="space-y-2.5">
                {[...selectedFixture.events]
                  .sort((a, b) => b.minute - a.minute)
                  .map((ev) => {
                  const isStarter = Object.values(squad.startingSlots).includes(ev.playerId);
                  const isCaptain = squad.captainPlayerId === ev.playerId;
                  const ptsFinal = ev.pointsChange * (isCaptain ? 2 : 1);

                  return (
                    <div
                      key={ev.id}
                      className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        isStarter
                          ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm'
                          : 'bg-slate-800/40 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="font-mono text-xs font-bold text-amber-400 bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800 shrink-0 mt-0.5">
                          {ev.minute}&apos;
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white">{ev.playerName}</span>
                            {isStarter && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950">
                                În echipa ta {isCaptain && '(C)'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">{ev.description}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-lg block ${
                            ptsFinal >= 0
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {ptsFinal >= 0 ? `+${ptsFinal}` : ptsFinal} pts
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                Nu există acțiuni înregistrate încă pentru acest meci.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CLASAMENT SUPERLIGA */}
      {activeTab === 'table' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-white">Clasament Real Superliga 2024/2025</h3>
              <p className="text-[11px] text-slate-400">Date sincronizate oficial LPF / Opta</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              Etapa 12
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 text-[11px]">
                  <th className="py-2 px-1 text-center font-mono">#</th>
                  <th className="py-2 px-2">Club</th>
                  <th className="py-2 px-2 text-center font-mono">M</th>
                  <th className="py-2 px-2 text-center font-mono">V</th>
                  <th className="py-2 px-2 text-center font-mono">E</th>
                  <th className="py-2 px-2 text-center font-mono">Î</th>
                  <th className="py-2 px-2 text-center font-mono">G</th>
                  <th className="py-2 px-2 text-center font-mono font-bold text-white">Pct</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {SUPERLIGA_STANDINGS.map((row, idx) => {
                  const club = SUPERLIGA_CLUBS.find((c) => c.id === row.clubId);
                  const isPlayoff = idx < 6;

                  return (
                    <tr
                      key={row.clubId}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-1 text-center font-bold">
                        <span
                          className={`w-5 h-5 rounded-md inline-flex items-center justify-center text-[11px] ${
                            isPlayoff
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      <td className="py-2.5 px-2 font-sans font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: club?.logoColor || '#666' }}
                          />
                          <span className="truncate max-w-[130px]">{club?.name}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-center text-slate-300">{row.played}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{row.won}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{row.drawn}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{row.lost}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400 text-[11px]">
                        {row.gf}:{row.ga}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-amber-400 text-sm">
                        {row.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Locurile 1-6: Play-off
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500" /> Locurile 7-16: Play-out
            </span>
          </div>
        </div>
      )}

      {/* TAB 4: TOP JUCĂTORI (SORTARE PE POZIȚII & TOP GENERAL) */}
      {activeTab === 'topPerformers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">
                {topPositionFilter === 'ALL'
                  ? 'Top General Fotbaliști Fantasy'
                  : topPositionFilter === 'GK'
                  ? 'Top Portari (P) Superliga'
                  : topPositionFilter === 'DEF'
                  ? 'Top Fundași (D) Superliga'
                  : topPositionFilter === 'MID'
                  ? 'Top Mijlocași (M) Superliga'
                  : 'Top Atacanți (A) Superliga'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Ierarhie după punctajul total oficial acumulat
              </p>
            </div>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded-full">
              Superliga 24/25
            </span>
          </div>

          {/* Position Selector Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl overflow-x-auto">
            <button
              onClick={() => setTopPositionFilter('ALL')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
                topPositionFilter === 'ALL'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              General (Toți)
            </button>
            <button
              onClick={() => setTopPositionFilter('GK')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                topPositionFilter === 'GK'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Portari (P)
            </button>
            <button
              onClick={() => setTopPositionFilter('DEF')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                topPositionFilter === 'DEF'
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Fundași (D)
            </button>
            <button
              onClick={() => setTopPositionFilter('MID')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                topPositionFilter === 'MID'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Mijlocași (M)
            </button>
            <button
              onClick={() => setTopPositionFilter('FWD')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                topPositionFilter === 'FWD'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Atacanți (A)
            </button>
          </div>

          <div className="space-y-2">
            {[...players]
              .filter((p) => topPositionFilter === 'ALL' || p.position === topPositionFilter)
              .sort((a, b) => b.pointsTotal - a.pointsTotal)
              .slice(0, 15)
              .map((p, idx) => {
                const club = SUPERLIGA_CLUBS.find((c) => c.id === p.clubId);
                const posFullName = fullPosMap[p.position];
                const posStyle = posColorMap[p.position];
                const matchesPlayed = Math.max(p.stats?.matches || 1, 1);
                const avgPts = (p.pointsTotal / matchesPlayed).toFixed(1);

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      const f = getPlayerFixture(p.clubId);
                      const isStarter = starterIds.includes(p.id);
                      const isCaptain = squad.captainPlayerId === p.id;
                      setSelectedPlayerForLive({
                        player: p,
                        fixture: f,
                        isCaptain,
                        isStarter,
                      });
                    }}
                    className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-xs font-black w-5 text-center ${
                        idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <img
                        src={p.avatar}
                        alt={p.name}
                        className="w-11 h-11 rounded-2xl object-cover border border-slate-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=0f172a&color=05df72&bold=true`;
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${posStyle.bg} ${posStyle.text}`}>
                            {posFullName}
                          </span>
                          <span className="text-xs font-extrabold uppercase tracking-tight text-white">{p.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{club?.shortName}</span>
                          <span>·</span>
                          <span className="font-mono text-emerald-400">{formatCurrency(p.marketValue)}</span>
                          <span>·</span>
                          <span className="font-mono text-slate-300">Medie {avgPts}p/meci</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <AnimatedScoreBadge score={p.pointsTotal} prefixPlus={false} suffix="pts" size="sm" />
                      <span className="text-[10px] text-slate-400">+{p.pointsMatchday} în etapă</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* DEDICATED MODAL: FLUX EVENIMENTE LIVE & PUNCTE */}
      {selectedPlayerForLive && (
        <PlayerLiveStreamModal
          player={players.find((p) => p.id === selectedPlayerForLive.player.id) || selectedPlayerForLive.player}
          fixture={selectedPlayerForLive.fixture}
          isCaptain={selectedPlayerForLive.isCaptain}
          isStarter={selectedPlayerForLive.isStarter}
          onClose={() => setSelectedPlayerForLive(null)}
        />
      )}

      {/* PRO UPGRADE MODAL FOR FREE TIER */}
      {showProUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Sparkles className="w-7 h-7" />
            </div>

            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold uppercase">
                Funcționalitate PRO
              </span>
              <h3 className="text-base font-bold text-white mt-2">
                Puncte &amp; Acțiuni Live per Jucător
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                În versiunea <b>Gratuit</b>, ai acces la scorul live total al echipei tale (<b>{rawSquadPointsMatchday} pts</b>), iar punctajele fiecărui fotbalist sunt afișate după terminarea meciurilor.
              </p>
              <div className="mt-3 p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-left text-[11px] space-y-1.5 text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold">★</span>
                  <span>Scoruri și acțiuni live secundă cu secundă</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold">★</span>
                  <span>Poze reale oficiale pentru toți fotbaliștii</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold">★</span>
                  <span>Clasament al managerilor actualizat în timp real</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setShowProUpgradeModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Am înțeles
              </button>
              <button
                onClick={() => {
                  updateUserMembership('pro');
                  setShowProUpgradeModal(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20"
              >
                Activează PRO Acum
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Match Final Save Modal Prompt */}
      <DemoMatchSaveModal
        isOpen={showDemoSaveModal}
        data={pendingDemoMatchSave}
        teamName={user.teamName}
        starterPlayers={starterPlayers}
        onConfirmSave={confirmSaveDemoMatch}
        onCancel={cancelDemoMatch}
      />
    </div>
  );
};
