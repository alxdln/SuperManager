import React, { useState } from 'react';
import { useFantasy } from '../../context/FantasyContext';
import { formatCurrency, formatFullCurrency } from '../../utils/scoringEngine';
import {
  X,
  User,
  Lock,
  Mail,
  Shield,
  LogOut,
  CheckCircle2,
  Apple,
  Globe,
  Sliders,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  Database,
} from 'lucide-react';

interface AuthAndSettingsModalProps {
  onClose: () => void;
  onOpenCreatorMode?: () => void;
  onOpenAdminDashboard?: (tab?: 'addPlayer' | 'managePlayers' | 'leagueSettings' | 'databaseAndApis') => void;
}

export const AuthAndSettingsModal: React.FC<AuthAndSettingsModalProps> = ({
  onClose,
  onOpenCreatorMode,
  onOpenAdminDashboard,
}) => {
  const {
    user,
    isAuthenticated,
    login,
    loginWithProvider,
    logout,
    updateUserTeamName,
    updateUserPassword,
    leagueSettings,
    updateLeagueSettings,
  } = useFantasy();

  const [activeTab, setActiveTab] = useState<'profile' | 'leagueAdmin' | 'creatorAuth' | 'password' | 'auth'>('profile');
  const [teamName, setTeamName] = useState(user.teamName);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // League admin form state (Moved to top settings)
  const [adminLeagueName, setAdminLeagueName] = useState(leagueSettings.leagueName);
  const [adminStartingBudget, setAdminStartingBudget] = useState(leagueSettings.startingBudget);
  const [adminMaxSquadSize, setAdminMaxSquadSize] = useState(leagueSettings.maxSquadSize || 16);
  const [adminAllowAuctions, setAdminAllowAuctions] = useState(leagueSettings.allowMemberAuctions);
  const [adminTransferWindow, setAdminTransferWindow] = useState(leagueSettings.transferWindowOpen);

  // Creator OS PIN authentication state
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSaveTeamName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    updateUserTeamName(teamName.trim());
    setStatusMessage('Numele echipei a fost actualizat cu succes!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSaveLeagueSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateLeagueSettings({
      leagueName: adminLeagueName,
      startingBudget: adminStartingBudget,
      maxSquadSize: adminMaxSquadSize,
      allowMemberAuctions: adminAllowAuctions,
      transferWindowOpen: adminTransferWindow,
    });
    setStatusMessage('Setările ligii au fost salvate cu succes!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleVerifyCreatorPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '1923' || pinInput === '2024') {
      setPinError(false);
      if (onOpenCreatorMode) {
        onOpenCreatorMode();
      }
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 2500);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      alert('Parolele noi nu coincid!');
      return;
    }
    updateUserPassword(newPassword);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setStatusMessage('Parola contului a fost schimbată cu succes!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPass.trim()) return;
    login(loginEmail, loginPass);
    setStatusMessage('Autentificat cu succes!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 text-slate-100 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Setări &amp; Administrare</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-800 rounded-2xl text-[11px] font-bold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-1.5 px-2.5 rounded-xl transition-all shrink-0 ${
              activeTab === 'profile' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Profil
          </button>

          <button
            onClick={() => setActiveTab('leagueAdmin')}
            className={`py-1.5 px-2.5 rounded-xl transition-all shrink-0 ${
              activeTab === 'leagueAdmin' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Admin Ligă
          </button>

          <button
            onClick={() => setActiveTab('creatorAuth')}
            className={`py-1.5 px-2.5 rounded-xl transition-all shrink-0 ${
              activeTab === 'creatorAuth' ? 'bg-indigo-600 text-white shadow' : 'text-indigo-400 hover:text-white'
            }`}
          >
            Creator Hub
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`py-1.5 px-2.5 rounded-xl transition-all shrink-0 ${
              activeTab === 'password' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Parolă
          </button>

          <button
            onClick={() => setActiveTab('auth')}
            className={`py-1.5 px-2.5 rounded-xl transition-all shrink-0 ${
              activeTab === 'auth' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cont
          </button>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* TAB 1: PROFILE */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveTeamName} className="space-y-3.5 text-xs">
            <div className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white">{user.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                      user.membership === 'creator'
                        ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                        : user.membership === 'admin'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : user.membership === 'pro'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-700/50 text-slate-300 border-slate-600'
                    }`}
                  >
                    Nivel: {user.membership || 'gratuit'}
                  </span>
                </div>
                <span className="text-slate-400 block text-[11px] truncate">{user.email}</span>
                <span className="text-emerald-400 font-mono text-[11px] block mt-0.5">
                  Buget Curent: {formatFullCurrency(user.budget)}
                </span>
                <p className="text-[10px] text-slate-400 mt-1 italic">
                  {user.membership === 'pro'
                    ? '★ Cont PRO activ: Poze reale ale jucătorilor și acces la flux live în timp real.'
                    : user.membership === 'creator'
                    ? '★ Cont Creator: Acces total la Master Database și unelte commissioner.'
                    : user.membership === 'admin'
                    ? '★ Cont Admin: Poți gestiona setările ligii tale și membrii.'
                    : 'Cont Gratuit: Avatare gri și puncte afișate la finalul etapei.'}
                </p>
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Numele Echipei Tale Fantasy</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md"
            >
              Salvează Numele Echipei
            </button>
          </form>
        )}

        {/* TAB 2: LEAGUE ADMIN SETTINGS (Mutat sus la setări) */}
        {activeTab === 'leagueAdmin' && (
          <form onSubmit={handleSaveLeagueSettings} className="space-y-3 text-xs">
            <div className="border-b border-slate-800 pb-2">
              <span className="text-slate-300 font-bold block">Setări Administrative Ligă</span>
              <p className="text-slate-400 text-[11px]">
                Gestionează regulile de transfer și parametrii financiari ai ligii tale private.
              </p>
            </div>

            {onOpenAdminDashboard && (
              <div className="p-3 bg-slate-950/80 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Panou Bază de Date &amp; API-uri</span>
                    <span className="text-[10px] text-slate-400 block">Sincronizare cloud Firestore &amp; teste API Superliga</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAdminDashboard('databaseAndApis')}
                  className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 transition-all flex items-center gap-1 shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  <span>Deschide</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Numele Ligii</label>
              <input
                type="text"
                value={adminLeagueName}
                onChange={(e) => setAdminLeagueName(e.target.value)}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold"
                required
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Buget Inițial per Echipă (€)</label>
              <input
                type="number"
                step="1000000"
                value={adminStartingBudget}
                onChange={(e) => setAdminStartingBudget(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-emerald-400 font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Număr Maxim Jucători în Lot</label>
              <input
                type="number"
                min="11"
                max="25"
                value={adminMaxSquadSize}
                onChange={(e) => setAdminMaxSquadSize(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Standard regulament: 16 jucători (minim 11, minim 1 portar).
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminAllowAuctions}
                  onChange={(e) => setAdminAllowAuctions(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-slate-200">Permite licitații directe între membrii ligii</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminTransferWindow}
                  onChange={(e) => setAdminTransferWindow(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-slate-200">Fereastră de transferuri deschisă</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md mt-2"
            >
              Salvează Setările Ligii
            </button>
          </form>
        )}

        {/* TAB 3: CREATOR HUB ACCESS (Securizat cu PIN pentru Creatorul Jocului) */}
        {activeTab === 'creatorAuth' && (
          <form onSubmit={handleVerifyCreatorPin} className="space-y-3.5 text-xs">
            <div className="p-3 bg-indigo-950/40 border border-indigo-700/60 rounded-2xl space-y-1">
              <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                Acces Panou Commissioner &amp; Creator
              </span>
              <p className="text-slate-300 text-[11px]">
                Aplicație de control separată dedicată exclusiv creatorului jocului. Permite adăugarea de jucători noi în Superliga cu cote Transfermarkt, actualizarea statutului medical și recalcularea automată a pieței.
              </p>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Cod PIN Administrator (Implicit: 1923)
              </label>
              <input
                type="password"
                maxLength={6}
                placeholder="Introdu codul PIN..."
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className={`w-full p-3 bg-slate-800 border text-center font-mono text-lg tracking-widest text-white rounded-xl ${
                  pinError ? 'border-rose-500 bg-rose-950/20' : 'border-slate-700'
                }`}
                required
              />
              {pinError && (
                <span className="text-rose-400 font-bold text-[11px] block mt-1 text-center">
                  PIN incorect! Încearcă 1923.
                </span>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span>Deschide Creator OS Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* TAB 4: CHANGE PASSWORD */}
        {activeTab === 'password' && (
          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Parola Curentă</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                required
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Noua Parolă</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minim 6 caractere"
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                required
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Confirmă Noua Parolă</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Reintroduce noua parolă"
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md mt-2"
            >
              Actualizează Parola
            </button>
          </form>
        )}

        {/* TAB 5: AUTH PROVIDERS (APPLE / GOOGLE / EMAIL) */}
        {activeTab === 'auth' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-400">
              Conectează-te pentru a sincroniza lotul și clasamentele pe toate dispozitivele tale iOS și desktop.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => loginWithProvider('apple')}
                className="w-full py-2.5 px-4 rounded-xl bg-white text-slate-950 font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors shadow-sm"
              >
                <Apple className="w-4 h-4 fill-current" />
                <span>Continuă cu Apple ID</span>
              </button>

              <button
                onClick={() => loginWithProvider('google')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 text-white border border-slate-700 font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
              >
                <Globe className="w-4 h-4 text-rose-400" />
                <span>Continuă cu Google</span>
              </button>
            </div>

            <div className="relative my-3 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <span className="relative bg-slate-900 px-2 text-[10px] text-slate-500 uppercase">
                sau autentificare email
              </span>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-2.5">
              <input
                type="email"
                placeholder="Adresă email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                required
              />
              <input
                type="password"
                placeholder="Parolă"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                required
              />

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md"
              >
                Intră în Cont
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={logout}
                className="w-full py-2 text-rose-400 hover:text-rose-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Deconectare Cont</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
