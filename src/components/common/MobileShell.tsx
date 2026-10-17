import React, { useState } from 'react';
import { useFantasy } from '../../context/FantasyContext';
import { TacticalPitchView } from '../squad/TacticalPitchView';
import { ClubDashboardView } from '../club/ClubDashboardView';
import { LiveMatchdayView } from '../live/LiveMatchdayView';
import { TransferMarketView } from '../market/TransferMarketView';
import { LeaderboardView } from '../leaderboard/LeaderboardView';
import { SuperPredictorAndRewardsView } from '../rewards/SuperPredictorAndRewardsView';
import { CreatorDashboardView } from '../creator/CreatorDashboardView';
import { GameAuthAndOnboardingFlow } from '../auth/GameAuthAndOnboardingFlow';
import { NotificationsModal } from './NotificationsModal';
import { AuthAndSettingsModal } from '../auth/AuthAndSettingsModal';
import { AdminDashboardModal } from '../admin/AdminDashboardModal';
import { formatCurrency } from '../../utils/scoringEngine';
import { SplashScreen } from './SplashScreen';
import {
  Shield,
  Users,
  Flame,
  Store,
  Trophy,
  Sparkles,
  Bell,
  Settings,
  Smartphone,
  Maximize2,
  Wifi,
  Battery,
  Award,
  Coins,
  Database,
} from 'lucide-react';

export const MobileShell: React.FC = () => {
  const { user, isAuthenticated, unreadNotificationsCount, isLiveMatchWindow, squadPointsMatchday } = useFantasy();

  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<'club' | 'squad' | 'live' | 'market' | 'leaderboard' | 'hub'>('club');
  const [isIPhoneFrame, setIsIPhoneFrame] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'addPlayer' | 'managePlayers' | 'leagueSettings' | 'databaseAndApis'>('databaseAndApis');
  const [isCreatorMode, setIsCreatorMode] = useState(false);

  // Animated Splash Screen (2 seconds with game logo & smooth fade)
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // If user is not logged in or has not finished onboarding (including 14-player starter squad allocation)
  if (!isAuthenticated || !user.starterPackClaimed) {
    return (
      <GameAuthAndOnboardingFlow
        onComplete={() => setActiveTab('club')}
        onCreatorLogin={() => setIsCreatorMode(true)}
      />
    );
  }

  if (isCreatorMode) {
    return <CreatorDashboardView onExit={() => setIsCreatorMode(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#181b22] text-slate-100 flex flex-col items-center justify-start p-0 sm:py-6 sm:px-4 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Device Mode Switcher (Floating on Desktop) */}
      <div className="hidden sm:flex items-center gap-3 mb-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 px-3 rounded-2xl shadow-xl z-30">
        <span className="text-xs text-slate-400 font-medium">Format vizualizare:</span>
        <button
          onClick={() => setIsIPhoneFrame(true)}
          className={`flex items-center gap-1.5 py-1 px-3 rounded-xl text-xs font-bold transition-all ${
            isIPhoneFrame
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>iPhone 16 Pro (iOS)</span>
        </button>

        <button
          onClick={() => setIsIPhoneFrame(false)}
          className={`flex items-center gap-1.5 py-1 px-3 rounded-xl text-xs font-bold transition-all ${
            !isIPhoneFrame
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Ecran Complet (Web Responsive)</span>
        </button>
      </div>

      {/* Main Container: modern slate-gray background */}
      <div
        className={`w-full transition-all duration-300 relative flex flex-col ${
          isIPhoneFrame
            ? 'max-w-[430px] h-[100dvh] sm:h-[880px] sm:max-h-[92vh] bg-[#14161d] sm:rounded-[48px] sm:border-[8px] sm:border-slate-800/90 sm:shadow-[0_25px_70px_rgba(0,0,0,0.85)] sm:ring-1 sm:ring-slate-700/50 overflow-hidden'
            : 'max-w-5xl bg-[#14161d] sm:rounded-3xl sm:border border-slate-800/80 p-2 sm:p-6 shadow-2xl min-h-screen pb-24'
        }`}
      >
        {/* iOS Dynamic Island & Status Bar (Only in Phone Frame) */}
        {isIPhoneFrame && (
          <div className="shrink-0 sticky top-0 z-40 bg-[#161922]/95 backdrop-blur-md pt-2 px-6 pb-1 flex items-center justify-between text-xs text-slate-300 select-none">
            <span className="font-semibold font-mono tracking-tight text-[13px]">20:30</span>

            {/* Dynamic Island Pill */}
            <div className="w-28 h-6 bg-black rounded-full flex items-center justify-center gap-2 px-2 shadow-inner border border-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-emerald-400 truncate">
                LIVE {squadPointsMatchday}p
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5" />
              <Battery className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Top iOS App Bar Header */}
        <header className="shrink-0 sticky top-0 z-30 bg-[#161922]/95 backdrop-blur-md px-4 py-3 border-b border-slate-800/80 flex items-center justify-between gap-3">
          {/* User profile trigger */}
          <div
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2.5 cursor-pointer min-w-0"
          >
            <div className="relative shrink-0">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover border-2 border-emerald-400"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[8px] font-black text-amber-400">
                ★
              </span>
            </div>

            <div className="min-w-0">
              <h1 className="text-xs font-black text-white tracking-tight truncate flex items-center gap-1">
                <span>SuperManager</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase font-mono ${
                    user.membership === 'creator'
                      ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                      : user.membership === 'admin'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : user.membership === 'pro'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-700/40 text-slate-400 border-slate-600/40'
                  }`}
                >
                  {user.membership || 'GRATUIT'}
                </span>
              </h1>
              <span className="text-[11px] text-slate-400 truncate block">
                {user.teamName}
              </span>
            </div>
          </div>

          {/* Quick budget & Notification actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Creator OS shortcut button for creator account */}
            {user.membership === 'creator' && (
              <button
                onClick={() => setIsCreatorMode(true)}
                className="py-1 px-2 rounded-xl bg-indigo-950/80 border border-indigo-500/50 hover:bg-indigo-900/80 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                title="Deschide Creator & Commissioner OS"
              >
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] hidden sm:inline">Creator OS</span>
              </button>
            )}

            {/* Quick budget chip */}
            <div
              onClick={() => setActiveTab('market')}
              className="py-1 px-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 cursor-pointer hover:border-slate-700 transition-colors"
            >
              <span>{formatCurrency(user.budget)}</span>
            </div>

            {/* Notification bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 flex items-center justify-center transition-colors"
              aria-label="Notificări"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono font-bold text-[9px] flex items-center justify-center animate-pulse shadow-md">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Settings cog */}
            <button
              onClick={() => setShowSettings(true)}
              className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 flex items-center justify-center transition-colors"
              aria-label="Setări Cont"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Main Content Body */}
        <main className={`flex-1 overflow-y-auto px-3.5 py-4 min-h-0 overscroll-contain ${!isIPhoneFrame ? 'pb-24 sm:pb-28' : ''}`}>
          {activeTab === 'club' && <ClubDashboardView />}
          {activeTab === 'squad' && <TacticalPitchView />}
          {activeTab === 'live' && <LiveMatchdayView />}
          {activeTab === 'market' && <TransferMarketView />}
          {activeTab === 'leaderboard' && <LeaderboardView />}
          {activeTab === 'hub' && <SuperPredictorAndRewardsView />}
        </main>

        {/* iOS Native Bottom Tab Bar: Fixat jos permanent */}
        <nav
          className={
            isIPhoneFrame
              ? 'shrink-0 z-40 bg-[#161922]/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 pb-2 sm:pb-3 shadow-2xl select-none'
              : 'fixed bottom-0 left-0 right-0 z-40 bg-[#161922]/95 backdrop-blur-lg border-t border-slate-800/80 shadow-2xl select-none'
          }
        >
          <div className={!isIPhoneFrame ? 'max-w-xl mx-auto px-2 py-1 pb-2' : ''}>
            <div className="grid grid-cols-5 items-center">
              {/* Tab 1: Club (Landing Page / Dashboard) */}
              <button
                onClick={() => setActiveTab('club')}
                className={`flex flex-col items-center justify-center py-1 transition-all ${
                  activeTab === 'club' ? 'text-emerald-400 scale-105' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className={`w-5 h-5 ${activeTab === 'club' ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-center mt-1">Club</span>
              </button>

              {/* Tab 2: Echipa */}
              <button
                onClick={() => setActiveTab('squad')}
                className={`flex flex-col items-center justify-center py-1 transition-all ${
                  activeTab === 'squad' ? 'text-emerald-400 scale-105' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className={`w-5 h-5 ${activeTab === 'squad' ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-center mt-1">Echipa</span>
              </button>

              {/* Tab 3: Meci (cu LIVE badge) */}
              <button
                onClick={() => setActiveTab('live')}
                className={`flex flex-col items-center justify-center py-1 transition-all relative ${
                  activeTab === 'live' ? 'text-emerald-400 scale-105' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Flame className={`w-5 h-5 ${activeTab === 'live' ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  <span className="absolute -top-1 -right-3.5 bg-rose-600 text-white text-[7px] font-black px-1 py-0.2 rounded-full shadow tracking-tighter animate-pulse">
                    LIVE
                  </span>
                </div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-center mt-1">Meci</span>
              </button>

              {/* Tab 4: Transferuri */}
              <button
                onClick={() => setActiveTab('market')}
                className={`flex flex-col items-center justify-center py-1 transition-all ${
                  activeTab === 'market' ? 'text-emerald-400 scale-105' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Store className={`w-5 h-5 ${activeTab === 'market' ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-center mt-1">Transferuri</span>
              </button>

              {/* Tab 5: Clasament */}
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`flex flex-col items-center justify-center py-1 transition-all ${
                  activeTab === 'leaderboard' ? 'text-emerald-400 scale-105' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Trophy className={`w-5 h-5 ${activeTab === 'leaderboard' ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-center mt-1">Clasament</span>
              </button>
            </div>

            {/* iOS Home Indicator Bar */}
            {isIPhoneFrame && (
              <div className="w-32 h-1 bg-slate-700/60 rounded-full mx-auto mt-2 select-none" />
            )}
          </div>
        </nav>

        {/* Notifications Modal */}
        {showNotifications && (
          <NotificationsModal onClose={() => setShowNotifications(false)} />
        )}

        {/* Auth & Settings Modal */}
        {showSettings && (
          <AuthAndSettingsModal
            onClose={() => setShowSettings(false)}
            onOpenCreatorMode={() => {
              setShowSettings(false);
              setIsCreatorMode(true);
            }}
            onOpenAdminDashboard={(tab) => {
              setShowSettings(false);
              setAdminInitialTab(tab || 'databaseAndApis');
              setShowAdminDashboard(true);
            }}
          />
        )}

        {/* Admin Dashboard Modal (Bază de Date & API-uri, Jucători, Reguli Ligă) */}
        {showAdminDashboard && (
          <AdminDashboardModal
            initialTab={adminInitialTab}
            onClose={() => setShowAdminDashboard(false)}
          />
        )}
      </div>
    </div>
  );
};
