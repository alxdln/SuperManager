import React, { useState } from 'react';
import { useFantasy } from '../../context/FantasyContext';
import { SUPERLIGA_CLUBS } from '../../data/superligaData';
import { PlayerPosition, Player } from '../../types/football';
import { formatCurrency, formatFullCurrency } from '../../utils/scoringEngine';
import {
  Shield,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Sparkles,
  TrendingUp,
  Layers,
  Database,
  ArrowLeft,
  DollarSign,
  UserCheck,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DatabaseAndApisPanel } from '../admin/DatabaseAndApisPanel';

interface CreatorDashboardViewProps {
  onExit: () => void;
}

export const CreatorDashboardView: React.FC<CreatorDashboardViewProps> = ({ onExit }) => {
  const {
    players,
    addNewPlayer,
    updatePlayerStatus,
    updatePlayerMarketValue,
    recalculateMarketValuesFromWeeklyTrades,
    leagueSettings,
    unifiedMarketItems,
  } = useFantasy();

  const [activeTab, setActiveTab] = useState<'addPlayer' | 'managePlayers' | 'marketEngine' | 'databaseAndApis'>('addPlayer');

  // Form states for adding new player
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [clubId, setClubId] = useState('fcsb');
  const [position, setPosition] = useState<PlayerPosition>('MID');
  const [marketValue, setMarketValue] = useState<number>(1500000);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [nationality, setNationality] = useState('România');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & filter for player management tab
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClub, setFilterClub] = useState<string>('ALL');
  const [filterPos, setFilterPos] = useState<string>('ALL');

  const handleCreatePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      alert('Introdu numele și prenumele jucătorului.');
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
      number: 10,
      marketValue,
      avatar: defaultAvatar,
      nationality,
      age: 24,
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

    setSuccessMsg(`Jucătorul ${firstName} ${lastName} a fost adăugat oficial cu cota Transfermarkt de ${formatFullCurrency(marketValue)} și listat pe piață!`);
    confetti({ particleCount: 40, spread: 60 });

    setFirstName('');
    setLastName('');
    setAvatarUrl('');
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  const handleManualEngineRecalculation = () => {
    const res = recalculateMarketValuesFromWeeklyTrades();
    setSuccessMsg(res.message);
    confetti({ particleCount: 50, spread: 70 });
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const filteredPlayers = players.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.name.toLowerCase().includes(q)) return false;
    }
    if (filterClub !== 'ALL' && p.clubId !== filterClub) return false;
    if (filterPos !== 'ALL' && p.position !== filterPos) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex flex-col font-sans">
      {/* Top Standalone Creator Navigation Bar */}
      <header className="bg-slate-900/95 border-b border-indigo-900/60 sticky top-0 z-40 px-4 py-3 shadow-2xl backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-white tracking-tight uppercase">
                Creator &amp; Commissioner OS
              </h1>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                ADMIN OFICIAL
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Dashboard de control dedicat creatorului SuperManager România
            </p>
          </div>
        </div>

        <button
          onClick={onExit}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white transition-all shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Înapoi în Joc</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5 pb-20">
        {/* Quick KPI Strip */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Fotbaliști Înregistrați</span>
            <span className="font-mono font-black text-xl text-white mt-0.5 block">{players.length}</span>
            <span className="text-[10px] text-emerald-400">Superliga României</span>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Oferte Active Piață</span>
            <span className="font-mono font-black text-xl text-emerald-400 mt-0.5 block">{unifiedMarketItems.length}</span>
            <span className="text-[10px] text-slate-400">Transfermarkt &amp; Ligi</span>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Motor Recalculare</span>
            <span className="font-mono font-black text-base text-indigo-400 mt-0.5 block">ACTIV (Auto)</span>
            <span className="text-[10px] text-slate-400">Săptămânal la etapă</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-bold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('addPlayer')}
            className={`shrink-0 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'addPlayer'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adaugă Fotbalist</span>
          </button>

          <button
            onClick={() => setActiveTab('managePlayers')}
            className={`shrink-0 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'managePlayers'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Gestionare Jucători &amp; Status</span>
          </button>

          <button
            onClick={() => setActiveTab('marketEngine')}
            className={`shrink-0 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'marketEngine'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Motor Cote</span>
          </button>

          <button
            onClick={() => setActiveTab('databaseAndApis')}
            className={`shrink-0 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'databaseAndApis'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/30'
                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Bază de Date &amp; API-uri</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/60 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: ADD NEW PLAYER */}
        {activeTab === 'addPlayer' && (
          <form onSubmit={handleCreatePlayer} className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl text-xs">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                Înregistrare Jucător Nou în SuperManager
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Fotbalistul va fi adăugat în baza de date cu cota inițială Transfermarkt și va fi listat automat pe piața de transferuri.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Prenume</label>
                <input
                  type="text"
                  placeholder="ex: Alexandru"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nume de Familie</label>
                <input
                  type="text"
                  placeholder="ex: Mitriță"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Club Superliga</label>
                <select
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                >
                  {SUPERLIGA_CLUBS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.shortName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Poziție Oficială</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as PlayerPosition)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                >
                  <option value="GK">Portar (GK)</option>
                  <option value="DEF">Fundaș (DEF)</option>
                  <option value="MID">Mijlocaș (MID)</option>
                  <option value="FWD">Atacant (FWD)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Cotă Inițială de Piață (Transfermarkt €)
                </label>
                <input
                  type="number"
                  step="50000"
                  min="200000"
                  value={marketValue}
                  onChange={(e) => setMarketValue(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-emerald-400 font-mono font-bold"
                  required
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Cota afișată: {formatFullCurrency(marketValue)}
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Naționalitate</label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-slate-300 font-semibold block mb-1">URL Fotografie / Avatar Jucător (Opțional)</label>
                <input
                  type="url"
                  placeholder="https://... (lăsat gol generează automat avatar sportiv)"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Înregistrează Oficial &amp; Listează pe Piață</span>
            </button>
          </form>
        )}

        {/* TAB 2: MANAGE EXISTING PLAYERS */}
        {activeTab === 'managePlayers' && (
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl text-xs">
            <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Baza de Date Fotbaliști ({players.length})</h3>
                <p className="text-[11px] text-slate-400">Actualizează cotele Transfermarkt sau statutul medical/disciplinar</p>
              </div>

              {/* Search bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Caută după nume..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <select
                value={filterClub}
                onChange={(e) => setFilterClub(e.target.value)}
                className="p-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
              >
                <option value="ALL">Toate Cluburile</option>
                {SUPERLIGA_CLUBS.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={filterPos}
                onChange={(e) => setFilterPos(e.target.value)}
                className="p-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
              >
                <option value="ALL">Toate Pozițiile</option>
                <option value="GK">Portari</option>
                <option value="DEF">Fundași</option>
                <option value="MID">Mijlocași</option>
                <option value="FWD">Atacanți</option>
              </select>
            </div>

            {/* Players Table / List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredPlayers.map((player) => {
                const club = SUPERLIGA_CLUBS.find((c) => c.id === player.clubId);

                return (
                  <div
                    key={player.id}
                    className="p-3 bg-slate-800/40 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={player.avatar}
                        alt={player.name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700 bg-slate-950 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=05df72&bold=true`;
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-sm">{player.name}</span>
                          <span className="text-[10px] font-mono px-1 rounded bg-slate-700 text-slate-300">
                            {player.position}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[11px]">
                          {club?.name} · Cotă Transfermarkt: <b className="text-emerald-400 font-mono">{formatCurrency(player.marketValue)}</b>
                        </span>
                      </div>
                    </div>

                    {/* Status actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => updatePlayerStatus(player.id, 'active')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                          player.status === 'active'
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Activ
                      </button>

                      <button
                        onClick={() => updatePlayerStatus(player.id, 'injured', 'Entorsă de gleznă (indisponibil 2 săptămâni)')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                          player.status === 'injured'
                            ? 'bg-rose-600 text-white font-black'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Accidentat
                      </button>

                      <button
                        onClick={() => updatePlayerStatus(player.id, 'suspended', 'Cumul de cartonașe galbene (1 etapă suspendare)')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                          player.status === 'suspended'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Suspendat
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: MARKET & ENGINE CONTROLS */}
        {activeTab === 'marketEngine' && (
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl text-xs">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Motorul de Calcul al Cotelor Transfermarkt
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Conform cerințelor jocului, valoarea jucătorilor se actualizează automat în background la sfârșitul fiecărei etape.
                Cota se calibrează în funcție de media sumei de transfer a jucătorului pe ultima săptămână din toate ligile existente, combinată cu evoluția din teren.
              </p>
            </div>

            <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl space-y-2">
              <span className="font-bold text-white block">Status Motor: Rulare Automată în Background</span>
              <p className="text-slate-300 text-[11px]">
                Jucătorii din aplicație nu au nevoie de buton manual pe piață. Cotele lor fluctuează transparent în background la încheierea fiecărei etape din calendarul oficial al Superligii.
              </p>

              <div className="pt-2">
                <button
                  onClick={handleManualEngineRecalculation}
                  className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Forțează Recalcularea Imediată a Cotelor din Toate Ligile</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DATABASE & APIS */}
        {activeTab === 'databaseAndApis' && (
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
            <DatabaseAndApisPanel />
          </div>
        )}
      </main>
    </div>
  );
};
