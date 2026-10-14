import React, { useState } from 'react';
import { useFantasy } from '../../context/FantasyContext';
import { formatCurrency } from '../../utils/scoringEngine';
import {
  Shield,
  Users,
  Coins,
  ArrowRight,
  TrendingUp,
  UserPlus,
  UserMinus,
  Sparkles,
  Share2,
  Copy,
  Check,
  Filter,
  DollarSign,
  Trophy,
} from 'lucide-react';

export const ClubDashboardView: React.FC = () => {
  const {
    user,
    squadTotalValue,
    squadCount,
    newsArticles,
    leagueSettings,
    leagueMembers,
  } = useFantasy();

  const [feedFilter, setFeedFilter] = useState<'all' | 'transfers' | 'members'>('all');
  const [copiedCode, setCopiedCode] = useState(false);

  const leagueCode = leagueSettings?.leagueCode || 'SUP-2025';
  const leagueName = leagueSettings?.leagueName || 'Superliga România';

  const handleCopyLeagueCode = () => {
    navigator.clipboard?.writeText(leagueCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filter news feed
  const filteredFeed = newsArticles.filter((item) => {
    if (feedFilter === 'transfers') {
      return item.tag === 'TRANSFER' || item.tag === 'RECORD' || item.tag === 'CLAUZĂ ACTIVATĂ';
    }
    if (feedFilter === 'members') {
      return (
        item.summary.toLowerCase().includes('intrat') ||
        item.summary.toLowerCase().includes('părăsit') ||
        item.summary.toLowerCase().includes('fondat') ||
        item.title.toLowerCase().includes('lig')
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* ================= TOP SECTION: CLUB PROFILE & STATS ================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
        {/* Row 1: Profile picture, Club name, and quick league badge */}
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <img
              src={user.avatar}
              alt={user.teamName}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-emerald-500/40 p-0.5 bg-slate-800 shadow-md"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
              <Shield className="w-2.5 h-2.5 text-slate-950 fill-current" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Club Oficial
              </span>
              <span className="text-[10px] text-slate-400 font-semibold truncate">
                Manager: {user.name}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white truncate tracking-tight mt-0.5">
              {user.teamName}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 truncate">
              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{leagueName}</span>
              <span className="text-slate-600">·</span>
              <button
                onClick={handleCopyLeagueCode}
                className="text-emerald-400 font-mono font-bold hover:underline inline-flex items-center gap-1 shrink-0"
                title="Copiază codul ligii"
              >
                <span>{leagueCode}</span>
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Valoare Lot & Număr Jucători Lot (Cerința specifică de afișare la Club) */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Valoare lot */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/90 shadow-inner">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Valoare Lot</span>
            </div>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-400 block tracking-tight">
              {formatCurrency(squadTotalValue)}
            </span>
          </div>

          {/* Număr jucători lot */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/90 shadow-inner">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Număr Jucători</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-black font-mono text-white">
                {squadCount}
              </span>
              <span className="text-xs text-slate-500 font-bold font-mono">/ 16 maxim</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= SECOND SECTION: MINIMALIST NEWS FEED ================= */}
      <div className="space-y-3">
        {/* Feed Header with Quick Filter Chips */}
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-black uppercase text-white tracking-wide">
              Activitate &amp; News Feed Ligă
            </h2>
            <span className="text-[10px] text-slate-400">
              Transferuri recente și membri care au intrat sau părăsit liga
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-[10px] font-bold">
            <button
              onClick={() => setFeedFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                feedFilter === 'all' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Toate
            </button>
            <button
              onClick={() => setFeedFilter('transfers')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                feedFilter === 'transfers' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Transferuri
            </button>
            <button
              onClick={() => setFeedFilter('members')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                feedFilter === 'members' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Membri
            </button>
          </div>
        </div>

        {/* Minimalist News List */}
        <div className="space-y-2">
          {filteredFeed.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/50 border border-slate-800 rounded-3xl text-slate-500 text-xs">
              Nicio activitate în această categorie momentan.
            </div>
          ) : (
            filteredFeed.map((item) => {
              const isTransfer = item.tag === 'TRANSFER' || item.tag === 'RECORD' || item.tag === 'CLAUZĂ ACTIVATĂ';
              const isJoin = item.summary.toLowerCase().includes('intrat') || item.summary.toLowerCase().includes('alăturat') || item.summary.toLowerCase().includes('fondat');
              const isLeave = item.summary.toLowerCase().includes('părăsit') || item.summary.toLowerCase().includes('eliminat');

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      {isTransfer && (
                        <span className="px-2 py-0.5 rounded-full font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          TRANSFER
                        </span>
                      )}
                      {isJoin && (
                        <span className="px-2 py-0.5 rounded-full font-extrabold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                          <UserPlus className="w-2.5 h-2.5" />
                          MEMBRU NOU
                        </span>
                      )}
                      {isLeave && (
                        <span className="px-2 py-0.5 rounded-full font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <UserMinus className="w-2.5 h-2.5" />
                          A PĂRĂSIT LIGA
                        </span>
                      )}
                      {!isTransfer && !isJoin && !isLeave && (
                        <span className="px-2 py-0.5 rounded-full font-extrabold bg-slate-800 text-slate-300">
                          {item.tag}
                        </span>
                      )}
                      <span className="text-slate-400 font-bold truncate max-w-[140px] sm:max-w-none">
                        {item.title}
                      </span>
                    </div>

                    <span className="text-slate-500 font-mono shrink-0">
                      {item.date}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-snug">
                    {item.summary}
                  </p>

                  {/* Transfer Details Chip if applicable */}
                  {isTransfer && item.amount && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] font-mono">
                      <span className="text-slate-400">Sumă tranzacție:</span>
                      <span className="font-bold text-emerald-400">{formatCurrency(item.amount)}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
