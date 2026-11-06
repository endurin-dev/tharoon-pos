'use client';

import { useEffect, useState } from 'react';

interface SummarySession {
  id: number;
  session_date: string;
  employee_name: string;
  extra_source: 'sale' | 'commission';
  bill_rows_total: number;
  payment_status: 'paid' | 'unpaid';
  summary_total_cost: number;
  summary_total_selling: number;
}

interface SummaryModalProps {
  date: string;
  onClose: () => void;
}

export default function SummaryModal({ date, onClose }: SummaryModalProps) {
  const [sessions, setSessions] = useState<SummarySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savingSessionId, setSavingSessionId] = useState<number | null>(null);

  useEffect(() => {
    const loadSessions = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const response = await fetch(`/api/issues?date=${date}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'සාරාංශය පූරණය කළ නොහැක');
        setSessions(Array.isArray(data) ? data : []);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'සාරාංශය පූරණය කළ නොහැක');
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, [date]);

  const sessionTotal = (session: SummarySession) =>
    Number(session.extra_source === 'sale' ? session.summary_total_selling : session.summary_total_cost)
      + Number(session.bill_rows_total ?? 0);
  const totalAmount = sessions.reduce((total, session) => total + sessionTotal(session), 0);
  const hasMixedSources = sessions.some(session => session.extra_source !== sessions[0]?.extra_source);
  const totalLabel = hasMixedSources
    ? 'තෝරාගත් මුදල (+අතිරේක)'
    : sessions[0]?.extra_source === 'sale'
      ? 'මුළු විකිණුම (+අතිරේක)'
      : 'මුළු පිරිවැය (+අතිරේක)';

  const updatePaymentStatus = async (sessionId: number, paymentStatus: 'paid' | 'unpaid') => {
    setSavingSessionId(sessionId);
    setSaveError('');
    try {
      const response = await fetch('/api/issues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, payment_status: paymentStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ගෙවීම් තත්ත්වය යාවත්කාලීන කළ නොහැක');
      setSessions(previous => previous.map(session =>
        session.id === sessionId ? { ...session, payment_status: data.session.payment_status } : session
      ));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'ගෙවීම් තත්ත්වය යාවත්කාලීන කළ නොහැක');
    } finally {
      setSavingSessionId(null);
    }
  };

  return (
    <>
    <style>{`
      @media print {
        @page { size: 80mm auto; margin: 0; }
        body * { visibility: hidden !important; }
        #summary-print, #summary-print * { visibility: visible !important; }
        #summary-print {
          position: fixed;
          left: 0;
          top: 0;
          width: 76mm;
          max-width: 76mm !important;
          max-height: none !important;
          overflow: visible !important;
          padding: 2mm !important;
          box-sizing: border-box !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: #fff !important;
          color: #000 !important;
          font-family: 'Courier New', monospace;
        }
        #summary-print h2, #summary-print table, #summary-print th,
        #summary-print td, #summary-print tr, #summary-print span {
          color: #000 !important;
          background: #fff !important;
        }
        #summary-print h2 {
          font-size: 9pt !important;
          line-height: 1.2 !important;
          letter-spacing: 0 !important;
        }
        #summary-print > div { padding: 1mm 0 !important; }
        #summary-print table {
          width: 100% !important;
          table-layout: fixed;
          border-collapse: collapse;
          font-size: 8pt !important;
        }
        #summary-print th, #summary-print td {
          border: 1px solid #000;
          padding: 1mm !important;
          overflow-wrap: anywhere;
        }
        #summary-print th { font-size: 7pt !important; }
        #summary-print tfoot td { font-size: 9pt !important; }
        .no-print { display: none !important; }
        .print-only { display: inline !important; }
      }
      .print-only { display: none; }
    `}</style>
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div id="summary-print" className="bg-[#0d1629] border border-[#1e3a5f] rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-[#1e3a5f] flex items-center justify-between">
          <h2 className="text-[#4a9eff] font-bold text-lg tracking-wide">
            📊 දෛනික සාරාංශය — {new Date(date + 'T00:00:00').toLocaleDateString('si-LK', { day: '2-digit', month: 'long', year: 'numeric' })}
          </h2>
          <div className="no-print flex items-center gap-3">
            <button onClick={() => window.print()} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold">
              මුද්‍රණය
            </button>
            <button onClick={onClose} className="text-[#4a9eff] hover:text-white text-xl">✕</button>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center text-[#4a9eff] py-8">⏳ පූරණය වෙමින්...</div>
          ) : loadError ? (
            <div role="alert" className="text-center text-red-400 py-8">{loadError}</div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-[#4a9eff] py-8">මෙම දිනයේ සැසි නොමැත.</div>
          ) : (
            <>
              {saveError && <p role="alert" className="no-print mb-3 text-sm text-red-400">{saveError}</p>}
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#4a9eff] text-xs uppercase tracking-widest border-b border-[#1e3a5f]">
                    <th className="text-left py-2 px-3">සේවකයා</th>
                    <th className="text-center py-2 px-3">ගෙවීම</th>
                    <th className="text-right py-2 px-3">{totalLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} className="border-b border-[#1e3a5f] hover:bg-[#0a1628]">
                      <td className="py-2 px-3 text-[#c8d8f0] font-semibold">{s.employee_name}</td>
                      <td className="py-2 px-3 text-center">
                        <select
                          aria-label={`${s.employee_name} ගෙවීම් තත්ත්වය`}
                          value={s.payment_status}
                          disabled={savingSessionId === s.id}
                          onChange={event => {
                            if (event.target.value === 'paid' || event.target.value === 'unpaid') {
                              void updatePaymentStatus(s.id, event.target.value);
                            }
                          }}
                          className={`no-print rounded px-2 py-1 text-xs font-bold disabled:opacity-50 ${s.payment_status === 'paid' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}
                        >
                          <option value="unpaid">ගෙවා නැත</option>
                          <option value="paid">ගෙවා ඇත</option>
                        </select>
                        <span className="print-only font-bold">
                          {s.payment_status === 'paid' ? 'ගෙවා ඇත' : 'ගෙවා නැත'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-[#22c55e]">
                        <div>රු. {sessionTotal(s).toFixed(2)}</div>
                        <div className="text-[10px] font-normal text-[#94a3b8]">
                          {s.extra_source === 'sale' ? 'මුළු විකිණුම (+අතිරේක)' : 'මුළු පිරිවැය (+අතිරේක)'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#071020] font-bold text-sm border-t-2 border-[#1e3a5f]">
                    <td colSpan={2} className="py-3 px-3 text-[#4a9eff] uppercase tracking-widest">එකතුව</td>
                    <td className="py-3 px-3 text-right text-[#22c55e] text-base">රු. {totalAmount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
