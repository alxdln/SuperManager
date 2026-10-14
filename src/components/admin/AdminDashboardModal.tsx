import React, { useState } from 'react';
import { useFantasy } from '../../context/FantasyContext';
import { SUPERLIGA_CLUBS } from '../../data/superligaData';
import { PlayerPosition, Player } from '../../types/football';
import { formatCurrency, formatFullCurrency } from '../../utils/scoringEngine';
import {
  X,
  Plus,
  Shield,
  ShieldAlert,
  CheckCircle2,
  UserPlus,
  Settings,
  Sliders,
  RefreshCw,
  Database,
  Globe,
  Terminal,
  Server,
  ArrowRight,
  ExternalLink,
  Code2,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { loadFirestoreCustomPlayers } from '../../lib/firebase';
import { DatabaseAndApisPanel } from './DatabaseAndApisPanel';

interface AdminDashboardModalProps {
  onClose: () => void;
  initialTab?: 'addPlayer' | 'managePlayers' | 'leagueSettings' | 'databaseAndApis';
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({ onClose, initialTab = 'addPlayer' }) => {
  const {
    players,
    addNewPlayer,
    updatePlayerStatus,
    updatePlayerMarketValue,
    leagueSettings,
    updateLeagueSettings,
  } = useFantasy();

  const [activeTab, setActiveTab] = useState<'addPlayer' | 'managePlayers' | 'leagueSettings' | 'databaseAndApis'>(initialTab);
  const [firestoreStatus, setFirestoreStatus] = useState<'connected' | 'syncing' | 'synced'>('connected');
  const [testPayloadResult, setTestPayloadResult] = useState<string | null>(null);

  // New Player Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [clubId, setClubId] = useState('fcsb');
  const [position, setPosition] = useState<PlayerPosition>('MID');
  const [number, setNumber] = useState<number>(10);
  const [marketValue, setMarketValue] = useState<number>(1000000);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [nationality, setNationality] = useState('România');
  const [age, setAge] = useState<number>(24);
  const [successMsg, setSuccessMsg] = useState('');

  // League Settings Form State
  const [leagueName, setLeagueName] = useState(leagueSettings.leagueName);
  const [startingBudget, setStartingBudget] = useState(leagueSettings.startingBudget);
  const [maxSquadSize, setMaxSquadSize] = useState(leagueSettings.maxSquadSize);

  // Filter for player manager tab
  const [filterClub, setFilterClub] = useState<string>('ALL');

  const handleCreatePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      alert('Te rugăm să introduci numele și prenumele jucătorului.');
      return;
    }

    const defaultAvatar = avatarUrl.trim()
      ? avatarUrl.trim()
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName + ' ' + lastName)}&background=0f172a&color=05df72&bold=true`;

    addNewPlayer({
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      clubId,
      position,
      number,
      marketValue,
      avatar: defaultAvatar,
      nationality,
      age,
      status: 'active',
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
    });

    setSuccessMsg(`Jucătorul ${firstName} ${lastName} a fost adăugat oficial și listat pe piața transferurilor!`);
    confetti({ particleCount: 40, spread: 60 });

    // Reset form
    setFirstName('');
    setLastName('');
    setAvatarUrl('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSaveLeagueSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateLeagueSettings({
      leagueName,
      startingBudget,
      maxSquadSize,
    });
    setSuccessMsg('Setările ligii au fost salvate cu succes!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const displayedPlayers = players.filter((p) => {
    if (filterClub !== 'ALL' && p.clubId !== filterClub) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-5 text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white">Panou Administrator &amp; Creator Joc</h2>
              <p className="text-[11px] text-slate-400">
                Gestiune loturi Superliga, adăugare jucători transferați &amp; reguli ligă
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 p-1.5 my-3 bg-slate-800/80 rounded-2xl overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('addPlayer')}
            className={`shrink-0 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'addPlayer'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Adaugă Jucător</span>
          </button>

          <button
            onClick={() => setActiveTab('managePlayers')}
            className={`shrink-0 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'managePlayers'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Modifică Jucători &amp; Status</span>
          </button>

          <button
            onClick={() => setActiveTab('leagueSettings')}
            className={`shrink-0 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'leagueSettings'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Setări Ligă</span>
          </button>

          <button
            onClick={() => setActiveTab('databaseAndApis')}
            className={`shrink-0 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'databaseAndApis'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black ring-2 ring-emerald-400/50'
                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Bază de Date &amp; API-uri</span>
          </button>
        </div>

        {successMsg && (
          <div className="p-3 mb-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: ADD NEW PLAYER */}
        {activeTab === 'addPlayer' && (
          <form onSubmit={handleCreatePlayer} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Prenume</label>
                <input
                  type="text"
                  placeholder="ex: Ianis"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nume de Familie</label>
                <input
                  type="text"
                  placeholder="ex: Hagi"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Club Superliga</label>
                <select
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                >
                  {SUPERLIGA_CLUBS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Poziție</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as PlayerPosition)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                >
                  <option value="GK">Portar (GK)</option>
                  <option value="DEF">Fundaș (DEF)</option>
                  <option value="MID">Mijlocaș (MID)</option>
                  <option value="FWD">Atacant (FWD)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Cotă Inițială (€)</label>
                <input
                  type="number"
                  step="50000"
                  value={marketValue}
                  onChange={(e) => setMarketValue(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Număr Tricou</label>
                <input
                  type="number"
                  value={number}
                  onChange={(e) => setNumber(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Vârstă</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">URL Poză Avatar (Opțional)</label>
              <input
                type="url"
                placeholder="https://... (lăsat gol generează automat)"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 mt-4"
            >
              <Plus className="w-4 h-4" />
              <span>Înregistrează &amp; Listează pe Piață</span>
            </button>
          </form>
        )}

        {/* TAB 2: MANAGE STATUSES & MARKET VALUES */}
        {activeTab === 'managePlayers' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Filtrează după echipă:</span>
              <select
                value={filterClub}
                onChange={(e) => setFilterClub(e.target.value)}
                className="p-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
              >
                <option value="ALL">Toate echipele</option>
                {SUPERLIGA_CLUBS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shortName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {displayedPlayers.map((player) => (
                <div
                  key={player.id}
                  className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/80 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">{player.name}</span>
                      <span className="text-[10px] text-slate-400 block">
                        {player.position} · Cotă: {formatCurrency(player.marketValue)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status Pill Switcher */}
                    <select
                      value={player.status}
                      onChange={(e) =>
                        updatePlayerStatus(
                          player.id,
                          e.target.value as any,
                          e.target.value === 'injured'
                            ? 'Accidentat la antrenament'
                            : e.target.value === 'suspended'
                            ? 'Suspendare automată'
                            : undefined
                        )
                      }
                      className={`p-1.5 rounded-lg text-[11px] font-bold border focus:outline-none ${
                        player.status === 'injured'
                          ? 'bg-rose-950/80 border-rose-600 text-rose-300'
                          : player.status === 'suspended'
                          ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                          : 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                      }`}
                    >
                      <option value="active">Apt de joc</option>
                      <option value="injured">Accidentat</option>
                      <option value="suspended">Suspendat</option>
                    </select>

                    {/* Quick market price boost */}
                    <button
                      onClick={() => updatePlayerMarketValue(player.id, Math.round(player.marketValue * 1.05))}
                      className="p-1.5 px-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-[10px] font-mono font-bold text-emerald-300"
                      title="Mărește cota cu 5%"
                    >
                      +5% €
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: LEAGUE SETTINGS */}
        {activeTab === 'leagueSettings' && (
          <form onSubmit={handleSaveLeagueSettings} className="space-y-3.5 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Numele Ligii</label>
              <input
                type="text"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                required
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Buget Inițial Alocat fiecărui Manager (€)</label>
              <input
                type="number"
                step="1000000"
                value={startingBudget}
                onChange={(e) => setStartingBudget(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Standard recomandat Kickbase: €50.000.000
              </span>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Număr Maxim Jucători per Echipă</label>
              <input
                type="number"
                min="11"
                max="25"
                value={maxSquadSize}
                onChange={(e) => setMaxSquadSize(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Recomandat: 18 jucători (11 titulari + 7 rezerve)
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all mt-4"
            >
              Salvează Modificările Ligii
            </button>
          </form>
        )}

        {/* TAB 4: DATABASE & LIVE APIS (SOFASCORE, FLASHSCORE, OPTA) */}
        {activeTab === 'databaseAndApis' && <DatabaseAndApisPanel />}
      </div>
    </div>
  );
};
