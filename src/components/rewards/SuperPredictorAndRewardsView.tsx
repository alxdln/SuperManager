import React, { useState } from 'react';
import { useFantasy } from '../../context/FantasyContext';
import { SUPERLIGA_CLUBS } from '../../data/superligaData';
import {
  Coins,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const SuperPredictorAndRewardsView: React.FC = () => {
  const {
    fixtures,
    predictions,
    makePrediction,
    claimPredictionReward,
  } = useFantasy();

  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Local state for predictor inputs
  const [scoresInput, setScoresInput] = useState<Record<string, { home: number; away: number }>>(() => {
    const initial: Record<string, { home: number; away: number }> = {};
    fixtures.forEach((f) => {
      const existing = predictions[f.id];
      initial[f.id] = {
        home: existing ? existing.homeScore : f.homeScore || 0,
        away: existing ? existing.awayScore : f.awayScore || 0,
      };
    });
    return initial;
  });

  const handleScoreChange = (fixtureId: string, side: 'home' | 'away', delta: number) => {
    setScoresInput((prev) => {
      const current = prev[fixtureId] || { home: 0, away: 0 };
      const nextVal = Math.max(0, Math.min(9, current[side] + delta));
      return {
        ...prev,
        [fixtureId]: { ...current, [side]: nextVal },
      };
    });
  };

  const handleSavePrediction = (fixtureId: string) => {
    const inp = scoresInput[fixtureId] || { home: 0, away: 0 };
    makePrediction(fixtureId, inp.home, inp.away);
    setFeedbackMsg({ text: 'Predicție salvată cu succes!', type: 'success' });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Top Banner Alert if any */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-2xl text-xs flex items-center gap-2 border animate-in fade-in duration-150 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">SuperPredictor Scoruri</h3>
            <p className="text-xs text-slate-400">
              Prezice scorurile din Superliga și câștigă buget de transferuri
            </p>
          </div>
        </div>
      </div>

      {/* Rules Banner (Updated to 250k, 100k, 50k fara puncte) */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs space-y-1.5 shadow-sm">
        <span className="font-bold text-white block">Reguli Câștig Buget Transferuri:</span>
        <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300">
          <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50 text-center">
            <span className="text-emerald-400 font-bold block">Scor Exact</span>
            <span className="font-mono font-bold text-white text-xs block mt-0.5">+€250.000</span>
            <span className="text-[10px] text-slate-400">fără puncte</span>
          </div>
          <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50 text-center">
            <span className="text-blue-400 font-bold block">Diferență Goluri</span>
            <span className="font-mono font-bold text-white text-xs block mt-0.5">+€100.000</span>
            <span className="text-[10px] text-slate-400">fără puncte</span>
          </div>
          <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50 text-center">
            <span className="text-amber-400 font-bold block">Semn 1X2</span>
            <span className="font-mono font-bold text-white text-xs block mt-0.5">+€50.000</span>
            <span className="text-[10px] text-slate-400">fără puncte</span>
          </div>
        </div>
      </div>

      {/* Pending claim if won */}
      {predictions['fix_1'] && predictions['fix_1'].status === 'won_exact' && !predictions['fix_1'].rewardClaimed && (
        <div className="p-3.5 bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500 rounded-2xl flex items-center justify-between text-xs shadow-lg">
          <div>
            <span className="font-bold text-emerald-300 block">🎉 Felicitări! Ai ghicit scorul corect!</span>
            <span className="text-[11px] text-slate-300">FCSB 2 - 1 Rapid București</span>
          </div>
          <button
            onClick={() => {
              claimPredictionReward('fix_1');
              confetti({ particleCount: 50, spread: 70 });
            }}
            className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all"
          >
            Revendică €250.000
          </button>
        </div>
      )}

      {/* Fixtures list with stepper */}
      <div className="space-y-3">
        {fixtures.map((fix) => {
          const hClub = SUPERLIGA_CLUBS.find((c) => c.id === fix.homeClubId);
          const aClub = SUPERLIGA_CLUBS.find((c) => c.id === fix.awayClubId);
          const inp = scoresInput[fix.id] || { home: 0, away: 0 };
          const saved = predictions[fix.id];

          return (
            <div
              key={fix.id}
              className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-3 shadow-md"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Etapa {fix.round} · {fix.scheduledTime}</span>
                {saved && (
                  <span className="text-emerald-400 font-bold font-mono">
                    Predicție salvată: {saved.homeScore} - {saved.awayScore}
                  </span>
                )}
              </div>

              {/* Stepper Grid */}
              <div className="grid grid-cols-3 items-center text-center">
                {/* Home Team */}
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-white mb-2 truncate max-w-[100px]">
                    {hClub?.shortName || fix.homeClubId}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleScoreChange(fix.id, 'home', -1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center active:scale-95 transition-transform"
                    >
                      -
                    </button>
                    <span className="font-mono text-xl font-black text-white w-6">
                      {inp.home}
                    </span>
                    <button
                      onClick={() => handleScoreChange(fix.id, 'home', 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center active:scale-95 transition-transform"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* VS */}
                <div className="text-slate-500 font-bold text-xs">VS</div>

                {/* Away Team */}
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-white mb-2 truncate max-w-[100px]">
                    {aClub?.shortName || fix.awayClubId}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleScoreChange(fix.id, 'away', -1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center active:scale-95 transition-transform"
                    >
                      -
                    </button>
                    <span className="font-mono text-xl font-black text-white w-6">
                      {inp.away}
                    </span>
                    <button
                      onClick={() => handleScoreChange(fix.id, 'away', 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center active:scale-95 transition-transform"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSavePrediction(fix.id)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-colors"
              >
                Salvează Predicția ({inp.home} - {inp.away})
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
