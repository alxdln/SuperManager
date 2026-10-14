import React from 'react';
import { AlertTriangle, ShieldCheck, X, ArrowRight, DollarSign } from 'lucide-react';
import { formatCurrency, formatFullCurrency } from '../../utils/scoringEngine';

interface OverdraftWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredAmount: number;
  currentBudget: number;
  squadValue: number;
  maxOverdraft: number;
}

export const OverdraftWarningModal: React.FC<OverdraftWarningModalProps> = ({
  isOpen,
  onClose,
  requiredAmount,
  currentBudget,
  squadValue,
  maxOverdraft,
}) => {
  if (!isOpen) return null;

  const minAllowedBalance = -maxOverdraft;
  const projectedBalance = currentBudget - requiredAmount;
  const shortfall = Math.abs(projectedBalance - minAllowedBalance);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#1a1e28] border-2 border-rose-500/80 rounded-3xl p-5 sm:p-6 text-slate-100 shadow-2xl space-y-4">
        {/* Header with Alert Icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-white leading-tight">
                Limită Descoperire Depășită!
              </h3>
              <span className="text-xs text-rose-300 font-semibold block mt-0.5">
                Fonduri insuficiente pentru această ofertă
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
            aria-label="Închide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Financial Rules Breakdown */}
        <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-slate-400">Valoare totală lot curent:</span>
            <span className="font-mono font-bold text-white">{formatCurrency(squadValue)}</span>
          </div>

          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-slate-400">Descoperire maximă permisă (-50%):</span>
            <span className="font-mono font-bold text-amber-400">-{formatCurrency(maxOverdraft)}</span>
          </div>

          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-slate-400">Buget curent disponibil:</span>
            <span className={`font-mono font-bold ${currentBudget < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatFullCurrency(currentBudget)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-slate-400">Ofertă dorită:</span>
            <span className="font-mono font-black text-rose-300">{formatFullCurrency(requiredAmount)}</span>
          </div>
        </div>

        {/* Explanatory Rule Box */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-[11px] text-amber-200 space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Regulament Oficial Financiar:</span>
          </div>
          <p>
            Poți intra în minus cu bugetul <b>până la maxim 50% din valoarea lotului tău</b>. Dacă finalizezi transferul, balanța ta ar deveni <b>{formatFullCurrency(projectedBalance)}</b>, depășind limita minimă admisă cu <b>{formatCurrency(shortfall)}</b>.
          </p>
          <p className="text-rose-300 font-semibold">
            ⚠️ Amintește-ți: Trebuie să revii pe plus înainte de startul meciurilor etapei! Dacă te prinde startul etapei pe minus, echipa ta primește 0 puncte în clasament.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold uppercase tracking-wider text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
          >
            <span>Am Înțeles Regulamentul</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
