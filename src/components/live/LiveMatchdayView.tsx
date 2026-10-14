import React, { useState } from 'react';
import { useFantasy } from '../../context/FantasyContext';
import { SUPERLIGA_CLUBS, SUPERLIGA_STANDINGS } from '../../data/superligaData';
import { Player, PlayerPosition, Fixture } from '../../types/football';
import { PlayerLiveStreamModal } from './PlayerLiveStreamModal';
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
} from 'lucide-react';
import { formatCurrency, formatFullCurrency } from '../../utils/scoringEngine';

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
    startDemoMatch,
    resetDemoMatch,
  } = useFantasy();

  // Primary tab is "myPlayers" as requested by user
  const [activeTab, setActiveTab] = useState<'myPlayers' | 'fixtures' | 'table' | 'topPerformers'>('myPlayers');
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>(fixtures[0]?.id || 'fix_1');
  const [topPositionFilter, setTopPositionFilter] = useState<PlayerPosition | 'ALL'>('ALL');

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

  // Render a player card inside the "Jucătorii Tăi" section
  const renderPlayerRow = (player: Player, isStarter: boolean) => {
    const isCaptain = squad.captainPlayerId === player.id;
    const playerClub = SUPERLIGA_CLUBS.find((c) => c.id === player.clubId);
    const fixture = getPlayerFixture(player.clubId);
    const posFullName = fullPosMap[player.position];
    const posStyle = posColorMap[player.position];

    // Determine opponent and status
    const isHome = fixture?.homeClubId === player.clubId;
    const oppClubId = isHome ? fixture?.awayClubId : fixture?.homeClubId;
    const oppClub = SUPERLIGA_CLUBS.find((c) => c.id === oppClubId);

    const ptsEarned = player.pointsMatchday * (isCaptain ? 2 : 1);

    return (
      <div
        key={player.id}
        onClick={() => {
          setSelectedPlayerForLive({
            player,
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
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img
              src={player.avatar}
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
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1">
              <span
                className={`font-mono text-sm font-black ${
                  ptsEarned > 0
                    ? 'text-emerald-400'
                    : ptsEarned < 0
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {ptsEarned >= 0 ? `+${ptsEarned}` : ptsEarned}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">pts</span>
            </div>
            <span className="text-[9px] text-emerald-400/90 font-medium block flex items-center gap-0.5 justify-end mt-0.5">
              <span>Flux Live</span>
              <ChevronRight className="w-3 h-3 text-emerald-400" />
            </span>
          </div>
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

      {/* 3-Minute Demo Match Arena Card */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isDemoMatchActive
          ? 'bg-gradient-to-br from-indigo-950/60 via-slate-900 to-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
          : 'bg-slate-900/90 border-slate-800'
      }`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isDemoMatchActive ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-indigo-500/20 text-indigo-400'}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Meci Demonstrativ (3 Minute)
                </span>
                {isDemoMatchActive ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse">
                    LIVE ACUM
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400">
                    Pregătit
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Simulare realistă accelerată (3 min = 90 min de joc) cu fotbaliștii din lotul tău
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isDemoMatchActive ? (
              <>
                <button
                  onClick={resetDemoMatch}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 inline-flex items-center gap-1.5 active:scale-95 transition-all"
                  title="Oprește meciul demo"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Resetează</span>
                </button>
                <button
                  onClick={startDemoMatch}
                  className="py-2 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase tracking-wider text-xs shadow-md shadow-emerald-500/20 inline-flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart Meci</span>
                </button>
              </>
            ) : (
              <button
                onClick={startDemoMatch}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black uppercase tracking-wider text-xs shadow-lg shadow-emerald-500/25 inline-flex items-center gap-2 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Meci Demo</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Demo Match Scoreboard and Timer */}
        {isDemoMatchActive && (
          <div className="mt-3.5 pt-3.5 border-t border-slate-800/80 space-y-3">
            {/* Scoreboard */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-center flex-wrap">
              <div className="flex-1 min-w-[100px]">
                <span className="text-xs font-black uppercase text-emerald-400 block truncate">
                  {user.teamName}
                </span>
                <span className="text-[10px] text-slate-400">Echipa Ta</span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-2xl font-black text-white">
                  {demoHomeScore} - {demoAwayScore}
                </span>
              </div>

              <div className="flex-1 min-w-[100px]">
                <span className="text-xs font-black uppercase text-slate-300 block truncate">
                  Oponenți Superliga
                </span>
                <span className="text-[10px] text-slate-400">Rivali Etapă</span>
              </div>
            </div>

            {/* Timers Strip */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-center gap-2">
                <Timer className="w-4 h-4 text-emerald-400 animate-spin" />
                <span className="text-slate-300">Timp Rămas:</span>
                <b className="font-mono text-emerald-400">
                  {Math.floor(demoTimeRemaining / 60).toString().padStart(2, '0')}:
                  {(demoTimeRemaining % 60).toString().padStart(2, '0')}
                </b>
              </div>

              <div className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300">Minut Meci:</span>
                <b className="font-mono text-amber-300">{demoMinute}&apos; / 90&apos;</b>
              </div>
            </div>

            {/* Live Events Stream */}
            {demoEvents.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
                  Flux Evenimente în Timp Real
                </span>
                {demoEvents.slice(0, 6).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] font-bold text-amber-400 shrink-0">
                        {ev.minute}&apos;
                      </span>
                      <span className="text-slate-200 text-xs truncate">{ev.description}</span>
                    </div>
                    {ev.pointsChange !== 0 && (
                      <span className={`font-mono text-xs font-black shrink-0 ${ev.pointsChange > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {ev.pointsChange > 0 ? `+${ev.pointsChange}p` : `${ev.pointsChange}p`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Simulation Minute-by-Minute Live Engine Controller Strip */}
      <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between text-xs shadow-sm flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
          </span>
          <div>
            <span className="text-white font-bold block text-xs">Etapa 12 în Desfășurare</span>
            <span className="text-[10px] text-slate-400">Motor Live Minute-by-Minute</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700">
            {[1, 2, 5].map((speed) => (
              <button
                key={speed}
                onClick={() => setSimulationSpeed(speed)}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors ${
                  simulationSpeed === speed
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          <button
            onClick={toggleSimulation}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition-all ${
              isSimulating
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
            }`}
          >
            {isSimulating ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pauză
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Pornește
              </>
            )}
          </button>
        </div>
      </div>

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
          {/* Top Quick Stats Strip */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Puncte Etapă
              </span>
              <span className="font-mono text-xl font-black text-amber-400 block mt-0.5">
                {rawSquadPointsMatchday} pts
              </span>
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

          {/* Section: Titulari (Primul 11) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Titulari în Etapă ({starterPlayers.length}/11)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Apasă pe orice jucător pentru <b>Flux Evenimente Live</b>
              </span>
            </div>

            {starterPlayers.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                Nu ai selectat încă niciun titular în primul 11. Mergi la secțiunea <b>Echipa</b> pentru a-ți așeza formația!
              </div>
            ) : (
              <div className="space-y-2">
                {starterPlayers.map((p) => renderPlayerRow(p, true))}
              </div>
            )}
          </div>

          {/* Section: Rezerve pe bancă */}
          {benchPlayers.length > 0 && (
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
                {benchPlayers.map((p) => renderPlayerRow(p, false))}
              </div>
            </div>
          )}
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
                {selectedFixture.events.map((ev) => {
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

                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-amber-400 block">
                        {p.pointsTotal} pts
                      </span>
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
          player={selectedPlayerForLive.player}
          fixture={selectedPlayerForLive.fixture}
          isCaptain={selectedPlayerForLive.isCaptain}
          isStarter={selectedPlayerForLive.isStarter}
          onClose={() => setSelectedPlayerForLive(null)}
        />
      )}
    </div>
  );
};
