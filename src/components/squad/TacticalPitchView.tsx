import React, { useState } from 'react';
import { useFantasy } from '../../context/FantasyContext';
import { FORMATIONS } from '../../data/formations';
import { TacticalFormation, Player, PlayerPosition } from '../../types/football';
import { formatCurrency, getPositionBadge } from '../../utils/scoringEngine';
import { PlayerSelectionDrawer } from './PlayerSelectionDrawer';
import { PlayerDetailModal } from '../player/PlayerDetailModal';
import {
  ShieldAlert,
  Award,
  ChevronDown,
  UserPlus,
  Flame,
  Sparkles,
  Crown,
  AlertTriangle,
  CheckCircle2,
  Users,
  Shield,
} from 'lucide-react';
import { SUPERLIGA_CLUBS } from '../../data/superligaData';

export const TacticalPitchView: React.FC = () => {
  const {
    squad,
    players,
    changeFormation,
    assignPlayerToSlot,
    removePlayerFromSlot,
    setCaptain,
    squadPointsMatchday,
    squadTotalValue,
    squadCount,
    gkCount,
    emptyStarterSlotsCount,
    emptySlotsPenalty,
    isSquadValid,
  } = useFantasy();

  const [activeSlot, setActiveSlot] = useState<{
    slotId: string;
    slotLabel: string;
    position: PlayerPosition;
    playerId: string | null;
  } | null>(null);

  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<Player | null>(null);
  const [showFormationMenu, setShowFormationMenu] = useState(false);

  const currentFormationConfig = FORMATIONS[squad.formation];
  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Bench players
  const benchPlayers = squad.benchPlayerIds
    .map((id) => playerMap.get(id))
    .filter(Boolean) as Player[];

  const captainPlayer = squad.captainPlayerId ? playerMap.get(squad.captainPlayerId) : null;

  return (
    <div className="flex flex-col gap-3.5 pb-20">
      {/* Top Tactical Bar */}
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
            Formație Activă
          </span>
          <div className="relative inline-block mt-0.5">
            <button
              onClick={() => setShowFormationMenu(!showFormationMenu)}
              className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-sm font-bold text-white transition-all shadow-sm"
            >
              <span className="text-emerald-400 font-mono text-base">{squad.formation}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Formation Dropdown (Fără descrieri, sortat 3 -> 4 -> 5 fundași) */}
            {showFormationMenu && (
              <div className="absolute left-0 mt-2 w-36 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-40 p-1.5 space-y-1">
                {(Object.keys(FORMATIONS) as TacticalFormation[])
                  .sort((a, b) => {
                    const defA = parseInt(a.charAt(0), 10);
                    const defB = parseInt(b.charAt(0), 10);
                    if (defA !== defB) return defA - defB;
                    return a.localeCompare(b);
                  })
                  .map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        changeFormation(f);
                        setShowFormationMenu(false);
                      }}
                      className={`w-full text-center px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors ${
                        squad.formation === f
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-mono text-sm font-bold">{f}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Squad Matchday KPI */}
        <div className="flex items-center gap-2 text-right">
          <div className="p-2 px-3 rounded-2xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Puncte Etapă</span>
            <div className="flex items-center justify-end gap-1 font-mono font-bold text-amber-400 text-base">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>{squadPointsMatchday}</span>
            </div>
            {emptySlotsPenalty > 0 && (
              <span className="text-[9px] font-mono text-rose-400 block -mt-0.5">
                -{emptySlotsPenalty}p penalizare
              </span>
            )}
          </div>

          <div className="p-2 px-3 rounded-2xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Valoare Lot</span>
            <span className="font-mono font-bold text-emerald-400 text-base block">
              {formatCurrency(squadTotalValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Squad Status & Limits Strip (Max 16, Min 11, Min 1 GK) */}
      <div className="flex items-center justify-between p-2.5 px-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-300 font-medium">
            Lot: <b className="font-mono text-white">{squadCount}/16</b>{' '}
            <span className="text-slate-500 text-[11px]">(min. 11 · min. 1 portar)</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono flex items-center gap-1 border ${
              gkCount >= 1
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
            }`}
          >
            <Shield className="w-3 h-3" />
            {gkCount} {gkCount === 1 ? 'Portar' : 'Portari'}
          </span>

          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isSquadValid
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            {isSquadValid ? 'Lot Valid ✓' : 'Reguli Lot Incomplete'}
          </span>
        </div>
      </div>

      {/* Empty Starter Slots Warning Banner (-100p per slot) */}
      {emptyStarterSlotsCount > 0 && (
        <div className="p-2.5 px-3 rounded-2xl bg-gradient-to-r from-rose-950/60 to-rose-900/30 border border-rose-600/50 flex items-center justify-between text-xs text-rose-200 shadow-sm animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <b>{emptyStarterSlotsCount} posturi neocupate!</b> Penalizare activă: -{emptySlotsPenalty} puncte la startul meciurilor!
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-600/40 text-white border border-rose-400/50 shrink-0">
            -{emptySlotsPenalty}p
          </span>
        </div>
      )}

      {/* Active Captain Banner (x2 points at final whistle) */}
      <div className="p-2.5 px-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            👑 Căpitanul face <b>x2 la punctajul normal</b> după fluierul final.
            {captainPlayer && (
              <span className="ml-1.5 font-bold text-amber-300">
                (Activ: {captainPlayer.lastName || captainPlayer.name})
              </span>
            )}
          </span>
        </div>
        {captainPlayer && (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-400 text-slate-950 shrink-0">
            2x BONUS
          </span>
        )}
      </div>

      {/* Realistic Grass Soccer Pitch Container */}
      <div className="relative w-full aspect-[4/5] sm:aspect-[4/4.8] max-w-xl mx-auto rounded-3xl soccer-pitch-pattern border-2 border-emerald-900/80 shadow-2xl overflow-hidden p-3 select-none">
        {/* Pitch Markings SVG Overlay */}
        <div className="absolute inset-2 border-2 pitch-line rounded-2xl pointer-events-none opacity-40">
          {/* Halfway line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40" />
          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-white/40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/60" />
          {/* Top Penalty Area */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-24 border-b-2 border-x-2 border-white/40 rounded-b-lg" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-10 border-b-2 border-x-2 border-white/40 rounded-b-sm" />
          {/* Bottom Penalty Area */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-44 h-24 border-t-2 border-x-2 border-white/40 rounded-t-lg" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-10 border-t-2 border-x-2 border-white/40 rounded-t-sm" />
        </div>

        {/* Players on Pitch */}
        {currentFormationConfig.slots.map((slot) => {
          const playerId = squad.startingSlots[slot.slotId] || null;
          const player = playerId ? playerMap.get(playerId) : null;
          const isCaptain = squad.captainPlayerId === playerId;
          const badge = getPositionBadge(slot.position);

          return (
            <div
              key={slot.slotId}
              style={{
                position: 'absolute',
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="z-10 flex flex-col items-center"
            >
              {player ? (
                <div
                  onClick={() => setSelectedPlayerForModal(player)}
                  className="group relative flex flex-col items-center cursor-pointer transition-transform active:scale-95 hover:scale-105"
                >
                  {/* Captaincy Golden Crown Badge */}
                  {isCaptain && (
                    <span
                      title="Căpitan Activ (x2 puncte după fluierul final)"
                      className="absolute -top-2 -right-1.5 z-20 w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-lg ring-1 ring-amber-200"
                    >
                      C
                    </span>
                  )}

                  {/* Status Indicator */}
                  {player.status === 'injured' && (
                    <span className="absolute -top-1 -left-1 z-20 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md ring-1 ring-rose-400">
                      <ShieldAlert className="w-2.5 h-2.5" />
                    </span>
                  )}
                  {player.status === 'suspended' && (
                    <span className="absolute -top-1 -left-1 z-20 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-md ring-1 ring-amber-300">
                      <ShieldAlert className="w-2.5 h-2.5" />
                    </span>
                  )}

                  {/* Avatar / Shirt Circle (poza exact deasupra numelui) */}
                  <div className="relative z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full p-0.5 bg-gradient-to-b from-white/90 to-slate-800 shadow-xl border-2 border-slate-900/80 overflow-hidden group-hover:scale-105 transition-transform">
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className="w-full h-full object-cover rounded-full bg-slate-950"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=05df72&bold=true`;
                      }}
                    />
                  </div>

                  {/* Player Name Pill (exact sub poză, fără distanță) */}
                  <div className="-mt-1 px-[5px] pb-[2px] pt-0.5 bg-slate-950/95 backdrop-blur-md rounded-lg border border-slate-700/90 shadow-md text-center max-w-[92px] sm:max-w-[110px] truncate relative z-0">
                    <span className="text-[15px] font-bold italic text-white block truncate leading-tight tracking-tight px-[3px]">
                      {player.lastName || player.name}
                    </span>
                  </div>

                  {/* Schimbă Titular (mutat sub nume în locul badge-ului de puncte, puțin mai mare) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSlot({
                        slotId: slot.slotId,
                        slotLabel: slot.label,
                        position: slot.position,
                        playerId,
                      });
                    }}
                    className="mt-0 px-2 py-[3px] rounded-full bg-slate-900/95 hover:bg-emerald-500 border border-slate-600/90 hover:border-emerald-400 text-slate-200 hover:text-slate-950 flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer group/swap"
                    title="Schimbă titular"
                  >
                    <span className="text-sm font-black leading-none select-none">⇄</span>
                  </button>

                  {/* Quick Captain Selector Button if not captain */}
                  {!isCaptain && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCaptain(player.id);
                      }}
                      className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-slate-800 border border-amber-400/80 text-amber-300 text-[9px] font-black flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-amber-400 hover:text-slate-950 transition-all shadow"
                      title="Setează Căpitan (x2)"
                    >
                      C
                    </button>
                  )}
                </div>
              ) : (
                /* Empty Slot Placeholder (-100p penalty rule) */
                <button
                  onClick={() =>
                    setActiveSlot({
                      slotId: slot.slotId,
                      slotLabel: slot.label,
                      position: slot.position,
                      playerId: null,
                    })
                  }
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-dashed border-rose-500/70 bg-rose-950/30 backdrop-blur-sm flex items-center justify-center text-rose-300 group-hover:border-rose-400 group-hover:text-white transition-colors shadow">
                    <UserPlus className="w-4 h-4" />
                    <span className="absolute -top-1.5 -right-1.5 text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-rose-600 text-white shadow ring-1 ring-rose-400">
                      -100p
                    </span>
                  </div>
                  <span className="-mt-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/80 border border-rose-500/40 text-rose-300 relative z-0">
                    {slot.position === 'GK' ? 'P' : slot.position === 'DEF' ? 'D' : slot.position === 'MID' ? 'M' : 'A'}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Bench Reserves Section */}
      <div className="mt-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Banca de Rezerve
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              ({benchPlayers.length} jucători)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Apasă pe un jucător pentru detalii
          </span>
        </div>

        {benchPlayers.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-400 bg-slate-800/20 rounded-xl border border-dashed border-slate-800">
            Nu ai jucători pe bancă. Poți cumpăra jucători de pe piața de transferuri!
          </div>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto pb-1.5 pt-0.5">
            {benchPlayers.map((player) => {
              const badge = getPositionBadge(player.position);
              const club = SUPERLIGA_CLUBS.find((c) => c.id === player.clubId);

              return (
                <div
                  key={player.id}
                  onClick={() => setSelectedPlayerForModal(player)}
                  className="shrink-0 w-28 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-all cursor-pointer flex flex-col items-center text-center group"
                >
                  <div className="relative">
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-700 bg-slate-900"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=05df72&bold=true`;
                      }}
                    />
                  </div>

                  <span className="text-xs font-bold text-white mt-1.5 truncate w-full">
                    {player.lastName || player.name}
                  </span>

                  {/* Badge poziție sub nume: Portar, Atacant, Mijlocas, Fundas */}
                  <span className={`mt-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text}`}>
                    {player.position === 'GK'
                      ? 'Portar'
                      : player.position === 'DEF'
                      ? 'Fundas'
                      : player.position === 'MID'
                      ? 'Mijlocas'
                      : 'Atacant'}
                  </span>

                  <span className="text-[10px] text-slate-400 truncate w-full mt-0.5">
                    {club?.shortName}
                  </span>

                  <div className="flex items-center gap-1 mt-1 font-mono text-[10px]">
                    <span className="text-amber-400 font-bold">{player.pointsMatchday}p</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-emerald-400">{formatCurrency(player.marketValue)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drawer for slot replacement */}
      {activeSlot && (
        <PlayerSelectionDrawer
          slotId={activeSlot.slotId}
          slotLabel={activeSlot.slotLabel}
          requiredPosition={activeSlot.position}
          currentSlotPlayerId={activeSlot.playerId}
          onClose={() => setActiveSlot(null)}
          onSelectPlayer={(pId) => assignPlayerToSlot(activeSlot.slotId, pId)}
          onRemovePlayer={() => removePlayerFromSlot(activeSlot.slotId)}
        />
      )}

      {/* Full Player Profile Modal */}
      {selectedPlayerForModal && (
        <PlayerDetailModal
          player={selectedPlayerForModal}
          onClose={() => setSelectedPlayerForModal(null)}
        />
      )}
    </div>
  );
};
