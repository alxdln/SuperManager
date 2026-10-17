import React, { useState, useEffect, useMemo } from 'react';
import { useFantasy } from '../../context/FantasyContext';
import { ALL_16_SUPERLIGA_CLUBS } from '../../data/superligaAll16ClubsPlayers';
import { Player, PlayerPosition, Club, UserMembership } from '../../types/football';
import { formatCurrency, formatFullCurrency } from '../../utils/scoringEngine';
import {
  getAllFirestoreUsers,
  updateFirestoreUserAccount,
  deleteFirestoreUserAccount,
  sendPasswordResetLink,
  getAllFirestoreLeagues,
  updateFirestoreLeague,
  deleteFirestoreLeague,
  StoredUserAccount,
  StoredLeagueData,
} from '../../lib/firebase';
import {
  Database,
  Search,
  Filter,
  Users,
  Trophy,
  Shield,
  Edit3,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Sliders,
  DollarSign,
  Plus,
  ArrowUpDown,
  Mail,
  Calendar,
  Building2,
  Check,
  Globe2,
  Power,
  ImageIcon,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DatabaseNavigatorViewProps {
  onSelectClubFilter?: (clubId: string) => void;
}

export const DatabaseNavigatorView: React.FC<DatabaseNavigatorViewProps> = () => {
  const {
    user,
    updateUserMembership,
    players,
    allPlayers,
    clubs,
    activeClubs,
    updateClub,
    addNewClub,
    toggleClubStatus,
    updateGlobalPlayerData,
    deletePlayerGlobal,
    addNewPlayer,
    leagueSettings,
  } = useFantasy();

  // Active Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<'players' | 'managers' | 'leagues' | 'clubs'>('players');

  // --- PLAYERS TAB STATE ---
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerClubFilter, setPlayerClubFilter] = useState<string>('ALL');
  const [playerPosFilter, setPlayerPosFilter] = useState<string>('ALL');
  const [playerSortBy, setPlayerSortBy] = useState<'value_desc' | 'value_asc' | 'points_desc' | 'name_asc'>('value_desc');

  // Player Edit & Add Modal State
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [confirmPublishModalOpen, setConfirmPublishModalOpen] = useState(false);
  const [deletePlayerConfirmId, setDeletePlayerConfirmId] = useState<string | null>(null);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [newPlayerForm, setNewPlayerForm] = useState<{
    name: string;
    clubId: string;
    position: PlayerPosition;
    nationality: string;
    avatar: string;
    marketValue: number;
  }>({
    name: '',
    clubId: 'fcsb',
    position: 'MID',
    nationality: 'România',
    avatar: '',
    marketValue: 1500000,
  });

  // --- MANAGERS TAB STATE ---
  const [managers, setManagers] = useState<StoredUserAccount[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [managerSearch, setManagerSearch] = useState('');
  const [editingManager, setEditingManager] = useState<StoredUserAccount | null>(null);
  const [passwordResetManager, setPasswordResetManager] = useState<StoredUserAccount | null>(null);
  const [deleteManagerConfirm, setDeleteManagerConfirm] = useState<StoredUserAccount | null>(null);

  // --- CLUBS TAB STATE ---
  const [clubSearch, setClubSearch] = useState('');
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [isAddClubModalOpen, setIsAddClubModalOpen] = useState(false);
  const [newClubForm, setNewClubForm] = useState<{
    name: string;
    shortName: string;
    city: string;
    stadium: string;
    logoUrl: string;
    logoColor: string;
    secondaryColor: string;
  }>({
    name: '',
    shortName: '',
    city: '',
    stadium: '',
    logoUrl: '',
    logoColor: '#DC2626',
    secondaryColor: '#FFFFFF',
  });

  // --- LEAGUES TAB STATE ---
  const [leagues, setLeagues] = useState<StoredLeagueData[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [leagueSearch, setLeagueSearch] = useState('');
  const [editingLeague, setEditingLeague] = useState<StoredLeagueData | null>(null);
  const [deleteLeagueConfirm, setDeleteLeagueConfirm] = useState<StoredLeagueData | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Load Managers & Leagues
  const reloadManagers = async () => {
    setLoadingManagers(true);
    try {
      const data = await getAllFirestoreUsers();
      setManagers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingManagers(false);
    }
  };

  const reloadLeagues = async () => {
    setLoadingLeagues(true);
    try {
      const data = await getAllFirestoreLeagues();
      setLeagues(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLeagues(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'managers') {
      reloadManagers();
    } else if (activeSubTab === 'leagues') {
      reloadLeagues();
    }
  }, [activeSubTab]);

  // Filtered Players
  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        const matchesSearch =
          playerSearch.trim() === '' ||
          p.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
          p.nationality.toLowerCase().includes(playerSearch.toLowerCase()) ||
          p.clubId.toLowerCase().includes(playerSearch.toLowerCase());

        const matchesClub = playerClubFilter === 'ALL' || p.clubId === playerClubFilter;
        const matchesPos = playerPosFilter === 'ALL' || p.position === playerPosFilter;

        return matchesSearch && matchesClub && matchesPos;
      })
      .sort((a, b) => {
        if (playerSortBy === 'value_desc') return b.marketValue - a.marketValue;
        if (playerSortBy === 'value_asc') return a.marketValue - b.marketValue;
        if (playerSortBy === 'points_desc') return b.pointsTotal - a.pointsTotal;
        if (playerSortBy === 'name_asc') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [players, playerSearch, playerClubFilter, playerPosFilter, playerSortBy]);

  // Filtered Managers
  const filteredManagers = useMemo(() => {
    return managers.filter((m) => {
      const q = managerSearch.toLowerCase();
      return (
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.teamName?.toLowerCase().includes(q) ||
        m.leagueName?.toLowerCase().includes(q) ||
        m.leagueCode?.toLowerCase().includes(q)
      );
    });
  }, [managers, managerSearch]);

  // Filtered Leagues
  const filteredLeagues = useMemo(() => {
    return leagues.filter((l) => {
      const q = leagueSearch.toLowerCase();
      return (
        l.name?.toLowerCase().includes(q) ||
        l.code?.toLowerCase().includes(q) ||
        l.creatorName?.toLowerCase().includes(q)
      );
    });
  }, [leagues, leagueSearch]);

  // Handlers for Player Global Publish
  const handleInitiatePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    setConfirmPublishModalOpen(true);
  };

  const handleConfirmGlobalPublish = async () => {
    if (!editingPlayer) return;
    try {
      await updateGlobalPlayerData(editingPlayer);
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
      showToast(`Modificările pentru ${editingPlayer.name} au fost salvate și publicate global!`);
      setConfirmPublishModalOpen(false);
      setEditingPlayer(null);
    } catch (e) {
      showToast('Eroare la publicarea datelor. Te rugăm să reîncerci.', 'error');
    }
  };

  const handleDeletePlayer = async (id: string) => {
    await deletePlayerGlobal(id);
    showToast('Fotbalistul a fost șters definitiv din baza de date.', 'info');
    setDeletePlayerConfirmId(null);
  };

  const handleCreateNewPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerForm.name.trim()) {
      showToast('Introdu numele complet al fotbalistului.', 'error');
      return;
    }

    const defaultAvatar = newPlayerForm.avatar.trim()
      ? newPlayerForm.avatar.trim()
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(newPlayerForm.name.trim())}&background=0f172a&color=05df72&bold=true`;

    const parts = newPlayerForm.name.trim().split(' ');
    const firstName = parts[0] || 'Jucător';
    const lastName = parts.slice(1).join(' ') || firstName;

    const playerPayload = {
      name: newPlayerForm.name.trim(),
      firstName,
      lastName,
      clubId: newPlayerForm.clubId,
      position: newPlayerForm.position,
      nationality: newPlayerForm.nationality.trim() || 'România',
      avatar: defaultAvatar,
      marketValue: Number(newPlayerForm.marketValue) || 1000000,
      number: 10,
      age: 24,
      status: 'active' as const,
      stats: {
        matches: 0,
        goals: 0,
        assists: 0,
        shotsOnTarget: 0,
        shotsMissed: 0,
        passesCompleted: 0,
        keyPasses: 0,
        crossesCompleted: 0,
        tacklesWon: 0,
        recoveries: 0,
        dribblesCompleted: 0,
        ballsLost: 0,
        foulsCommitted: 0,
        foulsDrawn: 0,
        yellowCards: 0,
        redCards: 0,
        cleanSheets: 0,
        penaltySaves: 0,
        goalsConceded: 0,
      },
    };

    addNewPlayer(playerPayload);
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
    showToast(`Jucătorul "${newPlayerForm.name}" a fost salvat și publicat global în Firestore!`, 'success');
    setIsAddPlayerModalOpen(false);
    setNewPlayerForm({
      name: '',
      clubId: 'fcsb',
      position: 'MID',
      nationality: 'România',
      avatar: '',
      marketValue: 1500000,
    });
  };

  // Handlers for Manager
  const handleSaveManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingManager) return;
    await updateFirestoreUserAccount(editingManager);
    if (user.id === editingManager.id && editingManager.membership) {
      updateUserMembership(editingManager.membership);
    }
    showToast(`Datele managerului ${editingManager.name} au fost actualizate! Nivel: ${(editingManager.membership || 'gratuit').toUpperCase()}`);
    setEditingManager(null);
    reloadManagers();
  };

  const handleDeleteManager = async () => {
    if (!deleteManagerConfirm) return;
    await deleteFirestoreUserAccount(deleteManagerConfirm.id, deleteManagerConfirm.email);
    showToast(`Contul managerului ${deleteManagerConfirm.name} a fost șters definitiv.`, 'info');
    setDeleteManagerConfirm(null);
    reloadManagers();
  };

  const handleSendPasswordReset = async () => {
    if (!passwordResetManager) return;
    const res = await sendPasswordResetLink(passwordResetManager.email);
    showToast(res.message, res.success ? 'success' : 'error');
    setPasswordResetManager(null);
  };

  // Handlers for Clubs
  const handleSaveClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClub) return;
    await updateClub(editingClub);
    showToast(`Datele clubului "${editingClub.name}" au fost salvate în Master Database!`, 'success');
    setEditingClub(null);
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubForm.name.trim() || !newClubForm.shortName.trim()) {
      showToast('Te rugăm să introduci numele și prescurtarea clubului.', 'error');
      return;
    }
    const defaultLogo = newClubForm.logoUrl.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(newClubForm.shortName)}&background=0f172a&color=05df72&bold=true`;
    await addNewClub({
      ...newClubForm,
      logoUrl: defaultLogo,
    });
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
    showToast(`Clubul "${newClubForm.name}" a fost adăugat oficial în Superliga României!`, 'success');
    setIsAddClubModalOpen(false);
    setNewClubForm({
      name: '',
      shortName: '',
      city: '',
      stadium: '',
      logoUrl: '',
      logoColor: '#DC2626',
      secondaryColor: '#FFFFFF',
    });
  };

  const handleToggleClub = async (club: Club) => {
    const nextStatus = club.isActive === false ? true : false;
    await toggleClubStatus(club.id, nextStatus);
    showToast(
      nextStatus
        ? `Clubul ${club.name} a fost reactivat! Jucătorii sunt acum disponibili.`
        : `Clubul ${club.name} a fost dezactivat. Fotbaliștii asociați au fost ascunși din joc.`,
      nextStatus ? 'success' : 'info'
    );
  };

  // Handlers for League
  const handleSaveLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeague) return;
    await updateFirestoreLeague(editingLeague);
    showToast(`Liga "${editingLeague.name}" a fost actualizată!`);
    setEditingLeague(null);
    reloadLeagues();
  };

  const handleDeleteLeague = async () => {
    if (!deleteLeagueConfirm) return;
    await deleteFirestoreLeague(deleteLeagueConfirm.id, deleteLeagueConfirm.code);
    showToast(`Liga "${deleteLeagueConfirm.name}" a fost ștearsă definitiv.`, 'info');
    setDeleteLeagueConfirm(null);
    reloadLeagues();
  };

  const getClubById = (id: string): Club | undefined => {
    return clubs.find((c) => c.id === id) || ALL_16_SUPERLIGA_CLUBS.find((c) => c.id === id);
  };

  const getPositionBadge = (pos: PlayerPosition) => {
    switch (pos) {
      case 'GK':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'DEF':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'MID':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'FWD':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 backdrop-blur-xl animate-bounce-short ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : toastMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Navigator Navigation Sub-Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 font-mono text-[10px] uppercase font-black tracking-wider border border-indigo-500/30">
                Creator Hub · Master Database
              </span>
              <span className="text-[11px] text-slate-400">Superliga României 2026/2027</span>
            </div>
            <h2 className="text-lg font-black text-white mt-1 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              Navigator Global &amp; Gestionare Bază de Date
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Explorează, caută și editează direct jucătorii, managerii și ligile din sistem cu sincronizare globală.
            </p>
          </div>

          {/* Sub-Tabs Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveSubTab('players')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeSubTab === 'players'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Jucători ({players.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('managers')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeSubTab === 'managers'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Manageri ({managers.length || '...'})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('leagues')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeSubTab === 'leagues'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Ligi Create ({leagues.length || '...'})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('clubs')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeSubTab === 'clubs'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>16 Cluburi Oficiale</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. PLAYERS BROWSER & MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSubTab === 'players' && (
        <div className="space-y-4">
          {/* Controls Bar: Search & Filters */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Caută jucător după nume, număr, naționalitate..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                />
                {playerSearch && (
                  <button
                    onClick={() => setPlayerSearch('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={playerSortBy}
                  onChange={(e) => setPlayerSortBy(e.target.value as any)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                >
                  <option value="value_desc">Cotă: descrescător (€)</option>
                  <option value="value_asc">Cotă: crescător (€)</option>
                  <option value="points_desc">Puncte: cele mai multe</option>
                  <option value="name_asc">Nume: A-Z</option>
                </select>
              </div>
            </div>

            {/* Filter Pills / Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-800/80">
              {/* Club Filter */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Club Superliga (16)</label>
                <select
                  value={playerClubFilter}
                  onChange={(e) => setPlayerClubFilter(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium"
                >
                  <option value="ALL">Toate cele 16 Cluburi</option>
                  {ALL_16_SUPERLIGA_CLUBS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.shortName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Position Filter */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Poziție</label>
                <select
                  value={playerPosFilter}
                  onChange={(e) => setPlayerPosFilter(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium"
                >
                  <option value="ALL">Toate Pozițiile</option>
                  <option value="GK">Portari (GK)</option>
                  <option value="DEF">Fundași (DEF)</option>
                  <option value="MID">Mijlocași (MID)</option>
                  <option value="FWD">Atacanți (FWD)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Result Counter & Quick Summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1">
            <div className="flex items-center gap-3">
              <span>
                Afișare <b className="text-white font-mono">{filteredPlayers.length}</b> din {players.length} fotbaliști
              </span>
              <span className="text-[11px] text-indigo-400 font-semibold flex items-center gap-1.5 bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-500/20">
                <Globe2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sync Global Firestore</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsAddPlayerModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adaugă Jucător Nou</span>
            </button>
          </div>

          {/* Players Table / Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[700px] overflow-y-auto pr-1">
            {filteredPlayers.map((player) => {
              const club = getClubById(player.clubId);

              return (
                <div
                  key={player.id}
                  className="p-3.5 bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl transition-all shadow-sm flex flex-col justify-between gap-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={player.avatar}
                          alt={player.name}
                          className="w-12 h-12 rounded-2xl object-cover bg-slate-950 border border-slate-700 shadow-md shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              player.name
                            )}&background=0f172a&color=05df72&bold=true`;
                          }}
                        />
                        {club?.logoUrl && (
                          <img
                            src={club.logoUrl}
                            alt={club.name}
                            className="w-4 h-4 rounded-full bg-slate-900 p-0.5 border border-slate-700 absolute -bottom-1 -right-1 shadow"
                          />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white text-sm">{player.name}</span>
                          <span
                            className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded-md border ${getPositionBadge(
                              player.position
                            )}`}
                          >
                            {player.position}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span className="text-slate-300 font-medium">{club?.name || player.clubId}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-400">{player.nationality}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Player 6 Attributes Value Ribbon */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl text-center">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Cotă Transfermarkt</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {formatFullCurrency(player.marketValue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Punctaj Fantasy Total</span>
                      <span className="text-xs font-mono font-bold text-indigo-400">
                        {player.pointsTotal} puncte
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <button
                      onClick={() => setEditingPlayer(player)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold text-[11px] transition-all flex items-center gap-1.5 border border-indigo-500/30 hover:border-transparent"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editează Date Jucător</span>
                    </button>

                    <button
                      onClick={() => setDeletePlayerConfirmId(player.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Șterge Jucător"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MANAGERS BROWSER & MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSubTab === 'managers' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Caută manager după nume, email, nume echipă..."
                  value={managerSearch}
                  onChange={(e) => setManagerSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <button
                onClick={reloadManagers}
                disabled={loadingManagers}
                className="px-3 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 self-start sm:self-auto shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingManagers ? 'animate-spin' : ''}`} />
                <span>Reîmprospătează</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-400 px-1">
            Manageri înregistrați în baza de date: <b className="text-white font-mono">{filteredManagers.length}</b>
          </div>

          {loadingManagers ? (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
              <span>Se încarcă managerii din Firestore...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[700px] overflow-y-auto pr-1">
              {filteredManagers.map((m) => (
                <div
                  key={m.id}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between gap-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}`}
                        alt={m.name}
                        className="w-11 h-11 rounded-2xl object-cover bg-slate-950 border border-slate-700 shadow shrink-0"
                      />
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2 flex-wrap">
                          <span>{m.name}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded uppercase text-[9px] font-mono font-bold border ${
                              m.membership === 'creator'
                                ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                                : m.membership === 'admin'
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : m.membership === 'pro'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {m.membership || 'gratuit'}
                          </span>
                          {m.id === 'usr_me' && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[9px] font-mono">
                              Tu (Admin)
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{m.email}</span>
                        </div>
                        <div className="text-indigo-400 text-[11px] font-semibold mt-0.5">
                          Echipă: {m.teamName || 'Fără echipă'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block uppercase">Buget Curent</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {formatCurrency(m.budget || 5000000)}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Ligă: <b className="text-white">{m.leagueName || 'Superliga României 2026/2027'}</b>
                    </span>
                    <span className="font-mono text-slate-500 text-[10px]">
                      Cod: {m.leagueCode || 'SUPER2026'}
                    </span>
                  </div>

                  {/* Actions for Manager */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingManager(m)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] transition-all flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Editează</span>
                      </button>

                      <button
                        onClick={() => setPasswordResetManager(m)}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[11px] transition-all flex items-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Resetează Parolă</span>
                      </button>
                    </div>

                    {m.id !== 'usr_me' && (
                      <button
                        onClick={() => setDeleteManagerConfirm(m)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Șterge Manager"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. LEAGUES BROWSER & MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSubTab === 'leagues' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Caută ligă după nume sau cod unic..."
                  value={leagueSearch}
                  onChange={(e) => setLeagueSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <button
                onClick={reloadLeagues}
                disabled={loadingLeagues}
                className="px-3 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLeagues ? 'animate-spin' : ''}`} />
                <span>Reîmprospătează</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-400 px-1">
            Ligi create înregistrate: <b className="text-white font-mono">{filteredLeagues.length}</b>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[700px] overflow-y-auto pr-1">
            {filteredLeagues.map((l) => (
              <div
                key={l.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{l.name}</h4>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Creată de: <b className="text-slate-300">{l.creatorName || 'Administrator'}</b>
                      </span>
                    </div>

                    <span className="px-2.5 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono text-xs font-bold tracking-wider">
                      {l.code}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl text-center">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">Buget Inițial</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {formatCurrency(l.budget || 50000000)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">Limită Club</span>
                      <span className="text-xs font-mono font-bold text-slate-300">
                        Max {l.maxSameClubPlayers || 3} jucători
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <button
                    onClick={() => setEditingLeague(l)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] transition-all flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Editează Reguli</span>
                  </button>

                  {l.code !== 'SUPER2026' && (
                    <button
                      onClick={() => setDeleteLeagueConfirm(l)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Șterge Ligă"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. THE 16 OFFICIAL SUPERLIGA CLUBS 2026/2027 */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 4. SUPERLIGA CLUBS MANAGEMENT (ADD, EDIT, DEACTIVATE, LOGOS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'clubs' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                Gestiune Cluburi Superliga României
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Editează denumirile, emblemele oficiale, dezactivează cluburile retrogradate sau adaugă cluburi noi promovate.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
                {activeClubs.length} Active / {clubs.length} Total Cluburi
              </span>
              <button
                onClick={() => setIsAddClubModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Adaugă Club Nou</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <b>Regulă Master Database:</b> Când dezactivezi un club din lista de mai jos, toți fotbaliștii acelui club sunt ascunși automat din tot jocul (Piață de transferuri, Teren Tactic, Meci Live și Clasamente).
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {clubs.map((club) => {
              const clubPlayers = (allPlayers || players).filter((p) => p.clubId === club.id);
              const totalValue = clubPlayers.reduce((acc, p) => acc + p.marketValue, 0);
              const isDeactivated = club.isActive === false;

              return (
                <div
                  key={club.id}
                  className={`p-4 rounded-2xl transition-all shadow-sm flex flex-col justify-between gap-3 text-xs border ${
                    isDeactivated
                      ? 'bg-slate-950/80 border-rose-500/30 opacity-75'
                      : 'bg-slate-900 border-slate-800 hover:border-indigo-500/40'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase border flex items-center gap-1 ${
                          isDeactivated
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isDeactivated ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                        {isDeactivated ? 'Dezactivat (Retrogradat)' : 'Activ în Superliga'}
                      </span>

                      <button
                        onClick={() => handleToggleClub(club)}
                        className={`p-1.5 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                          isDeactivated
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                        }`}
                        title={isDeactivated ? 'Reactivează clubul' : 'Dezactivează clubul'}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span className="text-[10px]">{isDeactivated ? 'Activează' : 'Dezactivează'}</span>
                      </button>
                    </div>

                    <div className="flex items-start gap-3">
                      <img
                        src={club.logoUrl || `https://api.sofascore.app/api/v1/team/1989/image`}
                        alt={club.name}
                        className="w-12 h-12 rounded-xl object-contain bg-slate-950 p-1.5 border border-slate-800 shrink-0 shadow"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            club.shortName
                          )}&background=0f172a&color=05df72&bold=true`;
                        }}
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-sm truncate">{club.name}</h4>
                        <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
                          {club.city} · {club.stadium}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2 bg-slate-950/70 border border-slate-800/80 rounded-xl text-center">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">Jucători Lot</span>
                      <span className="text-xs font-mono font-bold text-indigo-400">{clubPlayers.length}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">Valoare Lot</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {formatCurrency(totalValue)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={() => setEditingClub(club)}
                      className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] transition-all flex items-center justify-center gap-1 border border-slate-700"
                    >
                      <Edit3 className="w-3 h-3 text-indigo-400" />
                      <span>Editează</span>
                    </button>

                    <button
                      onClick={() => {
                        setPlayerClubFilter(club.id);
                        setActiveSubTab('players');
                      }}
                      className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 font-bold text-[11px] transition-all flex items-center justify-center gap-1 border border-slate-700"
                    >
                      <span>Vezi Lotul</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT COMPLETE PLAYER DATA */}
      {/* ========================================================================= */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl text-xs my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono text-[10px] uppercase font-bold border border-indigo-500/30">
                  Modificare Date Fotbalist
                </span>
                <h3 className="text-base font-bold text-white mt-1 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-400" />
                  Editează: {editingPlayer.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingPlayer(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInitiatePublish} className="space-y-4">
              {/* Form Grid: 6 Core General Attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">1. Nume Complet</label>
                  <input
                    type="text"
                    value={editingPlayer.name}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">2. Club Superliga (16 echipe)</label>
                  <select
                    value={editingPlayer.clubId}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, clubId: e.target.value })}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                  >
                    {ALL_16_SUPERLIGA_CLUBS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.shortName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">3. Poziție Oficială</label>
                  <select
                    value={editingPlayer.position}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, position: e.target.value as PlayerPosition })}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                  >
                    <option value="GK">Portar (GK)</option>
                    <option value="DEF">Fundaș (DEF)</option>
                    <option value="MID">Mijlocaș (MID)</option>
                    <option value="FWD">Atacant (FWD)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">4. Naționalitate</label>
                  <input
                    type="text"
                    value={editingPlayer.nationality}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, nationality: e.target.value })}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    5. Cotă Transfermarkt (€)
                  </label>
                  <input
                    type="number"
                    step="50000"
                    min="50000"
                    value={editingPlayer.marketValue}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, marketValue: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-emerald-400 font-mono font-bold"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {formatFullCurrency(editingPlayer.marketValue)}
                  </span>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">6. URL Avatar / Poză Jucător</label>
                  <input
                    type="url"
                    value={editingPlayer.avatar}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, avatar: e.target.value })}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono"
                    placeholder="https://..."
                    required
                  />
                </div>
              </div>

              {/* Automatic Match Scoring Notice */}
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-slate-300">
                    Punctaj Fantasy Total: <b className="text-white font-mono">{editingPlayer.pointsTotal} puncte</b>
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">Calculat automat la meciuri</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
                >
                  <Globe2 className="w-4 h-4" />
                  <span>Publică Modificările Global</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMATION GLOBAL PUBLISH */}
      {/* ========================================================================= */}
      {confirmPublishModalOpen && editingPlayer && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs text-center animate-scale-up">
            <div className="relative w-16 h-16 mx-auto">
              <img
                src={editingPlayer.avatar}
                alt={editingPlayer.name}
                className="w-16 h-16 rounded-2xl object-cover bg-slate-950 border-2 border-indigo-500/50 shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    editingPlayer.name
                  )}&background=0f172a&color=05df72&bold=true`;
                }}
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 border border-slate-900 flex items-center justify-center text-white">
                <Globe2 className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Confirmare Publicare Globală</h3>
              <p className="text-slate-400 mt-1">
                Confirmi aplicarea noilor date pentru fotbalistul <b className="text-white">{editingPlayer.name}</b>?
              </p>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-left space-y-1.5 text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Club Superliga:</span>
                <span className="font-semibold text-white">{getClubById(editingPlayer.clubId)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Poziție Oficială:</span>
                <span className="font-mono font-bold text-indigo-400">{editingPlayer.position}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Naționalitate:</span>
                <span className="font-semibold text-white">{editingPlayer.nationality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cotă Transfermarkt:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatFullCurrency(editingPlayer.marketValue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Punctaj Fantasy Total:</span>
                <span className="font-mono font-bold text-indigo-300">{editingPlayer.pointsTotal} puncte</span>
              </div>
            </div>

            <p className="text-[11px] text-indigo-300 bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-500/20">
              ⚡ Datele vor fi salvate direct în baza de date globală Firestore și sincronizate instantaneu pentru toți managerii și ligile din joc.
            </p>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                onClick={() => setConfirmPublishModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
              >
                Înapoi
              </button>
              <button
                onClick={handleConfirmGlobalPublish}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Confirmă &amp; Publică Global</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE PLAYER CONFIRMATION */}
      {/* ========================================================================= */}
      {deletePlayerConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-xs text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Ștergere Fotbalist</h3>
              <p className="text-slate-400 mt-1">
                Ești sigur că vrei să ștergi acest jucător din baza de date globală? Acțiunea este ireversibilă.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                onClick={() => setDeletePlayerConfirmId(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={() => handleDeletePlayer(deletePlayerConfirmId)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black shadow-lg shadow-rose-600/30 transition-all"
              >
                Confirmă Ștergerea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW PLAYER (MASTER DATABASE) */}
      {/* ========================================================================= */}
      {isAddPlayerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Adăugare Jucător Nou</h3>
                  <p className="text-[11px] text-slate-400">Salvare directă în baza de date globală Firestore</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPlayerModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewPlayer} className="space-y-3.5">
              {/* 1. Nume Complet */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  1. Nume Complet <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: Darius Olaru sau Alexandru Mitriță"
                  value={newPlayerForm.name}
                  onChange={(e) => setNewPlayerForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 2. Club */}
                <div>
                  <label className="text-slate-300 font-bold block mb-1">2. Club Superliga</label>
                  <select
                    value={newPlayerForm.clubId}
                    onChange={(e) => setNewPlayerForm((prev) => ({ ...prev, clubId: e.target.value }))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:border-indigo-500 focus:outline-none"
                  >
                    {ALL_16_SUPERLIGA_CLUBS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.shortName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Poziție */}
                <div>
                  <label className="text-slate-300 font-bold block mb-1">3. Poziție Oficială</label>
                  <select
                    value={newPlayerForm.position}
                    onChange={(e) => setNewPlayerForm((prev) => ({ ...prev, position: e.target.value as PlayerPosition }))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="GK">Portar (GK)</option>
                    <option value="DEF">Fundaș (DEF)</option>
                    <option value="MID">Mijlocaș (MID)</option>
                    <option value="FWD">Atacant (FWD)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 4. Naționalitate */}
                <div>
                  <label className="text-slate-300 font-bold block mb-1">4. Naționalitate</label>
                  <input
                    type="text"
                    placeholder="ex: România, Brazilia, Franța"
                    value={newPlayerForm.nationality}
                    onChange={(e) => setNewPlayerForm((prev) => ({ ...prev, nationality: e.target.value }))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* 6. Cotă Transfermarkt */}
                <div>
                  <label className="text-slate-300 font-bold block mb-1">6. Cotă Transfermarkt (€)</label>
                  <input
                    type="number"
                    step="50000"
                    min="100000"
                    placeholder="ex: 1500000"
                    value={newPlayerForm.marketValue}
                    onChange={(e) => setNewPlayerForm((prev) => ({ ...prev, marketValue: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* 5. Avatar / Poză */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">5. Avatar / Link Poză Jucător</label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://... (lăsat gol generează automat)"
                    value={newPlayerForm.avatar}
                    onChange={(e) => setNewPlayerForm((prev) => ({ ...prev, avatar: e.target.value }))}
                    className="flex-1 p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-[11px] focus:border-indigo-500 focus:outline-none"
                  />
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={
                        newPlayerForm.avatar.trim() ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(newPlayerForm.name.trim() || 'Jucator')}&background=0f172a&color=05df72&bold=true`
                      }
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=J&background=0f172a&color=05df72&bold=true`;
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-[11px] text-indigo-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5" />
                  Sincronizare Globală Ecosistem
                </span>
                <p className="text-slate-300">
                  Fotbalistul va fi salvat în colecția Firestore <code className="font-mono text-indigo-200">all_players</code> și <code className="font-mono text-indigo-200">custom_players</code> și va fi listat automat pe piața oficială de transferuri a ligii.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPlayerModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvează &amp; Publică Global</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT MANAGER */}
      {/* ========================================================================= */}
      {editingManager && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                Editează Date Manager: {editingManager.name}
              </h3>
              <button onClick={() => setEditingManager(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManager} className="space-y-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nume Manager</label>
                <input
                  type="text"
                  value={editingManager.name}
                  onChange={(e) => setEditingManager({ ...editingManager, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Email Înregistrare</label>
                <input
                  type="email"
                  value={editingManager.email}
                  onChange={(e) => setEditingManager({ ...editingManager, email: e.target.value })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nume Echipă Club</label>
                <input
                  type="text"
                  value={editingManager.teamName}
                  onChange={(e) => setEditingManager({ ...editingManager, teamName: e.target.value })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Buget Curent (€)</label>
                <input
                  type="number"
                  step="500000"
                  value={editingManager.budget}
                  onChange={(e) => setEditingManager({ ...editingManager, budget: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-emerald-400 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Nivel de Membership (Privilegii Cont)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['gratuit', 'pro', 'admin', 'creator'] as UserMembership[]).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setEditingManager({ ...editingManager, membership: tier })}
                      className={`p-2 rounded-xl border text-left font-bold capitalize flex items-center justify-between transition-all ${
                        (editingManager.membership || 'gratuit') === tier
                          ? tier === 'creator'
                            ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow'
                            : tier === 'admin'
                            ? 'bg-amber-600/30 border-amber-500 text-amber-300 shadow'
                            : tier === 'pro'
                            ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow'
                            : 'bg-slate-700/50 border-slate-500 text-slate-200 shadow'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs uppercase font-mono">{tier}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {tier === 'gratuit'
                            ? 'Avatare gri • Puncte live echipă'
                            : tier === 'pro'
                            ? 'Poze reale • Live per fotbalist'
                            : tier === 'admin'
                            ? 'Admin setări ligă proprie'
                            : 'Acces Creator & Commissioner'}
                        </span>
                      </div>
                      {(editingManager.membership || 'gratuit') === tier && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingManager(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Salvează Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PASSWORD RESET VIA EMAIL LINK */}
      {/* ========================================================================= */}
      {passwordResetManager && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-xs text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Resetare Parolă Cont</h3>
              <p className="text-slate-400 mt-1">
                Transmite un link de resetare securizat la adresa de email folosită la crearea contului:
              </p>
              <div className="mt-2 p-2 bg-slate-950 rounded-xl border border-slate-800 font-mono text-amber-300 font-bold">
                {passwordResetManager.email}
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Managerul <b className="text-white">{passwordResetManager.name}</b> va primi un email cu link direct pentru a-și defini o nouă parolă.
            </p>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                onClick={() => setPasswordResetManager(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
              >
                Anulează
              </button>
              <button
                onClick={handleSendPasswordReset}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/30 transition-all flex items-center gap-1.5"
              >
                <Mail className="w-4 h-4" />
                <span>Trimite Link Resetare</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE MANAGER CONFIRMATION */}
      {/* ========================================================================= */}
      {deleteManagerConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-xs text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Ștergere Manager</h3>
              <p className="text-slate-400 mt-1">
                Ești sigur că vrei să elimini contul managerului <b className="text-white">{deleteManagerConfirm.name}</b> ({deleteManagerConfirm.email})?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                onClick={() => setDeleteManagerConfirm(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
              >
                Anulează
              </button>
              <button
                onClick={handleDeleteManager}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black shadow-lg shadow-rose-600/30 transition-all"
              >
                Confirmă Ștergerea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT LEAGUE */}
      {/* ========================================================================= */}
      {editingLeague && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                Editează Ligă: {editingLeague.name}
              </h3>
              <button onClick={() => setEditingLeague(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLeague} className="space-y-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nume Ligă</label>
                <input
                  type="text"
                  value={editingLeague.name}
                  onChange={(e) => setEditingLeague({ ...editingLeague, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Cod Unic de Acces</label>
                <input
                  type="text"
                  value={editingLeague.code}
                  onChange={(e) => setEditingLeague({ ...editingLeague, code: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-indigo-400 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Buget Inițial Acordat (€)</label>
                <input
                  type="number"
                  step="5000000"
                  value={editingLeague.budget}
                  onChange={(e) => setEditingLeague({ ...editingLeague, budget: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-emerald-400 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Limită Jucători din Același Club</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={editingLeague.maxSameClubPlayers}
                  onChange={(e) =>
                    setEditingLeague({ ...editingLeague, maxSameClubPlayers: Number(e.target.value) })
                  }
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingLeague(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Salvează Modificările
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE LEAGUE CONFIRMATION */}
      {/* ========================================================================= */}
      {deleteLeagueConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-xs text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Ștergere Ligă</h3>
              <p className="text-slate-400 mt-1">
                Ești sigur că vrei să elimini liga <b className="text-white">"{deleteLeagueConfirm.name}"</b>?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                onClick={() => setDeleteLeagueConfirm(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
              >
                Anulează
              </button>
              <button
                onClick={handleDeleteLeague}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black shadow-lg shadow-rose-600/30 transition-all"
              >
                Confirmă Ștergerea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
