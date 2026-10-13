import React, { useState } from 'react';
import { useFantasy } from '../../context/FantasyContext';
import { LeagueMember } from '../../types/football';
import { formatCurrency } from '../../utils/scoringEngine';
import { ManagerSquadModal } from './ManagerSquadModal';
import { ManagerSeasonStatsModal } from './ManagerSeasonStatsModal';
import { Trophy, Medal, Flame, Copy, Check, ChevronRight } from 'lucide-react';

export const LeaderboardView: React.FC = () => {
  const { user, leagueMembers, leagueSettings } = useFantasy();
  const [viewType, setViewType] = useState<'matchday' | 'general'>('matchday');
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedMemberForSquad, setSelectedMemberForSquad] = useState<LeagueMember | null>(null);
  const [selectedMemberForSeasonStats, setSelectedMemberForSeasonStats] = useState<LeagueMember | null>(null);

  const sortedMembers = [...leagueMembers].sort((a, b) => {
    if (viewType === 'matchday') {
      return b.matchdayPoints - a.matchdayPoints;
    }
    return b.totalPoints - a.totalPoints;
  });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(leagueSettings.leagueCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* League Header Card */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">{leagueSettings.leagueName}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Liga privată a comunității · {leagueMembers.length} Manageri înscriși
          </p>
        </div>

        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-slate-200 border border-slate-700 transition-colors"
          title="Copiază codul de invitație"
        >
          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedCode ? 'Copiat!' : leagueSettings.leagueCode}</span>
        </button>
      </div>

      {/* Leaderboard Segmented Selector */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
        <button
          onClick={() => setViewType('matchday')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            viewType === 'matchday'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Clasament Etapă Live</span>
        </button>

        <button
          onClick={() => setViewType('general')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            viewType === 'general'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Medal className="w-3.5 h-3.5" />
          <span>Clasament General Sezon</span>
        </button>
      </div>

      {/* Info hint */}
      <div className="text-[11px] text-slate-400 px-1 flex items-center justify-between">
        <span>
          {viewType === 'matchday'
            ? '💡 Apasă pe orice manager pentru a-i vedea primul 11 și punctele din etapă'
            : '💡 Apasă pe orice manager pentru evoluția și statistica punctelor pe fiecare etapă din sezon'}
        </span>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {/* 2nd place */}
        {sortedMembers[1] && (
          <div
            onClick={() => {
              if (viewType === 'general') {
                setSelectedMemberForSeasonStats(sortedMembers[1]);
              } else {
                setSelectedMemberForSquad(sortedMembers[1]);
              }
            }}
            className="flex flex-col items-center p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center mt-3 cursor-pointer hover:border-slate-700 transition-all hover:scale-102"
          >
            <span className="w-6 h-6 rounded-full bg-slate-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md mb-1.5">
              2
            </span>
            <img
              src={sortedMembers[1].avatar}
              alt={sortedMembers[1].name}
              className="w-11 h-11 rounded-full object-cover border-2 border-slate-400 mb-1"
            />
            <span className="text-xs font-bold text-white truncate w-full">{sortedMembers[1].name}</span>
            <span className="text-[10px] text-slate-400 truncate w-full">{sortedMembers[1].teamName}</span>
            <span className="font-mono font-bold text-xs text-amber-400 mt-1">
              {viewType === 'matchday' ? `${sortedMembers[1].matchdayPoints}p` : `${sortedMembers[1].totalPoints}p`}
            </span>
          </div>
        )}

        {/* 1st place */}
        {sortedMembers[0] && (
          <div
            onClick={() => {
              if (viewType === 'general') {
                setSelectedMemberForSeasonStats(sortedMembers[0]);
              } else {
                setSelectedMemberForSquad(sortedMembers[0]);
              }
            }}
            className="flex flex-col items-center p-3.5 rounded-3xl bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/60 text-center shadow-xl shadow-amber-500/10 cursor-pointer hover:scale-102 transition-all"
          >
            <span className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center shadow-md mb-1.5">
              👑
            </span>
            <img
              src={sortedMembers[0].avatar}
              alt={sortedMembers[0].name}
              className="w-13 h-13 rounded-full object-cover border-2 border-amber-400 mb-1"
            />
            <span className="text-xs font-black text-white truncate w-full">{sortedMembers[0].name}</span>
            <span className="text-[10px] text-slate-300 truncate w-full">{sortedMembers[0].teamName}</span>
            <span className="font-mono font-black text-sm text-amber-400 mt-1">
              {viewType === 'matchday' ? `${sortedMembers[0].matchdayPoints}p` : `${sortedMembers[0].totalPoints}p`}
            </span>
          </div>
        )}

        {/* 3rd place */}
        {sortedMembers[2] && (
          <div
            onClick={() => {
              if (viewType === 'general') {
                setSelectedMemberForSeasonStats(sortedMembers[2]);
              } else {
                setSelectedMemberForSquad(sortedMembers[2]);
              }
            }}
            className="flex flex-col items-center p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center mt-3 cursor-pointer hover:border-slate-700 transition-all hover:scale-102"
          >
            <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow-md mb-1.5">
              3
            </span>
            <img
              src={sortedMembers[2].avatar}
              alt={sortedMembers[2].name}
              className="w-11 h-11 rounded-full object-cover border-2 border-amber-700 mb-1"
            />
            <span className="text-xs font-bold text-white truncate w-full">{sortedMembers[2].name}</span>
            <span className="text-[10px] text-slate-400 truncate w-full">{sortedMembers[2].teamName}</span>
            <span className="font-mono font-bold text-xs text-amber-400 mt-1">
              {viewType === 'matchday' ? `${sortedMembers[2].matchdayPoints}p` : `${sortedMembers[2].totalPoints}p`}
            </span>
          </div>
        )}
      </div>

      {/* Full Leaderboard List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          {viewType === 'matchday'
            ? 'Ierarhie Etapă (Apasă pentru primul 11)'
            : 'Ierarhie Sezon (Apasă pentru evoluția pe etape)'}
        </h4>

        <div className="space-y-2">
          {sortedMembers.map((member, idx) => {
            const isMe = member.id === user.id;

            return (
              <div
                key={member.id}
                onClick={() => {
                  if (viewType === 'general') {
                    setSelectedMemberForSeasonStats(member);
                  } else {
                    setSelectedMemberForSquad(member);
                  }
                }}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer hover:border-slate-600 ${
                  isMe
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md'
                    : 'bg-slate-800/40 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-6 text-center font-mono font-bold text-xs ${
                      idx === 0
                        ? 'text-amber-400'
                        : idx === 1
                        ? 'text-slate-300'
                        : idx === 2
                        ? 'text-amber-600'
                        : 'text-slate-500'
                    }`}
                  >
                    #{idx + 1}
                  </span>

                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">{member.name}</span>
                      {isMe && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950">
                          Tu
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate">{member.teamName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Formație: {member.formation || '4-3-3'} · Lot: {formatCurrency(member.squadValue)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-amber-400 block">
                      {viewType === 'matchday' ? `${member.matchdayPoints} pts` : `${member.totalPoints} pts`}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {viewType === 'matchday'
                        ? `Total: ${member.totalPoints}p`
                        : `Etapă: +${member.matchdayPoints}p`}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal with Manager Squad & Player Matchday Points (for Matchday View) */}
      {selectedMemberForSquad && (
        <ManagerSquadModal
          member={selectedMemberForSquad}
          onClose={() => setSelectedMemberForSquad(null)}
        />
      )}

      {/* Modal with Season Gameweek-by-Gameweek Performance Stats (for General Season View) */}
      {selectedMemberForSeasonStats && (
        <ManagerSeasonStatsModal
          member={selectedMemberForSeasonStats}
          onClose={() => setSelectedMemberForSeasonStats(null)}
        />
      )}
    </div>
  );
};
