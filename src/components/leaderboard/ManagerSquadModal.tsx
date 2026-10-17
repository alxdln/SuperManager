import React, { useState } from 'react';
import { LeagueMember, Player } from '../../types/football';
import { useFantasy } from '../../context/FantasyContext';
import { SUPERLIGA_CLUBS } from '../../data/superligaData';
import { formatCurrency, getPositionBadge } from '../../utils/scoringEngine';
import { PlayerDetailModal } from '../player/PlayerDetailModal';
import { getPlayerDisplayAvatar } from '../../utils/playerAvatar';
import { X, Trophy, Flame, Award, Shield, User } from 'lucide-react';

interface ManagerSquadModalProps {
  member: LeagueMember | null;
  onClose: () => void;
}

export const ManagerSquadModal: React.FC<ManagerSquadModalProps> = ({ member, onClose }) => {
  const { players, user } = useFantasy();
  const [selectedPlayerForDetail, setSelectedPlayerForDetail] = useState<Player | null>(null);

  if (!member) return null;

  const isMe = member.id === user.id;
  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Calculate sum of points from starting lineup
  let calculatedLineupPoints = 0;
  const startingLineupWithPlayers = member.startingLineup.map((slot) => {
    const player = playerMap.get(slot.playerId);
    const pts = player ? player.pointsMatchday * (slot.isCaptain ? 2 : 1) : 0;
    calculatedLineupPoints += pts;
    return {
      ...slot,
      player,
      matchdayPoints: pts,
    };
  });

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
                Locul #{member.rank}
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
              Manager: {member.name} · Formație {member.formation || '4-3-3'}
            </span>
          </div>
        </div>

        {/* Gameweek Points Summary Strip */}
        <div className="grid grid-cols-2 gap-2 my-3.5 p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Punctaj Total în Etapă
            </span>
            <div className="flex items-center gap-1 font-mono font-black text-amber-400 text-lg mt-0.5">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>{member.matchdayPoints} pts</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Valoare Totală Lot
            </span>
            <span className="font-mono font-bold text-emerald-400 text-base block mt-0.5">
              {formatCurrency(member.squadValue)}
            </span>
          </div>
        </div>

        {/* Lineup Players List with Matchday Points */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-bold uppercase tracking-wider mb-1">
            <span>Echipa de Start (Titulari)</span>
            <span className="text-[11px] text-slate-400 font-normal">
              Apasă pe jucător pentru profil
            </span>
          </div>

          <div className="space-y-1.5">
            {startingLineupWithPlayers.map((item, idx) => {
              const player = item.player;
              const club = player ? SUPERLIGA_CLUBS.find((c) => c.id === player.clubId) : null;
              const badge = player ? getPositionBadge(player.position) : null;

              return (
                <div
                  key={idx}
                  onClick={() => player && setSelectedPlayerForDetail(player)}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 font-mono font-bold text-[10px] px-1 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-slate-300 text-center shrink-0">
                      {item.slotLabel}
                    </span>

                    {player ? (
                      <div className="relative shrink-0">
                        <img
                          src={getPlayerDisplayAvatar(player, user.membership)}
                          alt={player.name}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-700 bg-slate-950"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=05df72&bold=true`;
                          }}
                        />
                        {item.isCaptain && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 font-black text-[8px] flex items-center justify-center shadow">
                            C
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                        <User className="w-4 h-4" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white truncate block">
                          {player ? player.name : 'Post Liber'}
                        </span>
                        {item.isCaptain && (
                          <span className="text-[9px] font-bold px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Căpitan 2x
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {club?.shortName || 'Superliga'} · {player ? formatCurrency(player.marketValue) : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-sm text-amber-400 block">
                      +{item.matchdayPoints} pts
                    </span>
                    <span className="text-[9px] text-slate-500 block">în meci</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Player Detail if selected */}
        {selectedPlayerForDetail && (
          <PlayerDetailModal
            player={selectedPlayerForDetail}
            onClose={() => setSelectedPlayerForDetail(null)}
          />
        )}
      </div>
    </div>
  );
};
