import React, { useState, useMemo } from 'react';
import { useFantasy } from '../../context/FantasyContext';
import { StarterSquadRevealView } from '../onboarding/StarterSquadRevealView';
import { generateRandomStarterSquad } from '../../data/superligaAll16ClubsPlayers';
import {
  Shield,
  Trophy,
  Users,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  User,
  PlusCircle,
  Search,
  ExternalLink,
  Coins,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameAuthAndOnboardingFlowProps {
  onComplete: () => void;
  onCreatorLogin?: () => void;
}

export const GameAuthAndOnboardingFlow: React.FC<GameAuthAndOnboardingFlowProps> = ({ onComplete, onCreatorLogin }) => {
  const {
    user,
    isAuthenticated,
    login,
    loginWithProvider,
    registerUserAccount,
    createNewLeague,
    joinLeagueByCode,
    leagueSettings,
    leagueMembers,
    players,
    activeClubs,
    squad,
    allocateStarterSquad,
  } = useFantasy();

  // Internal Step: 1 = Auth, 2 = Create/Join League, 3 = Invite Friends, 4 = Starter Squad Reveal (14 Players / €5M)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(() => (!isAuthenticated ? 1 : !user.starterPackClaimed ? 4 : 2));

  // Step 2: League mode state
  const [leagueMode, setLeagueMode] = useState<'create' | 'join'>('create');
  const [virtualLeagueName, setVirtualLeagueName] = useState('Liga Prietenilor Superliga');
  const [budgetPerTeam, setBudgetPerTeam] = useState<number>(50000000); // 50M EUR
  const [maxSameClubPlayers, setMaxSameClubPlayers] = useState<number>(3);
  const [joinLeagueCodeInput, setJoinLeagueCodeInput] = useState('');
  const [leagueError, setLeagueError] = useState<string | null>(null);

  // Collect all player IDs already assigned to any member in this league (prevents duplicates)
  const assignedLeaguePlayerIds = useMemo(() => {
    const ids = new Set<string>();
    leagueMembers.forEach((m) => {
      m.startingLineup?.forEach((s) => {
        if (s.playerId) ids.add(s.playerId);
      });
    });
    Object.values(squad.startingSlots).forEach((id) => {
      if (id) ids.add(id);
    });
    squad.benchPlayerIds.forEach((id) => {
      if (id) ids.add(id);
    });
    return ids;
  }, [leagueMembers, squad]);

  // Pre-generate starter squad of 14 players respecting:
  // 1. maxSameClubPlayers limit from league settings
  // 2. Unassigned non-duplicate players
  // 3. Only active clubs
  const randomStarterSquad = useMemo(() => {
    return generateRandomStarterSquad(players, {
      maxSameClubPlayers: leagueSettings?.maxSameClubPlayers || maxSameClubPlayers || 3,
      assignedPlayerIds: assignedLeaguePlayerIds,
      activeClubIds: activeClubs.map((c) => c.id),
    });
  }, [players, leagueSettings?.maxSameClubPlayers, maxSameClubPlayers, assignedLeaguePlayerIds, activeClubs]);

  // Step 1: Auth form state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [managerName, setManagerName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Step 3: Invite state
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const activeLeagueCode = leagueSettings?.leagueCode || 'SUP-2025';
  const inviteLink = `https://supermanager-liga1.ro/join?code=${activeLeagueCode}`;

  // Handle Step 1 Auth submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!email || !password) {
      setAuthError('Te rugăm să completezi emailul și parola.');
      return;
    }

    if (authMode === 'register') {
      const res = await registerUserAccount({
        email,
        password,
        name: managerName || 'Manager Superliga',
        teamName: teamName || 'Clubul Meu FC',
      });
      if (res.success) {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
        setStep(2);
      } else {
        setAuthError(res.message);
      }
    } else {
      const res = await login(email, password);
      if (res.success) {
        if (res.isCreator) {
          if (onCreatorLogin) {
            onCreatorLogin();
          } else {
            onComplete();
          }
          return;
        }
        // If user already has a league configured, complete immediately, else go to step 2
        if (res.hasLeague) {
          onComplete();
        } else {
          setStep(2);
        }
      } else {
        setAuthError(res.message || 'Date de conectare incorecte.');
      }
    }
  };

  // Handle Social Providers
  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    setAuthError(null);
    loginWithProvider(provider);
    confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 } });
    setStep(2);
  };

  // Handle Step 2 League submit
  const handleLeagueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeagueError(null);

    if (leagueMode === 'create') {
      if (!virtualLeagueName.trim()) {
        setLeagueError('Te rugăm să alegi un nume pentru ligă.');
        return;
      }
      const res = await createNewLeague({
        name: virtualLeagueName,
        startingBudget: budgetPerTeam,
        maxSameClubPlayers,
      });
      if (res.success) {
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
        setStep(3);
      } else {
        setLeagueError(res.message);
      }
    } else {
      if (!joinLeagueCodeInput.trim()) {
        setLeagueError('Te rugăm să introduci codul sau linkul ligii.');
        return;
      }
      const res = await joinLeagueByCode(joinLeagueCodeInput.trim());
      if (res.success) {
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
        setStep(3);
      } else {
        setLeagueError(res.message);
      }
    }
  };

  // Copy helpers
  const handleCopyCode = () => {
    navigator.clipboard?.writeText(activeLeagueCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // STEP 4: STARTER SQUAD ALLOCATION (14 PLAYERS / ~€5M)
  if (step === 4) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0B0E14] text-white overflow-y-auto">
        <StarterSquadRevealView
          allocatedSquad={randomStarterSquad}
          onCompleteSquad={(squad) => {
            allocateStarterSquad(squad);
            onComplete();
          }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0E14] text-white flex flex-col justify-between overflow-y-auto px-4 py-6 sm:py-10">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Top Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-3 shadow-lg shadow-emerald-500/20 mb-1">
            <Shield className="w-8 h-8 text-slate-950 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            SuperManager <span className="text-emerald-400">Liga 1</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Singurul fantasy game oficial cu reguli live, acțiuni din meciuri reale și ligă privată cu prietenii.
          </p>

          {/* Stepper Progress Bar (4 Pasi: Cont -> Liga -> Invitatie -> Lot 14 Jucatori) */}
          <div className="flex items-center justify-center gap-2 pt-3">
            <div className={`h-1.5 rounded-full transition-all ${step === 1 ? 'w-10 bg-emerald-400' : 'w-4 bg-emerald-400/50'}`} />
            <div className={`h-1.5 rounded-full transition-all ${step === 2 ? 'w-10 bg-emerald-400' : step > 2 ? 'w-4 bg-emerald-400/50' : 'w-4 bg-slate-800'}`} />
            <div className={`h-1.5 rounded-full transition-all ${step === 3 ? 'w-10 bg-emerald-400' : 'w-4 bg-slate-800'}`} />
            <div className="h-1.5 rounded-full transition-all w-4 bg-slate-800" />
          </div>
        </div>

        {/* ================= STEP 1: AUTHENTICATION / REGISTRATION ================= */}
        {step === 1 && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex p-1 bg-slate-950/70 rounded-2xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  authMode === 'register' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Înregistrare Cont Nou
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  authMode === 'login' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Conectare
              </button>
            </div>

            {/* Social 1-Click Auth Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleSocialAuth('google')}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-bold text-slate-200 transition-all shadow-sm active:scale-95"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.4 7.5 23 12 23z"
                  />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialAuth('apple')}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-bold text-slate-200 transition-all shadow-sm active:scale-95"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.87-.93.04-2.02.63-2.66 1.38-.56.65-1.06 1.7-0.93 2.74 1.05.08 2.07-.5 2.67-1.25z" />
                </svg>
                <span>Apple ID</span>
              </button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                sau cu email &amp; parolă
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Nume Manager
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={managerName}
                        onChange={(e) => setManagerName(e.target.value)}
                        placeholder="Ex: Andrei Popa"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Nume Virtual Club / Echipă
                    </label>
                    <div className="relative">
                      <Shield className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Ex: Tricolorii FC"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Adresă de Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="manager@superliga.ro"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Parolă
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {authMode === 'login' && (
                <div className="p-2.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-center justify-between gap-2 text-[11px]">
                  <div>
                    <span className="font-bold text-indigo-300 block">Creator &amp; Commissioner OS</span>
                    <span className="text-slate-400 font-mono text-[10px]">creator@supermanager.ro • 1923</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('creator@supermanager.ro');
                      setPassword('1923');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold text-[10px] border border-indigo-500/40 shrink-0"
                  >
                    Completează
                  </button>
                </div>
              )}

              {authError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all mt-2"
              >
                <span>{authMode === 'register' ? 'Creează Contul & Pasul Următor' : 'Intră în Joc'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ================= STEP 2: CREATE OR JOIN LEAGUE ================= */}
        {step === 2 && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                Pasul 2 din 3: Configurarea Ligii
              </span>
              <h2 className="text-lg font-black text-white">
                Intră într-o Ligă sau Creează Una Nouă
              </h2>
              <p className="text-xs text-slate-400">
                Toate transferurile, clasamentul și licitațiile se desfășoară în interiorul ligii tale.
              </p>
            </div>

            <div className="flex p-1 bg-slate-950/70 rounded-2xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLeagueMode('create')}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  leagueMode === 'create' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                Creează Ligă Nouă
              </button>
              <button
                type="button"
                onClick={() => setLeagueMode('join')}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  leagueMode === 'join' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                Introdu Cod / Link
              </button>
            </div>

            <form onSubmit={handleLeagueSubmit} className="space-y-4">
              {leagueMode === 'create' ? (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Nume Virtual Ligă
                    </label>
                    <input
                      type="text"
                      value={virtualLeagueName}
                      onChange={(e) => setVirtualLeagueName(e.target.value)}
                      placeholder="Ex: Liga Campionilor 2025"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-bold text-slate-300">
                        Buget Inițial per Echipă
                      </label>
                      <span className="text-xs font-mono font-black text-emerald-400">
                        {budgetPerTeam / 1000000} Milioane €
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[30000000, 50000000, 75000000].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBudgetPerTeam(b)}
                          className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                            budgetPerTeam === b
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          €{b / 1000000}M
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-bold text-slate-300">
                        Număr Maxim Jucători de la Același Club
                      </label>
                      <span className="text-xs font-mono font-black text-amber-400">
                        {maxSameClubPlayers} jucători
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setMaxSameClubPlayers(num)}
                          className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                            maxSameClubPlayers === num
                              ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          Max {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Cod Ligă sau Link de Invitație
                    </label>
                    <input
                      type="text"
                      value={joinLeagueCodeInput}
                      onChange={(e) => setJoinLeagueCodeInput(e.target.value)}
                      placeholder="Ex: SUP-2025 sau link complet"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 uppercase"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Exemplu cod test: <b className="text-slate-300">SUPERLIGA-1</b> sau <b className="text-slate-300">SUP-2025</b>
                    </span>
                  </div>
                </div>
              )}

              {leagueError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  {leagueError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <span>{leagueMode === 'create' ? 'Creează Liga & Mergi la Invitații' : 'Alătură-te Ligii'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ================= STEP 3: INVITE FRIENDS VIA LINK OR CODE ================= */}
        {step === 3 && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-center">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto">
              <Trophy className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                Pasul 3 din 3: Invitație Prieteni
              </span>
              <h2 className="text-xl font-black text-white">
                Liga Ta Este Gata!
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Trimite codul sau linkul de mai jos prietenilor tăi pentru a intra în aceeași ligă și a concura la transferuri.
              </p>
            </div>

            {/* Code Box */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Cod Unic Ligă</span>
                <span className="text-base font-black font-mono text-emerald-400 tracking-wider">
                  {activeLeagueCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copiat!' : 'Copiază Cod'}</span>
              </button>
            </div>

            {/* Invite Link Box */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-2">
              <div className="text-left min-w-0">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Link de Invitație</span>
                <span className="text-xs font-mono text-slate-300 truncate block">
                  {inviteLink}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition-all shrink-0 shadow"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copiat!' : 'Copiază Link'}</span>
              </button>
            </div>

            {/* Continue to Starter Squad Allocation (Step 4) */}
            <button
              type="button"
              onClick={() => setStep(4)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 active:scale-95 transition-all mt-4"
            >
              <span>Pasul Următor: Primire Lot de Debut (14 Jucători)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="text-center pt-6 text-[11px] text-slate-500">
        SuperManager România &copy; 2025 · Toate datele sunt salvate în baza de date persistentă
      </div>
    </div>
  );
};
