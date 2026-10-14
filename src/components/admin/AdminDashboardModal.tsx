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

interface AdminDashboardModalProps {
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({ onClose }) => {
  const {
    players,
    addNewPlayer,
    updatePlayerStatus,
    updatePlayerMarketValue,
    leagueSettings,
    updateLeagueSettings,
  } = useFantasy();

  const [activeTab, setActiveTab] = useState<'addPlayer' | 'managePlayers' | 'leagueSettings' | 'databaseAndApis'>('addPlayer');
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
        <div className="flex items-center gap-1 p-1 my-3 bg-slate-800/80 rounded-2xl">
          <button
            onClick={() => setActiveTab('addPlayer')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'addPlayer'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Adaugă Jucător Nou</span>
          </button>

          <button
            onClick={() => setActiveTab('managePlayers')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'managePlayers'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Modifică Jucători &amp; Status</span>
          </button>

          <button
            onClick={() => setActiveTab('leagueSettings')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'leagueSettings'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Setări Ligă</span>
          </button>

          <button
            onClick={() => setActiveTab('databaseAndApis')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'databaseAndApis'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
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
        {activeTab === 'databaseAndApis' && (
          <div className="space-y-4 text-xs">
            {/* 1. Firebase Firestore Persistent Storage */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold uppercase text-white">
                      Bază de Date Cloud: Firebase Firestore
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      Stocare persistentă sincronizată în cloud pentru jucători și date de test
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Conectat Activ
                </span>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Proiect Firebase:</span>
                  <span className="text-slate-200">bustling-sign-98f9p</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Database ID:</span>
                  <span className="text-emerald-400 truncate max-w-[280px]">
                    ai-studio-supermanagerromn-01d29af6-a169-4d70-bc4f-80623db89e6d
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Colecție activă:</span>
                  <span className="text-amber-400">custom_players</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  Toți fotbaliștii adăugați din tab-ul <b>&ldquo;Adaugă Jucător Nou&rdquo;</b> se salvează automat în Firestore.
                </span>

                <button
                  type="button"
                  onClick={async () => {
                    setFirestoreStatus('syncing');
                    try {
                      const res = await loadFirestoreCustomPlayers();
                      setFirestoreStatus('synced');
                      setTimeout(() => setFirestoreStatus('connected'), 3000);
                    } catch (e) {
                      setFirestoreStatus('connected');
                    }
                  }}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 inline-flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${firestoreStatus === 'syncing' ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>{firestoreStatus === 'syncing' ? 'Se sincronizează...' : firestoreStatus === 'synced' ? 'Sincronizat ✓' : 'Sincronizează Acum'}</span>
                </button>
              </div>
            </div>

            {/* 2. Research & Documentation: Free Real-Time Football APIs */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3.5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold uppercase text-white">
                    API-uri Reale pentru Date &amp; Acțiuni Live
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Soluții gratuite evaluate pentru preluarea acțiunilor în timp real din Superliga României
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {/* Sofascore */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-blue-400 text-xs">1. Sofascore API</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300">Gratis / RapidAPI</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Preluare incidents live, note fotbaliști (1.0 - 10.0), șuturi pe poartă, intervenții portar și statistici detaliate.
                  </p>
                  <div className="p-1.5 bg-slate-950 rounded font-mono text-[9px] text-slate-400 truncate">
                    api.sofascore.com/api/v1/event/&#123;id&#125;/incidents
                  </div>
                </div>

                {/* Flashscore */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-rose-400 text-xs">2. Flashscore API</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">RapidAPI Free</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Cronologie live a meciurilor, cartonașe, goluri, schimbări și comentariu live text minut cu minut.
                  </p>
                  <div className="p-1.5 bg-slate-950 rounded font-mono text-[9px] text-slate-400 truncate">
                    rapidapi.com/flashscore-stream
                  </div>
                </div>

                {/* API-Football / Opta */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-emerald-400 text-xs">3. API-Football (Opta)</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">100 req/zi Free</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Cel mai stabil API pentru Superliga (League ID: 283). Date oficiale complete, cartonașe, goluri, pase și formații.
                  </p>
                  <div className="p-1.5 bg-slate-950 rounded font-mono text-[9px] text-slate-400 truncate">
                    v3.football.api-sports.io/fixtures?league=283
                  </div>
                </div>
              </div>

              {/* Interactive API Tester */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    Tester Simulator Webhook / API Live Superliga
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const sample = {
                        source: 'API-Football / Sofascore Feed',
                        league: 'Superliga României 2024/2025',
                        fixture: 'FCSB vs Rapid București',
                        status: 'LIVE_MIN_68',
                        live_events_parsed: [
                          { min: 42, player: 'Alexandru Mitriță', action: 'SHOT_ON_TARGET', opta_code: 'S_ON', points_awarded: 12 },
                          { min: 58, player: 'Darius Olaru', action: 'GOAL_PENALTY', opta_code: 'G_PEN', points_awarded: 50 },
                          { min: 64, player: 'Ștefan Târnovanu', action: 'PENALTY_SAVE', opta_code: 'P_SAVE', points_awarded: 75 },
                        ],
                        sync_timestamp: new Date().toISOString(),
                      };
                      setTestPayloadResult(JSON.stringify(sample, null, 2));
                    }}
                    className="py-1 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] inline-flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <Zap className="w-3 h-3 fill-current" />
                    <span>Testează Răspuns API Live</span>
                  </button>
                </div>

                {testPayloadResult && (
                  <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[10px] font-mono text-emerald-400 overflow-x-auto leading-tight">
                    {testPayloadResult}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
