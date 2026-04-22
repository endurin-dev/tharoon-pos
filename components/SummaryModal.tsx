'use client';

import { useEffect, useState } from 'react';

interface SummarySession {
  id: number;
  session_date: string;
  employee_name: string;
  vehicle_number: string;
  session_type: string;
  payment_status: string;
  total_cost: number;
  total_selling: number;
}

interface SummaryModalProps {
  date: string;
  onClose: () => void;
}

export default function SummaryModal({ date, onClose }: SummaryModalProps) {
  const [sessions, setSessions] = useState<SummarySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/issues?date=${date}`)
      .then(r => r.json())
      .then(data => { setSessions(Array.isArray(data) ? data : []); setLoading(false); });
  }, [date]);

  const totalCost = sessions.reduce((a, s) => a + Number(s.total_cost), 0);
  const totalSell = sessions.reduce((a, s) => a + Number(s.total_selling), 0);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0d1629] border border-[#1e3a5f] rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-[#1e3a5f] flex items-center justify-between">
          <h2 className="text-[#4a9eff] font-bold text-lg tracking-wide">
            📊 දෛනික සාරාංශය — {new Date(date + 'T00:00:00').toLocaleDateString('si-LK', { day: '2-digit', month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={onClose} className="text-[#4a9eff] hover:text-white text-xl">✕</button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center text-[#4a9eff] py-8">⏳ පූරණය වෙමින්...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-[#4a9eff] py-8">මෙම දිනයේ සැසි නොමැත.</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#4a9eff] text-xs uppercase tracking-widest border-b border-[#1e3a5f]">
                    <th className="text-left py-2 px-3">සේවකයා</th>
                    <th className="text-left py-2 px-3">වාහනය</th>
                    <th className="text-center py-2 px-3">සැසිය</th>
                    <th className="text-center py-2 px-3">ගෙවීම</th>
                    <th className="text-right py-2 px-3">මුළු පිරිවැය</th>
                    <th className="text-right py-2 px-3">මුළු විකිණුම</th>
                    <th className="text-right py-2 px-3">ශේෂය</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} className="border-b border-[#1e3a5f] hover:bg-[#0a1628]">
                      <td className="py-2 px-3 text-[#c8d8f0] font-semibold">{s.employee_name}</td>
                      <td className="py-2 px-3 text-[#94a3b8]">{s.vehicle_number || '-'}</td>
                      <td className="py-2 px-3 text-center text-[#94a3b8]">
                        {s.session_type === 'full_day' ? 'සම්පූර්ණ' : 'උදේ'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${s.payment_status === 'paid' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                          {s.payment_status === 'paid' ? 'ගෙවා ඇත' : 'ගෙවා නැත'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-[#fbbf24]">{Number(s.total_cost).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-[#22c55e]">{Number(s.total_selling).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-[#60a5fa]">{(Number(s.total_selling) - Number(s.total_cost)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#071020] font-bold text-sm border-t-2 border-[#1e3a5f]">
                    <td colSpan={4} className="py-3 px-3 text-[#4a9eff] uppercase tracking-widest">මහා එකතුව</td>
                    <td className="py-3 px-3 text-right text-[#fbbf24] text-base">රු. {totalCost.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right text-[#22c55e] text-base">රු. {totalSell.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right text-[#60a5fa] text-base">රු. {(totalSell - totalCost).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
