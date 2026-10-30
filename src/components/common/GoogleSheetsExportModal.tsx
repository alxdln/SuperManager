import React, { useState } from 'react';
import { X, FileSpreadsheet, CheckCircle2, ExternalLink, Copy, AlertCircle, RefreshCw, Download, ArrowRight } from 'lucide-react';
import { useFantasy } from '../../context/FantasyContext';
import {
  getGoogleSheetsAccessToken,
  createAndPopulateGoogleSheet,
  OFFICIAL_SCORING_ROWS,
} from '../../services/googleSheetsService';
import confetti from 'canvas-confetti';

interface GoogleSheetsExportModalProps {
  onClose: () => void;
}

export const GoogleSheetsExportModal: React.FC<GoogleSheetsExportModalProps> = ({ onClose }) => {
  const { players } = useFantasy();
  const [status, setStatus] = useState<'idle' | 'authorizing' | 'creating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>('');
  const [spreadsheetId, setSpreadsheetId] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Execută fluxul complet de export către Google Sheets
  const handleStartExport = async () => {
    setErrorMessage('');
    try {
      setStatus('authorizing');
      const { accessToken } = await getGoogleSheetsAccessToken();

      setStatus('creating');
      const result = await createAndPopulateGoogleSheet(accessToken, players);

      setSpreadsheetId(result.spreadsheetId);
      setSpreadsheetUrl(result.spreadsheetUrl);
      setStatus('success');

      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      console.error('Eroare export Google Sheets:', err);
      setStatus('error');
      setErrorMessage(
        err?.message || 'A apărut o problemă la comunicarea cu Google Sheets API. Te rugăm să reîncerci.'
      );
    }
  };

  const handleCopyLink = () => {
    if (spreadsheetUrl) {
      navigator.clipboard.writeText(spreadsheetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Export CSV local de rezervă
  const handleDownloadCsv = () => {
    const headers = ['Categorie', 'Eveniment / Actiune', 'Punctaj SuperManager', 'Sportmonks API type_id', 'Descriere'];
    const rows = OFFICIAL_SCORING_ROWS.map((r) => [
      `"${r.category}"`,
      `"${r.eventName}"`,
      `"${r.points}"`,
      `"${r.sportmonksTypeId}"`,
      `"${r.description.replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'SuperManager_Grila_Scoring_Sportmonks.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-[#14161d] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                <span>Export în Google Sheets</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  OFICIAL
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Grila live de scoring, punctaje Kickbase și ID-uri Sportmonks
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Status: IDLE sau CONFIRMARE */}
          {status === 'idle' && (
            <>
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Ce va conține foaia de calcul generată:
                </span>

                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <b className="text-white">Fila 1: „Grilă Live Scoring”</b>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Toate cele {OFFICIAL_SCORING_ROWS.length} acțiuni de joc (Pase & Atac, Dueluri & Apărare, Disciplină, Portari și Contextual), punctajele oficiale și <code>type_id</code> din Sportmonks v3.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <b className="text-white">Fila 2: „Jucători &amp; ID Sportmonks”</b>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Tabelul fotbaliștilor din Liga 1 cu ID-urile interne, clubul de apartenență, cota de piață și ID-ul numeric Sportmonks.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informare permisiune cont Google */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-slate-300 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Integrare securizată Google Workspace</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Aplicația va crea automat un nou document Google Sheets în contul tău Google Drive, cu permisiunea ta. Nu se suprascriu sau modifică fișiere existente.
                </p>
              </div>

              {/* Acțiuni de lansare */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleStartExport}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4 fill-current" />
                  <span>Creează &amp; Exportă în Google Sheets</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-800"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Sau descarcă fișier CSV local (Fără cont Google)</span>
                </button>
              </div>
            </>
          )}

          {/* Status: LOADING (Authorizing / Creating) */}
          {(status === 'authorizing' || status === 'creating') && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center animate-pulse">
                <RefreshCw className="w-7 h-7 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-white">
                  {status === 'authorizing'
                    ? 'Se solicită autorizarea Google Sheets...'
                    : 'Se creează și populează foaia Google Sheets...'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  {status === 'authorizing'
                    ? 'Confirmă contul Google în fereastra securizată popup.'
                    : 'Scriem categoriile, valorile punctelor, ID-urile Sportmonks și formatăm coloanele.'}
                </p>
              </div>
            </div>
          )}

          {/* Status: SUCCESS */}
          {status === 'success' && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 space-y-2 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-white">
                  Document Google Sheets Creat cu Succes!
                </h3>
                <p className="text-xs text-emerald-300/90">
                  Foaia de calcul este gata și disponibilă permanent în Google Drive.
                </p>
              </div>

              {/* Butoane de deschidere & copiere */}
              <div className="space-y-2">
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Deschide în Google Sheets</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-800"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Link Copiat în Clipboard ✓' : 'Copiază Link-ul Foaiei'}</span>
                </button>
              </div>

              {/* Link preview card */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 font-mono text-[10px] text-slate-400 truncate">
                {spreadsheetUrl}
              </div>
            </div>
          )}

          {/* Status: ERROR */}
          {status === 'error' && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Nu s-a putut finaliza exportul</span>
                </div>
                <p className="text-[11px] text-rose-200/90 leading-relaxed">
                  {errorMessage}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleStartExport}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  Reîncearcă Exportul Google
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
                >
                  Descarcă CSV Local
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>SuperManager SuperLiga v2.4</span>
          <button
            onClick={onClose}
            className="hover:text-white font-medium transition-colors"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
};
