'use client';

import { useEffect, useMemo, useState } from 'react';

interface SummarySession {
  id: number;
  session_date: string;
  employee_name: string;
  vehicle_number: string | null;
  session_type: 'morning' | 'full_day';
  extra_source: 'sale' | 'commission';
  bill_rows_total: number | string;
  summary_total_cost: number | string;
  summary_total_selling: number | string;
}

interface DailySummaryReportProps {
  initialDate: string;
}

const money = (amount: number) =>
  new Intl.NumberFormat('si-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('si-LK', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const sessionAmount = (session: SummarySession) =>
  Number(session.extra_source === 'sale' ? session.summary_total_selling : session.summary_total_cost)
  + Number(session.bill_rows_total ?? 0);

export default function DailySummaryReport({ initialDate }: DailySummaryReportProps) {
  const [date, setDate] = useState(initialDate);
  const [sessions, setSessions] = useState<SummarySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const loadSessions = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const response = await fetch(`/api/issues?date=${encodeURIComponent(date)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'සාරාංශය පූරණය කළ නොහැක');
        if (!Array.isArray(data)) throw new Error('සාරාංශ දත්ත වලංගු නොවේ');
        setSessions(data);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'සාරාංශය පූරණය කළ නොහැක');
      } finally {
        setLoading(false);
      }
    };
    void loadSessions();
  }, [date]);

  const totals = useMemo(() => {
    return sessions.reduce((result, session) => {
      const extra = Number(session.bill_rows_total ?? 0);
      const collectedAmount = sessionAmount(session);

      result.extra += extra;
      result.reportAmount += collectedAmount;
      return result;
    }, {
      extra: 0,
      reportAmount: 0,
    });
  }, [sessions]);

  return (
    <>
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body, body * { visibility: hidden !important; }
          #daily-report, #daily-report * { visibility: visible !important; }
          #daily-report {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 76mm !important;
            max-width: 76mm !important;
            padding: 2mm !important;
            overflow: visible !important;
            background: #fff !important;
            color: #000 !important;
            font-family: 'Courier New', monospace !important;
            font-size: 8pt !important;
          }
          #daily-report .no-print { display: none !important; }
          #daily-report .report-card {
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          #daily-report h1 { font-size: 12pt !important; }
          #daily-report h2 { font-size: 9pt !important; }
          #daily-report .report-section-header { display: none !important; }
          #daily-report .screen-report-data { display: none !important; }
          #daily-report .thermal-report { display: block !important; }
          #daily-report .thermal-report-header {
            display: flex !important;
            justify-content: space-between !important;
            gap: 2mm !important;
            border-bottom: 1.2px solid #000 !important;
            padding: 1.5mm 0 !important;
            font-size: 8pt !important;
            font-weight: 700 !important;
          }
          #daily-report .thermal-session {
            padding: 2mm 0 !important;
            border-bottom: 1px dashed #777 !important;
            break-inside: avoid;
          }
          #daily-report .thermal-session-main {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            gap: 2mm !important;
            font-size: 8.5pt !important;
            font-weight: 700 !important;
            line-height: 1.3 !important;
          }
          #daily-report .thermal-session-name {
            min-width: 0 !important;
            overflow-wrap: anywhere !important;
          }
          #daily-report .thermal-session-amount {
            flex-shrink: 0 !important;
            white-space: nowrap !important;
            text-align: right !important;
          }
          #daily-report .thermal-session-meta {
            display: flex !important;
            justify-content: space-between !important;
            gap: 2mm !important;
            padding-top: 1mm !important;
            color: #333 !important;
            font-size: 7pt !important;
            line-height: 1.3 !important;
          }
          #daily-report .thermal-session-meta span { overflow-wrap: anywhere !important; }
          #daily-report .thermal-total {
            display: flex !important;
            justify-content: space-between !important;
            gap: 2mm !important;
            padding: 1.5mm 0 !important;
            font-size: 8pt !important;
          }
          #daily-report .thermal-grand-total {
            border-top: 1.2px solid #000 !important;
            margin-top: 1mm !important;
            padding-top: 2mm !important;
            font-size: 10pt !important;
            font-weight: 700 !important;
          }
        }
      `}</style>
      <div id="daily-report" className="min-h-full flex-1 overflow-y-auto bg-slate-50 px-4 py-6 text-slate-900 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Tharoon POS · Daily report</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">දෛනික සාරාංශ වාර්තාව</h1>
              <p className="mt-2 text-sm text-slate-500">{formatDate(date)}</p>
            </div>
            <div className="no-print flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm">
                <span className="text-slate-500">දිනය</span>
                <input
                  type="date"
                  aria-label="වාර්තා දිනය"
                  value={date}
                  onChange={event => setDate(event.target.value)}
                  className="bg-transparent text-slate-800 outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
              >
                මුද්‍රණය / PDF
              </button>
              <a href="/issue" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100">
                නිකුත් කිරීම වෙත
              </a>
            </div>
          </header>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-slate-500 shadow-sm" role="status">
              වාර්තාව පූරණය වෙමින්...
            </div>
          ) : loadError ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center text-red-700">
              <p className="font-bold">වාර්තාව පූරණය කළ නොහැක</p>
              <p className="mt-1 text-sm">{loadError}</p>
            </div>
          ) : (
            <>
              <section className="report-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="report-section-header flex flex-col gap-1 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">සේවක සැසි විස්තර</h2>
                    <p className="mt-1 text-sm text-slate-500">සේවකයා, සැසි වර්ගය, අතිරේක ගාස්තු සහ මුදල් පදනම</p>
                  </div>
                  <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{sessions.length} සැසි</span>
                </div>
                {sessions.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <p className="text-base font-bold text-slate-700">මෙම දිනයට සැසි නොමැත</p>
                    <p className="mt-1 text-sm text-slate-500">වෙනත් දිනයක් තෝරා නැවත බලන්න.</p>
                  </div>
                ) : (
                  <>
                  <div className="screen-report-data overflow-x-auto">
                    <table className="report-table w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-6 py-4">සේවකයා / වාහනය</th>
                          <th className="px-4 py-4">සැසිය</th>
                          <th className="px-4 py-4">මුදල් පදනම</th>
                          <th className="px-4 py-4 text-right">අතිරේක</th>
                          <th className="px-4 py-4 text-right">වාර්තා මුදල</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sessions.map(session => (
                          <tr key={session.id} className="transition hover:bg-slate-50/80">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">{session.employee_name}</div>
                              {session.vehicle_number && (
                                <div className="mt-1 text-xs text-slate-500">{session.vehicle_number}</div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-slate-600">{session.session_type === 'morning' ? 'උදේ' : 'සම්පූර්ණ දිනය'}</td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${session.extra_source === 'sale' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'}`}>
                                {session.extra_source === 'sale' ? 'විකිණුම' : 'පිරිවැය / කොමිස්'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right tabular-nums text-slate-600">රු. {money(Number(session.bill_rows_total ?? 0))}</td>
                            <td className="px-4 py-4 text-right font-extrabold tabular-nums text-slate-900">රු. {money(sessionAmount(session))}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-slate-200 bg-slate-50 font-extrabold">
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-slate-700">දෛනික එකතුව</td>
                          <td className="px-4 py-4 text-right tabular-nums text-slate-700">රු. {money(totals.extra)}</td>
                          <td className="px-4 py-4 text-right tabular-nums text-slate-950">රු. {money(totals.reportAmount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="thermal-report hidden px-5 py-3 sm:px-6">
                    <div className="thermal-report-header">
                      <span>සේවකයා / වාහනය</span>
                      <span>වාර්තා මුදල</span>
                    </div>
                    {sessions.map(session => (
                      <div className="thermal-session" key={`receipt-${session.id}`}>
                        <div className="thermal-session-main">
                          <span className="thermal-session-name">{session.employee_name}</span>
                          <span className="thermal-session-amount">රු. {money(sessionAmount(session))}</span>
                        </div>
                        <div className="thermal-session-meta">
                          <span>
                            {session.vehicle_number ? `වාහනය: ${session.vehicle_number}` : ' '}
                          </span>
                          <span>{session.session_type === 'morning' ? 'උදේ සැසිය' : 'සම්පූර්ණ දිනය'}</span>
                        </div>
                        <div className="thermal-session-meta">
                          <span>
                            {session.extra_source === 'sale' ? 'විකිණුම් පදනම' : 'පිරිවැය / කොමිස් පදනම'}
                          </span>
                          <span>අතිරේක: රු. {money(Number(session.bill_rows_total ?? 0))}</span>
                        </div>
                      </div>
                    ))}
                    <div className="thermal-total">
                      <span>අතිරේක ගාස්තු එකතුව</span>
                      <span>රු. {money(totals.extra)}</span>
                    </div>
                    <div className="thermal-total thermal-grand-total">
                      <span>වාර්තා එකතුව</span>
                      <span>රු. {money(totals.reportAmount)}</span>
                    </div>
                  </div>
                  </>
                )}
              </section>
              <p className="mt-4 text-xs leading-relaxed text-slate-500">
                වාර්තා මුදල සැසියකට තෝරාගත් මුදල් පදනම (විකිණුම හෝ පිරිවැය/කොමිස්) සහ අදාළ අතිරේක ගාස්තු එකතු කර ගණනය කරයි.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
