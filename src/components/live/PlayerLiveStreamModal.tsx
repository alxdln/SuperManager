import React, { useState } from 'react';
import { Player, Fixture, MatchLiveEvent, PlayerPosition } from '../../types/football';
import { SUPERLIGA_CLUBS } from '../../data/superligaData';
import { formatCurrency, LIVE_SCORING_CATEGORIES } from '../../utils/scoringEngine';
import { X, Activity, Flame, Shield, Award, AlertCircle, Clock, CheckCircle2, ChevronRight, BookOpen } from 'lucide-react';

interface PlayerLiveStreamModalProps {
  player: Player;
  fixture?: Fixture;
  isCaptain: boolean;
  isStarter: boolean;
  onClose: () => void;
}

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

export const PlayerLiveStreamModal: React.FC<PlayerLiveStreamModalProps> = ({
  player,
  fixture,
  isCaptain,
  isStarter,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'player' | 'match' | 'rules'>('player');
  const [selectedRuleCategory, setSelectedRuleCategory] = useState<string>('Pase & Atac');

  const homeClub = SUPERLIGA_CLUBS.find((c) => c.id === fixture?.homeClubId);
  const awayClub = SUPERLIGA_CLUBS.find((c) => c.id === fixture?.awayClubId);
  const playerClub = SUPERLIGA_CLUBS.find((c) => c.id === player.clubId);

  const posFullName = fullPosMap[player.position];
  const posStyle = posColorMap[player.position];

  // Events involving this specific player
  const playerEvents = fixture?.events?.filter((ev) => ev.playerId === player.id) || [];

  // Points calculation
  const basePoints = player.pointsMatchday;
  const multiplier = isCaptain ? 2 : 1;
  const totalEarned = basePoints * multiplier;

  const getEventIcon = (type: MatchLiveEvent['type']) => {
    switch (type) {
      // Pase & Atac
      case 'goal': return '⚽';
      case 'assist': return '🎯';
      case 'shot_on_target': return '🔥';
      case 'shot_missed': return '💨';
      case 'key_pass': return '✨';
      case 'pass_forward': return '↗️';
      case 'long_pass': return '📡';
      case 'cross_successful': return '💫';
      case 'dribble_success': return '🕺';
      case 'dispossessed': return '⚠️';
      case 'pass_error': return '❌';
      case 'big_chance_missed': return '😱';
      case 'penalty_won': return '🌟';
      case 'penalty_missed': return '🤦';

      // Dueluri & Apărare
      case 'tackle': return '🛡️';
      case 'clearance': return '🥊';
      case 'interception':
      case 'recovery': return '🧱';
      case 'shot_blocked': return '🛑';
      case 'duel_won': return '💪';
      case 'duel_lost': return '📉';
      case 'aerial_won': return '🦘';
      case 'aerial_lost': return '⬇️';
      case 'goal_line_clearance': return '🏰';
      case 'dribbled_past': return '🔄';
      case 'error_lead_to_goal': return '💥';

      // Disciplină
      case 'foul': return '🚷';
      case 'foul_drawn': return '🤕';
      case 'penalty_conceded': return '⛔';
      case 'yellow_card': return '🟨';
      case 'red_card': return '🟥';

      // Portar
      case 'save':
      case 'save_in_box': return '🧤';
      case 'punch': return '👊';
      case 'keeper_sweeper': return '🏃';
      case 'high_claim': return '👐';
      case 'clean_sheet_bonus': return '🏰';

      // Meci
      case 'match_won': return '🏆';
      case 'match_draw': return '🤝';
      case 'match_lost': return '💔';
      case 'starter_bonus': return '⭐';
      case 'substitute_in_bonus': return '🔄';
      case 'minutes_bonus': return '⏱️';

      default: return '⚡';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[90vh] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Mobile handle */}
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto my-2 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Flux Evenimente Live &amp; Puncte</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Player Header Banner */}
        <div className="p-4 bg-gradient-to-b from-slate-800/80 to-slate-900/60 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={player.avatar}
                  alt={player.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=05df72&bold=true`;
                  }}
                />
                {isCaptain && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-full shadow-lg border border-amber-300">
                    👑 C
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${posStyle.bg} ${posStyle.text}`}>
                    {posFullName}
                  </span>
                  <h3 className="text-base font-black uppercase tracking-tight text-white">{player.name}</h3>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span className="font-semibold text-slate-300">{playerClub?.name}</span>
                  <span>·</span>
                  <span className={isStarter ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {isStarter ? 'Titular' : 'Rezervă'}
                  </span>
                  {isCaptain && (
                    <>
                      <span>·</span>
                      <span className="text-amber-400 font-bold">Căpitan (x2)</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Matchday Points KPI Badge */}
            <div className="text-right bg-slate-950/70 border border-slate-800 p-2.5 rounded-2xl">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                Puncte Etapă
              </span>
              <div className="flex items-baseline justify-end gap-1">
                <span className="font-mono text-xl font-black text-amber-400">
                  {totalEarned >= 0 ? `+${totalEarned}` : totalEarned}
                </span>
                <span className="text-xs font-bold text-slate-400">pts</span>
              </div>
              {isCaptain && (
                <span className="text-[9px] text-amber-300 font-mono block">
                  ({basePoints}p x 2 Căpitan)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Match Scoreboard Strip */}
        {fixture ? (
          <div className="px-4 py-3 bg-slate-950/50 border-b border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="truncate max-w-[200px]">{homeClub?.stadium || 'Superliga Arena'}</span>
              {fixture.isLive ? (
                <span className="flex items-center gap-1 text-rose-400 font-mono font-bold text-[11px] bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Minutul {fixture.minute}&apos; (LIVE)
                </span>
              ) : fixture.isFinished ? (
                <span className="text-slate-400 font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded-full">
                  Meci Încheiat (Final)
                </span>
              ) : (
                <span className="text-emerald-400 text-[11px] bg-slate-800 px-2 py-0.5 rounded-full">
                  Programat {fixture.scheduledTime}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] text-white shrink-0 shadow"
                  style={{ backgroundColor: homeClub?.logoColor || '#333' }}
                >
                  {homeClub?.badgeText || 'H'}
                </div>
                <span className="text-xs font-bold text-white truncate">{homeClub?.shortName || homeClub?.name}</span>
              </div>

              <div className="font-mono font-black text-lg text-white px-3 tracking-wider shrink-0">
                {fixture.isLive || fixture.isFinished ? `${fixture.homeScore} - ${fixture.awayScore}` : 'VS'}
              </div>

              <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                <span className="text-xs font-bold text-white truncate text-right">{awayClub?.shortName || awayClub?.name}</span>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] text-white shrink-0 shadow"
                  style={{ backgroundColor: awayClub?.logoColor || '#555' }}
                >
                  {awayClub?.badgeText || 'A'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 text-center text-xs text-slate-400 bg-slate-950/50 border-b border-slate-800">
            Niciun meci programat în această etapă pentru echipa fotbalistului.
          </div>
        )}

        {/* Modal Inner Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-4 pt-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('player')}
            className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'player'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Evenimentele Lui ({playerEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('match')}
            className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'match'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> Cronologie Meci ({fixture?.events?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'rules'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Grilă Puncte Live
          </button>
        </div>

        {/* Scrollable Events Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'player' && (
            <>
              {playerEvents.length > 0 ? (
                <div className="space-y-2.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Acțiuni Înregistrate în Timp Real
                  </span>
                  {playerEvents.map((ev) => {
                    const eventPoints = ev.pointsChange * multiplier;
                    return (
                      <div
                        key={ev.id}
                        className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/70 flex items-start justify-between gap-3 shadow-sm hover:border-slate-600 transition-colors"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="font-mono text-xs font-bold text-amber-400 bg-slate-950/90 border border-slate-800 px-2 py-0.5 rounded-lg shrink-0 mt-0.5">
                            {ev.minute}&apos;
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-base">{getEventIcon(ev.type)}</span>
                              <span className="text-xs font-bold text-white capitalize">
                                {ev.type.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5 leading-snug">{ev.description}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`font-mono text-xs font-bold px-2 py-0.5 rounded-lg block ${
                              eventPoints >= 0
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {eventPoints >= 0 ? `+${eventPoints}` : eventPoints} pts
                          </span>
                          {isCaptain && (
                            <span className="text-[9px] text-amber-300 font-mono block mt-0.5">x2 (C)</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-slate-800/30 border border-dashed border-slate-700 text-center space-y-2">
                  <Activity className="w-7 h-7 text-emerald-400 mx-auto animate-pulse" />
                  <h4 className="text-xs font-bold text-white">Jucător activ pe teren</h4>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    {fixture?.isLive
                      ? `Meciul este în desfășurare (minutul ${fixture.minute}'). Toate acțiunile fotbalistului (pase cheie, șuturi, deposedări, goluri) vor genera puncte în timp real.`
                      : fixture?.isFinished
                      ? 'Meciul s-a încheiat. Punctajul oficial obținut este calculat în clasamentul etapei.'
                      : `Meciul este programat la ${fixture?.scheduledTime || 'această etapă'}. Punctajul va porni automat la fluierul de start.`}
                  </p>
                </div>
              )}

              {/* Quick Preview Scoring Matrix for Position */}
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Puncte Cheie Poziție ({posFullName})
                  </span>
                  <button
                    onClick={() => setActiveTab('rules')}
                    className="text-[10px] text-emerald-400 hover:underline font-bold"
                  >
                    Vezi toate regulile →
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span>⚽ Gol marcat</span>
                    <span className="font-mono text-emerald-400 font-bold">+50p</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span>🎯 Pasă de gol</span>
                    <span className="font-mono text-emerald-400 font-bold">+30p</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span>🔥 Șut pe poartă</span>
                    <span className="font-mono text-emerald-400 font-bold">+10p</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span>🛡️ Deposedare / Int.</span>
                    <span className="font-mono text-emerald-400 font-bold">+5p</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'match' && (
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Cronologia Meciului
              </span>
              {fixture?.events && fixture.events.length > 0 ? (
                fixture.events.map((ev) => {
                  const isThisPlayer = ev.playerId === player.id;
                  return (
                    <div
                      key={ev.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        isThisPlayer
                          ? 'bg-emerald-950/40 border-emerald-500/60 text-white font-semibold'
                          : 'bg-slate-800/40 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-bold text-amber-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                          {ev.minute}&apos;
                        </span>
                        <span className="truncate">{ev.description}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 ml-2 shrink-0">
                        {ev.pointsChange >= 0 ? `+${ev.pointsChange}` : ev.pointsChange}p
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  Nu sunt acțiuni înregistrate încă pentru acest meci.
                </div>
              )}
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {LIVE_SCORING_CATEGORIES.map((cat) => (
                  <button
                    key={cat.category}
                    onClick={() => setSelectedRuleCategory(cat.category)}
                    className={`py-1 px-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      selectedRuleCategory === cat.category
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.category}</span>
                  </button>
                ))}
              </div>

              {/* Rules List for Selected Category */}
              {(() => {
                const cur = LIVE_SCORING_CATEGORIES.find((c) => c.category === selectedRuleCategory);
                if (!cur) return null;
                return (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      {cur.icon} {cur.category} — Puncte per Acțiune
                    </span>
                    <div className="space-y-1">
                      {cur.rules.map((r, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-850 border border-slate-800 text-xs"
                        >
                          <span className="text-slate-200 font-medium">{r.label}</span>
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded-lg ${
                              r.type === 'pos'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : r.type === 'neg'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {r.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
};
