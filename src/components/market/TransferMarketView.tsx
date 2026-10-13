import React, { useState, useEffect } from 'react';
import { useFantasy } from '../../context/FantasyContext';
import { SUPERLIGA_CLUBS } from '../../data/superligaData';
import { Player, PlayerPosition, UnifiedMarketItem } from '../../types/football';
import { formatCurrency, formatFullCurrency, getPositionBadge } from '../../utils/scoringEngine';
import { PlayerDetailModal } from '../player/PlayerDetailModal';
import {
  Search,
  Store,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Tag,
  Zap,
  Check,
  X,
  RotateCcw,
  History,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Plus,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const TransferMarketView: React.FC = () => {
  const {
    user,
    players,
    squad,
    unifiedMarketItems,
    placeMarketOffer,
    withdrawMarketOffer,
    createMemberListing,
    delistPlayerFromMarket,
    acceptMemberOffer,
    refuseMemberOffer,
    transactions,
    squadCount,
    gkCount,
  } = useFantasy();

  // Top Tabs: Cumpără vs Vinde
  const [activeMainTab, setActiveMainTab] = useState<'buy' | 'sell'>('buy');

  // Search & Filter state for Cumpără tab
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<PlayerPosition | 'ALL'>('ALL');
  const [selectedClub, setSelectedClub] = useState<string>('ALL');
  const [listingTypeFilter, setListingTypeFilter] = useState<'ALL' | 'LEAGUE' | 'MEMBERS'>('ALL');

  // Input states per card in Cumpără: map of itemId -> custom bid amount
  const [customBidInputs, setCustomBidInputs] = useState<Record<string, number>>({});

  // Modals & Selling Form
  const [selectedPlayerForDetail, setSelectedPlayerForDetail] = useState<Player | null>(null);
  const [showCreateListingModal, setShowCreateListingModal] = useState(false);
  const [sellingPlayerId, setSellingPlayerId] = useState<string>('');
  const [minAskingPrice, setMinAskingPrice] = useState<number>(1000000);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // User's players
  const starters = Object.values(squad.startingSlots).filter(Boolean) as string[];
  const myPlayerIds = Array.from(new Set([...starters, ...squad.benchPlayerIds]));
  const myPlayers = players.filter((p) => myPlayerIds.includes(p.id));

  // User's listings on the market
  const myListings = unifiedMarketItems.filter((item) => item.sellerId === user.id);

  // Initialize bid inputs when items change
  useEffect(() => {
    setCustomBidInputs((prev) => {
      const updated = { ...prev };
      unifiedMarketItems.forEach((item) => {
        if (!updated[item.id]) {
          updated[item.id] = item.currentBid + 50000;
        }
      });
      return updated;
    });
  }, [unifiedMarketItems]);

  // Filter listings for Cumpără tab
  const filteredBuyItems = unifiedMarketItems.filter((item) => {
    const player = players.find((p) => p.id === item.playerId);
    if (!player) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = player.name.toLowerCase().includes(q);
      const club = SUPERLIGA_CLUBS.find((c) => c.id === player.clubId);
      const matchClub = club?.name.toLowerCase().includes(q) || club?.shortName.toLowerCase().includes(q);
      const matchSeller = item.sellerName.toLowerCase().includes(q);
      if (!matchName && !matchClub && !matchSeller) return false;
    }

    if (selectedPosition !== 'ALL' && player.position !== selectedPosition) return false;
    if (selectedClub !== 'ALL' && player.clubId !== selectedClub) return false;

    if (listingTypeFilter === 'LEAGUE' && !item.isLeagueListing) return false;
    if (listingTypeFilter === 'MEMBERS' && item.isLeagueListing) return false;

    return true;
  });

  // Calculate expiration display in hours for league listings
  const formatExpiryHours = (expiresAt: number | null): string => {
    if (!expiresAt) return 'Permanent (până la revocare)';
    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) return 'Expiră în curând';
    const totalHours = Math.ceil(remainingMs / (1000 * 60 * 60));
    if (totalHours >= 24) {
      const days = Math.floor(totalHours / 24);
      const remHours = totalHours % 24;
      return `${totalHours}h rămase (${days}z ${remHours}h)`;
    }
    return `${totalHours}h rămase`;
  };

  const handleBidSubmit = (itemId: string) => {
    const item = unifiedMarketItems.find((i) => i.id === itemId);
    if (!item) return;

    if (squadCount >= 16) {
      setActionMessage({
        text: 'Lot plin (16/16 jucători)! Conform regulamentului, lotul nu poate depăși 16 jucători. Vinde un jucător mai întâi.',
        type: 'error',
      });
      return;
    }

    const offerAmount = customBidInputs[itemId] || item.currentBid + 50000;
    const res = placeMarketOffer(itemId, offerAmount);

    if (res.success) {
      setActionMessage({ text: res.message, type: 'success' });
      confetti({
        particleCount: res.clauseTriggered ? 60 : 25,
        spread: res.clauseTriggered ? 75 : 45,
        origin: { y: 0.6 },
      });
    } else {
      setActionMessage({ text: res.message, type: 'error' });
    }
  };

  const handleWithdrawOffer = (itemId: string, offerId?: string) => {
    const res = withdrawMarketOffer(itemId, offerId);
    if (res.success) {
      setActionMessage({ text: res.message, type: 'success' });
    } else {
      setActionMessage({ text: res.message, type: 'error' });
    }
  };

  const handleLaunchMemberListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingPlayerId) {
      setActionMessage({ text: 'Alege un jucător din lot!', type: 'error' });
      return;
    }

    if (squadCount <= 11) {
      setActionMessage({
        text: 'Lot minim atins! Lotul tău nu poate scădea sub 11 jucători conform regulamentului.',
        type: 'error',
      });
      return;
    }

    const playerToSell = players.find((p) => p.id === sellingPlayerId);
    if (playerToSell && playerToSell.position === 'GK' && gkCount <= 1) {
      setActionMessage({
        text: 'Nu poți vinde singurul portar din lot! Regulamentul impune cel puțin 1 portar în echipă.',
        type: 'error',
      });
      return;
    }

    // No listing duration: stays permanently until manager cancels
    const res = createMemberListing(sellingPlayerId, minAskingPrice);
    if (res.success) {
      setShowCreateListingModal(false);
      setActionMessage({ text: res.message, type: 'success' });
      confetti({ particleCount: 40, spread: 60 });
      setActiveMainTab('sell');
    } else {
      setActionMessage({ text: res.message, type: 'error' });
    }
  };

  const handleAcceptOffer = (itemId: string, offerId?: string) => {
    const res = acceptMemberOffer(itemId, offerId);
    if (res.success) {
      setActionMessage({ text: res.message, type: 'success' });
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    } else {
      setActionMessage({ text: res.message, type: 'error' });
    }
  };

  const handleRefuseOffer = (itemId: string, offerId: string) => {
    const res = refuseMemberOffer(itemId, offerId);
    if (res.success) {
      setActionMessage({ text: res.message, type: 'success' });
    } else {
      setActionMessage({ text: res.message, type: 'error' });
    }
  };

  const handleDelistPlayer = (itemId: string) => {
    const res = delistPlayerFromMarket(itemId);
    if (res.success) {
      setActionMessage({ text: res.message, type: 'success' });
    } else {
      setActionMessage({ text: res.message, type: 'error' });
    }
  };

  // Auto clear message
  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Top Budget Header Card */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl shadow-xl flex items-center justify-between">
        <div>
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
            Buget Disponibil
          </span>
          <span className="text-2xl font-black font-mono text-emerald-400 mt-0.5 block tracking-tight">
            {formatFullCurrency(user.budget)}
          </span>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
            <span>
              Lot: <b className="text-white font-mono">{squadCount}/16</b> jucători
            </span>
            <span>·</span>
            <span className={gkCount >= 1 ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
              {gkCount} {gkCount === 1 ? 'portar' : 'portari'}
            </span>
            <span>·</span>
            <span className="text-emerald-300 font-medium">Fereastră Non-Stop</span>
          </div>
        </div>

        <button
          onClick={() => {
            if (squadCount <= 11) {
              setActionMessage({
                text: 'Lot minim atins! Lotul tău nu poate scădea sub 11 jucători conform regulamentului.',
                type: 'error',
              });
              return;
            }
            if (myPlayers.length === 0) {
              setActionMessage({ text: 'Nu ai jucători disponibili de vânzare!', type: 'error' });
              return;
            }
            const first = myPlayers[0];
            setSellingPlayerId(first.id);
            setMinAskingPrice(Math.round(first.marketValue * 1.25));
            setShowCreateListingModal(true);
          }}
          className="flex items-center gap-1.5 py-2.5 px-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all shrink-0 active:scale-95"
        >
          <Tag className="w-4 h-4" />
          <span>Scoate la Vânzare</span>
        </button>
      </div>

      {/* Main Top Navigation Tabs: Cumpără vs Vinde */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-md">
        <button
          onClick={() => setActiveMainTab('buy')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeMainTab === 'buy'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Cumpără ({unifiedMarketItems.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('sell')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 relative ${
            activeMainTab === 'sell'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Vinde ({myListings.length} listate)</span>
          {myListings.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-2 right-4" />
          )}
        </button>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-3 rounded-2xl text-xs flex items-center gap-2 border animate-in fade-in duration-150 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: CUMPĂRĂ (Marketplace with anonymous bidders and no quick bids)     */}
      {/* ========================================================================= */}
      {activeMainTab === 'buy' && (
        <div className="space-y-3">
          {/* Search & Position Filters */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Caută jucător sau club din Superliga..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {(['ALL', 'LEAGUE', 'MEMBERS'] as const).map((type) => {
                const labelMap = {
                  ALL: 'Toate Ofertele',
                  LEAGUE: '🏛️ De la Ligă (Liberi)',
                  MEMBERS: '👤 De la Manageri',
                };
                return (
                  <button
                    key={type}
                    onClick={() => setListingTypeFilter(type)}
                    className={`py-1 px-2.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                      listingTypeFilter === type
                        ? 'bg-slate-200 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {labelMap[type]}
                  </button>
                );
              })}
            </div>

            {/* Position Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-800">
              {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => setSelectedPosition(pos)}
                  className={`py-1 px-2.5 rounded-lg text-[11px] font-mono font-bold transition-all ${
                    selectedPosition === pos
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {pos === 'ALL' ? 'Toate Posturile' : pos}
                </button>
              ))}

              <div className="ml-auto shrink-0">
                <select
                  value={selectedClub}
                  onChange={(e) => setSelectedClub(e.target.value)}
                  className="py-1 px-2 bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-slate-200 focus:outline-none"
                >
                  <option value="ALL">Toate Cluburile</option>
                  {SUPERLIGA_CLUBS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.shortName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Listings List (Full-Width Cards) */}
          {filteredBuyItems.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-400 text-xs">
              Niciun fotbalist nu corespunde criteriilor de căutare selectate.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBuyItems.map((item) => {
                const player = players.find((p) => p.id === item.playerId);
                if (!player) return null;

                const club = SUPERLIGA_CLUBS.find((c) => c.id === player.clubId);
                const badge = getPositionBadge(player.position);
                const isSellerMe = item.sellerId === user.id;
                const isHighestBidderMe = item.highestBidderId === user.id;
                const currentBidVal = customBidInputs[item.id] || item.currentBid + 50000;
                const myOffersForThisItem = (item.receivedOffers || []).filter((o) => o.bidderId === user.id);

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-3xl border transition-all shadow-md space-y-3 ${
                      isSellerMe
                        ? 'bg-indigo-950/20 border-indigo-700/60'
                        : item.isLeagueListing
                        ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-900 border-amber-500/30 hover:border-amber-500/50'
                    }`}
                  >
                    {/* Header: Seller Pill & Expiration */}
                    <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            item.isLeagueListing
                              ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {item.isLeagueListing ? '🏛️ Listat de: Superliga' : `👤 Listat de: ${item.sellerName}`}
                        </span>
                        {item.isLeagueListing && (
                          <span className="text-[10px] text-slate-400 font-mono">(Jucător Liber)</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-mono font-medium text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatExpiryHours(item.expiresAt)}</span>
                      </div>
                    </div>

                    {/* Player Info Strip */}
                    <div
                      onClick={() => setSelectedPlayerForDetail(player)}
                      className="flex items-center gap-3.5 cursor-pointer group"
                    >
                      <img
                        src={player.avatar}
                        alt={player.name}
                        className="w-13 h-13 rounded-2xl object-cover border-2 border-slate-700 shadow-md bg-slate-950 group-hover:scale-105 transition-transform shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=05df72&bold=true`;
                        }}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs text-slate-400 truncate">{club?.name}</span>
                        </div>

                        <h4 className="text-base font-bold text-white mt-0.5 truncate group-hover:text-emerald-400 transition-colors">
                          {player.name}
                        </h4>

                        <div className="flex items-center gap-2 mt-0.5 text-xs">
                          <span className="font-mono text-emerald-400 font-semibold">
                            Cotă: {formatCurrency(player.marketValue)}
                          </span>
                          <span className="text-slate-500">·</span>
                          <span className="font-mono text-amber-400 font-semibold">
                            {player.pointsTotal} pts sezon
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors shrink-0" />
                    </div>

                    {/* Two KPI Blocks: Oferta Curentă & Clauză Transfer Instant (€) */}
                    <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Oferta Curentă
                        </span>
                        <span className="text-base font-black font-mono text-amber-400 block mt-0.5">
                          {formatFullCurrency(item.currentBid)}
                        </span>
                        {/* Fair-Play Anonymity Rule: Bidder identity is strictly hidden */}
                        <span className="text-[10px] text-slate-400 block truncate mt-0.5 font-medium">
                          {isHighestBidderMe ? (
                            <span className="text-emerald-400 font-bold">Oferta ta este în frunte ✓</span>
                          ) : (
                            <span className="text-slate-400">Ofertant anonim (Fair-play)</span>
                          )}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Clauză Transfer Instant (€)
                        </span>
                        <span className="text-base font-black font-mono text-emerald-400 block mt-0.5">
                          {formatFullCurrency(item.minAskingPrice)}
                        </span>
                        <span className="text-[10px] text-emerald-300 block truncate mt-0.5 flex items-center gap-1 font-medium">
                          <Zap className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Transfer instant la această sumă</span>
                        </span>
                      </div>
                    </div>

                    {/* Oferta Făcută de Manager cu buton "Retrage oferta" */}
                    {myOffersForThisItem.length > 0 && (
                      <div className="p-3 bg-slate-950/80 rounded-2xl border border-emerald-500/50 space-y-2 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Oferta Ta Înregistrată</span>
                          </span>
                          <span className="text-[10px] text-emerald-400/80 font-mono font-medium">
                            {myOffersForThisItem.length} ofertă activă
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {myOffersForThisItem.map((myOff) => (
                            <div
                              key={myOff.id}
                              className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-xl"
                            >
                              <div>
                                <span className="font-mono text-base font-black text-amber-400 block">
                                  {formatFullCurrency(myOff.amount)}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  Trimisă {myOff.time} · {myOff.amount >= item.minAskingPrice ? 'Clauză atinsă' : 'În așteptare'}
                                </span>
                              </div>

                              <button
                                onClick={() => handleWithdrawOffer(item.id, myOff.id)}
                                className="py-1.5 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/40 text-rose-300 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                                title="Retrage oferta"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Retrage oferta</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom Bid Input & Offer Action (Comenzi rapide eliminate) */}
                    {!isSellerMe ? (
                      <div className="pt-0.5">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                              €
                            </span>
                            <input
                              type="number"
                              step="50000"
                              min={item.currentBid + 10000}
                              value={currentBidVal}
                              onChange={(e) =>
                                setCustomBidInputs((prev) => ({
                                  ...prev,
                                  [item.id]: Number(e.target.value),
                                }))
                              }
                              placeholder="Introdu suma dorită..."
                              className="w-full pl-7 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <button
                            onClick={() => handleBidSubmit(item.id)}
                            className="py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Oferă Suma</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2.5 bg-indigo-950/40 rounded-xl border border-indigo-900/60 text-xs text-indigo-300">
                        <span>Aceasta este listarea ta. Gestionează ofertele în tab-ul „Vinde”.</span>
                        <button
                          onClick={() => setActiveMainTab('sell')}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[11px] hover:bg-indigo-500 transition-colors shrink-0"
                        >
                          Mergi la Vinde →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VINDE (Jucători puși pe piață cu oferte primite și lot de vânzare) */}
      {/* ========================================================================= */}
      {activeMainTab === 'sell' && (
        <div className="space-y-4">
          {/* Rules Banner for Selling */}
          <div className="p-3.5 bg-gradient-to-r from-indigo-950/50 via-slate-900 to-slate-900 border border-indigo-700/60 rounded-3xl text-xs text-slate-300 space-y-1">
            <span className="font-bold text-white block flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-indigo-400" />
              <span>Reguli Listare &amp; Vânzare Jucători</span>
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Jucătorul listat rămâne pe piață până îl scoți de pe piață. Fiecare fotbalist primește automat oferta garantată de la ligă. Poți accepta sau refuza oricând ofertele primite de la manageri.
            </p>
          </div>

          {/* Section 1: Jucătorii tăi listați pe piață */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-4 h-4 text-emerald-400" />
                <span>Jucătorii Tăi Listați pe Piață ({myListings.length})</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {myListings.length === 0 ? 'Niciun jucător activ' : 'Listări active'}
              </span>
            </div>

            {myListings.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl space-y-2">
                <p className="text-xs text-slate-400">
                  Nu ai niciun fotbalist scos pe piața de transferuri în acest moment.
                </p>
                <button
                  onClick={() => {
                    if (squadCount <= 11) {
                      setActionMessage({
                        text: 'Lot minim atins! Lotul tău nu poate scădea sub 11 jucători.',
                        type: 'error',
                      });
                      return;
                    }
                    if (myPlayers.length > 0) {
                      setSellingPlayerId(myPlayers[0].id);
                      setMinAskingPrice(Math.round(myPlayers[0].marketValue * 1.25));
                      setShowCreateListingModal(true);
                    }
                  }}
                  className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Scoate Primul Jucător la Vânzare</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myListings.map((item) => {
                  const player = players.find((p) => p.id === item.playerId);
                  if (!player) return null;

                  const club = SUPERLIGA_CLUBS.find((c) => c.id === player.clubId);
                  const badge = getPositionBadge(player.position);
                  const offers = item.receivedOffers || [];

                  return (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-900 border-2 border-indigo-700/60 rounded-3xl space-y-3 shadow-xl"
                    >
                      {/* Top Player Info */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={player.avatar}
                            alt={player.name}
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-500 bg-slate-950 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${badge.bg} ${badge.text}`}>
                                {badge.label}
                              </span>
                              <span className="text-xs text-slate-400 truncate">{club?.name}</span>
                            </div>
                            <h4 className="text-sm font-bold text-white truncate mt-0.5">{player.name}</h4>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Cotă oficială: {formatCurrency(player.marketValue)}
                            </span>
                          </div>
                        </div>

                        {/* Button: Scoate de pe piață */}
                        <button
                          onClick={() => handleDelistPlayer(item.id)}
                          className="flex items-center gap-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-300 transition-colors shrink-0"
                          title="Retrage jucătorul înapoi în lot"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Scoate de pe piață</span>
                        </button>
                      </div>

                      {/* Main Dual KPI: Oferta Curentă & Clauză Minimă Cerută */}
                      <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            Oferta Curentă
                          </span>
                          <span className="text-base font-black font-mono text-amber-400 block mt-0.5">
                            {formatFullCurrency(item.currentBid)}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Garanție ligă: {formatCurrency(item.leagueBaseOffer)}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            Clauză Transfer Instant (€)
                          </span>
                          <span className="text-base font-black font-mono text-emerald-400 block mt-0.5">
                            {formatFullCurrency(item.minAskingPrice)}
                          </span>
                          <span className="text-[10px] text-emerald-300 block mt-0.5">
                            Transfer instant la această sumă
                          </span>
                        </div>
                      </div>

                      {/* Offers List Received with Accept & Refuse Buttons */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                          <span>Oferte Primite ({offers.length}):</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            Alege oferta pe care vrei să o accepți
                          </span>
                        </div>

                        {offers.length === 0 ? (
                          <div className="p-3 bg-slate-950/40 rounded-xl text-center text-xs text-slate-400 border border-slate-800">
                            Nu ai primit încă oferte suplimentare. Ai garantată oferta ligii de {formatCurrency(item.leagueBaseOffer)}.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {offers.map((offer) => (
                              <div
                                key={offer.id}
                                className="flex items-center justify-between p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-2xl text-xs"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-amber-400 text-sm">
                                      {formatFullCurrency(offer.amount)}
                                    </span>
                                    {offer.amount >= item.minAskingPrice && (
                                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[9px]">
                                        Clauză depășită!
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 block mt-0.5">
                                    {offer.bidderName || 'Ofertă primită de la manager'} · {offer.time}
                                  </span>
                                </div>

                                {/* Right Side: Accept & Refuse Buttons */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => handleAcceptOffer(item.id, offer.id)}
                                    className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1 active:scale-95"
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>Acceptă</span>
                                  </button>

                                  <button
                                    onClick={() => handleRefuseOffer(item.id, offer.id)}
                                    className="py-1.5 px-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors flex items-center gap-1 active:scale-95"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Refuză</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Jucători Disponibili din Lot pentru Vânzare */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-indigo-400" />
                <span>Fotbaliști Disponibili în Lotul Tău ({myPlayers.length})</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Apasă pentru a lista un fotbalist
              </span>
            </div>

            <div className="space-y-2">
              {myPlayers.map((player) => {
                const club = SUPERLIGA_CLUBS.find((c) => c.id === player.clubId);
                const badge = getPositionBadge(player.position);
                const isAlreadyListed = myListings.some((l) => l.playerId === player.id);

                return (
                  <div
                    key={player.id}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={player.avatar}
                        alt={player.name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700 bg-slate-950 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold px-1 py-0.2 rounded border ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs font-bold text-white truncate">{player.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {club?.shortName} · Cotă de piață: {formatCurrency(player.marketValue)}
                        </span>
                      </div>
                    </div>

                    {isAlreadyListed ? (
                      <span className="px-2.5 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold shrink-0">
                        Listat pe Piață ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          if (squadCount <= 11) {
                            setActionMessage({
                              text: 'Lot minim atins! Lotul tău nu poate scădea sub 11 jucători conform regulamentului.',
                              type: 'error',
                            });
                            return;
                          }
                          if (player.position === 'GK' && gkCount <= 1) {
                            setActionMessage({
                              text: 'Nu poți vinde singurul portar din lot! Regulamentul impune cel puțin 1 portar în echipă.',
                              type: 'error',
                            });
                            return;
                          }
                          setSellingPlayerId(player.id);
                          setMinAskingPrice(Math.round(player.marketValue * 1.25));
                          setShowCreateListingModal(true);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shrink-0 shadow-sm"
                      >
                        Scoate la Vânzare
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Istoric Tranzacții */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Istoric Tranzacții Efectuate ({transactions.length})</span>
              </h3>
            </div>

            <div className="space-y-2">
              {transactions.slice(0, 6).map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          tx.type === 'buy'
                            ? 'bg-rose-500/20 text-rose-300'
                            : tx.type === 'sell'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {tx.type === 'buy' ? 'CUMPĂRAT' : tx.type === 'sell' ? 'VÂNDUT' : 'RECOMPENSĂ'}
                      </span>
                      <span className="font-bold text-white">{tx.playerName || tx.description}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {tx.description} · {tx.date}
                    </span>
                  </div>

                  <span
                    className={`font-mono font-bold text-sm ${
                      tx.type === 'buy' ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {tx.type === 'buy' ? '-' : '+'}
                    {formatFullCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal: Scoate jucător la vânzare (FĂRĂ DURATĂ LISTARE)                     */}
      {/* ========================================================================= */}
      {showCreateListingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-400" /> Scoate Jucător la Vânzare
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Jucătorul rămâne listat permanent pe piață până îl scoți tu sau accepți o ofertă. Primești automat oferta garantată de la ligă.
            </p>

            <form onSubmit={handleLaunchMemberListing} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Selectează Jucătorul din Lot</label>
                <select
                  value={sellingPlayerId}
                  onChange={(e) => {
                    setSellingPlayerId(e.target.value);
                    const p = myPlayers.find((pl) => pl.id === e.target.value);
                    if (p) {
                      setMinAskingPrice(Math.round(p.marketValue * 1.25));
                    }
                  }}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                >
                  {myPlayers.map((p) => {
                    const isAlreadyListed = myListings.some((item) => item.playerId === p.id);
                    return (
                      <option key={p.id} value={p.id} disabled={isAlreadyListed}>
                        {p.name} ({p.position}) - Cotă: {formatCurrency(p.marketValue)}{isAlreadyListed ? ' [DEJA PE PIAȚĂ]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold text-xs">
                    Clauză Transfer Instant (€)
                  </label>
                  <span className="text-emerald-400 font-mono font-bold text-xs bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-lg">
                    {formatFullCurrency(minAskingPrice)}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={minAskingPrice ? minAskingPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '');
                      setMinAskingPrice(digitsOnly ? parseInt(digitsOnly, 10) : 0);
                    }}
                    placeholder="ex: 1.500.000"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-base font-bold focus:border-emerald-500 focus:outline-none"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">EUR</span>
                </div>
                <span className="text-[10px] text-emerald-400 mt-1 block">
                  Dacă un manager oferă această sumă ({formatFullCurrency(minAskingPrice)}), transferul se activează instant!
                </span>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 space-y-1">
                <span className="font-semibold text-white block">Durată Listare:</span>
                <p className="text-slate-400">
                  Permanentă. Jucătorul rămâne pe piață până îl retragi sau accepți o ofertă de la manageri.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateListingModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                >
                  Publică pe Piață
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Player Detail Modal */}
      {selectedPlayerForDetail && (
        <PlayerDetailModal
          player={selectedPlayerForDetail}
          onClose={() => setSelectedPlayerForDetail(null)}
          onOpenAuction={(p) => {
            setSellingPlayerId(p.id);
            setMinAskingPrice(Math.round(p.marketValue * 1.25));
            setShowCreateListingModal(true);
          }}
        />
      )}
    </div>
  );
};
