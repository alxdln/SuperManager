import React from 'react';
import { useFantasy } from '../../context/FantasyContext';
import { X, Bell, CheckCheck, Trash2, ShieldAlert, ArrowLeftRight, Flame, Award, Gavel } from 'lucide-react';

interface NotificationsModalProps {
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ onClose }) => {
  const { notifications, markNotificationsAsRead, dismissNotification } = useFantasy();

  const getIcon = (type: string) => {
    switch (type) {
      case 'live_event':
        return <Flame className="w-4 h-4 text-amber-400" />;
      case 'injury':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'transfer':
        return <ArrowLeftRight className="w-4 h-4 text-emerald-400" />;
      case 'auction':
        return <Gavel className="w-4 h-4 text-indigo-400" />;
      case 'reward':
        return <Award className="w-4 h-4 text-blue-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 text-slate-100 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Centru Notificări Push</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between py-2.5 shrink-0 text-xs text-slate-400">
          <span>{notifications.length} notificări primite</span>
          <button
            onClick={markNotificationsAsRead}
            className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Marchează citite
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              Nu ai notificări noi în acest moment.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                  n.read ? 'bg-slate-800/30 border-slate-800/60 opacity-80' : 'bg-slate-800/80 border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">{n.title}</span>
                    <p className="text-xs text-slate-300 mt-0.5 leading-snug">{n.message}</p>
                    <span className="text-[10px] text-slate-500 font-mono block mt-1">{n.time}</span>
                  </div>
                </div>

                <button
                  onClick={() => dismissNotification(n.id)}
                  className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                  title="Șterge"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
