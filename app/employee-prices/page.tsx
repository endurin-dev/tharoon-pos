'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';

interface Employee { id: number; name: string; }
interface PriceRow {
  item_id: number;
  item_name: string;
  category_name: string;
  category_sort: number;
  item_sort: number;
  default_cost: number;
  default_selling: number;
  cost_price: number;
  selling_price: number;
  price_override_id: number | null;
}

function EmployeePricesContent() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [editing, setEditing] = useState<{ [itemId: number]: { cost: string; sell: string } }>({});
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/employees').then(r => r.json()).then(setEmployees);
  }, []);

  const loadPrices = async (emp: Employee) => {
    setLoading(true);
    const rows = await fetch(`/api/employee-prices?employee_id=${emp.id}`).then(r => r.json());
    setPrices(rows);
    setEditing({});
    setLoading(false);
  };

  const handleSelectEmployee = (id: string) => {
    const emp = employees.find(e => e.id === Number(id)) || null;
    setSelectedEmployee(emp);
    if (emp) loadPrices(emp);
    else setPrices([]);
  };

  const startEdit = (row: PriceRow) => {
    setEditing(prev => ({
      ...prev,
      [row.item_id]: {
        cost: String(row.cost_price),
        sell: String(row.selling_price),
      }
    }));
  };

  const cancelEdit = (itemId: number) => {
    setEditing(prev => { const n = { ...prev }; delete n[itemId]; return n; });
  };

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const savePrice = async (itemId: number) => {
    if (!selectedEmployee) return;
    const ed = editing[itemId];
    const res = await fetch('/api/employee-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: selectedEmployee.id,
        item_id: itemId,
        cost_price: Number(ed.cost),
        selling_price: Number(ed.sell),
      })
    });
    if (res.ok) {
      showMsg('මිල ගණන් සුරකිණි!');
      cancelEdit(itemId);
      loadPrices(selectedEmployee);
    } else {
      const d = await res.json();
      showMsg(d.error || 'දෝෂයකි', 'error');
    }
  };

  const resetPrice = async (itemId: number) => {
    if (!selectedEmployee) return;
    if (!confirm('මෙම භාණ්ඩයේ සේවක මිල ඉවත් කර පෙරනිමි මිලට ආපසු යන්නද?')) return;
    const res = await fetch('/api/employee-prices', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: selectedEmployee.id, item_id: itemId })
    });
    if (res.ok) { showMsg('පෙරනිමි මිලට ආපසු ගිය!'); loadPrices(selectedEmployee); }
    else { const d = await res.json(); showMsg(d.error, 'error'); }
  };

  const applyPricesToAll = async () => {
    if (!selectedEmployee) return;
    const overrides = prices.filter(p => p.price_override_id !== null);
    if (overrides.length === 0) {
      showMsg('මෙම සේවකයාට විශේෂ මිල ගණන් නොමැත. පළමුව මිල ගණන් සකසන්න.', 'error');
      return;
    }
    if (!confirm(`${selectedEmployee.name} ගේ විශේෂ මිල ගණන් ${overrides.length}ක් සියලු සේවකයන්ට යොදන්නද?`)) return;

    setCopying(true);
    const res = await fetch('/api/employee-prices/copy-to-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_employee_id: selectedEmployee.id })
    });
    setCopying(false);

    if (res.ok) {
      const d = await res.json();
      showMsg(`සේවකයන් ${d.employees_updated} දෙනෙකුට මිල ගණන් ${d.prices_copied}ක් යොදන ලදී!`);
    } else {
      const d = await res.json();
      showMsg(d.error || 'දෝෂයකි', 'error');
    }
  };

  // Group by category
  const grouped: { [cat: string]: PriceRow[] } = {};
  for (const row of prices) {
    if (!grouped[row.category_name]) grouped[row.category_name] = [];
    grouped[row.category_name].push(row);
  }

  const overrideCount = prices.filter(p => p.price_override_id !== null).length;

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-[#4a9eff] font-bold text-xl mb-2 uppercase tracking-widest">💰 සේවක භාණ්ඩ මිල</h1>
      <p className="text-[#94a3b8] text-sm mb-6">
        සෑම සේවකයෙකුටම වෙනස් භාණ්ඩ මිල ගණන් සැකසිය හැකිය. සේවකයෙකු සඳහා මිලක් සකසා නොමැතිනම්, පෙරනිමි මිල භාවිතා වේ.
      </p>

      {/* Employee Selector */}
      <div className="bg-[#0d1629] border border-[#1e3a5f] rounded-lg p-4 mb-6 flex items-center gap-4">
        <label className="text-[#4a9eff] text-xs uppercase tracking-widest font-semibold whitespace-nowrap">සේවකයා තෝරන්න</label>
        <select
          value={selectedEmployee?.id ?? ''}
          onChange={e => handleSelectEmployee(e.target.value)}
          className="bg-[#0a1628] border border-[#1e3a5f] text-white px-3 py-2 rounded text-sm focus:border-[#4a9eff] outline-none min-w-[200px]"
        >
          <option value="">-- සේවකයා තෝරන්න --</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        {selectedEmployee && (
          <span className="text-[#22c55e] text-sm font-semibold">
            ● {selectedEmployee.name} — මිල ගණන් සංස්කරණය
          </span>
        )}
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-2 rounded text-sm font-semibold ${msg.type === 'success' ? 'bg-[#0d3a1e] text-[#22c55e]' : 'bg-[#3a0d0d] text-[#ef4444]'}`}>
          {msg.type === 'success' ? '✓ ' : '✕ '}{msg.text}
        </div>
      )}

      {!selectedEmployee && (
        <div className="text-center py-16 text-[#4a9eff] opacity-40 text-lg">
          සේවකයෙකු තෝරා ඔවුන්ගේ භාණ්ඩ මිල ගණන් සකසන්න
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-[#4a9eff] opacity-60">⏳ පූරණය වෙමින්...</div>
      )}

      {selectedEmployee && !loading && (
        <>
          {/* Legend + Copy to All Button Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-[#1a3a1a] inline-block border border-[#22c55e]"></span>
                සේවකයා සඳහා විශේෂ මිලක්
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-[#0a1628] inline-block border border-[#1e3a5f]"></span>
                පෙරනිමි මිල
              </span>
            </div>

            {/* Copy to All Button */}
            {overrideCount > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-[#64748b] text-xs">
                  විශේෂ මිල ගණන්: <span className="text-[#fbbf24] font-bold">{overrideCount}</span>
                </span>
                <button
                  onClick={applyPricesToAll}
                  disabled={copying}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1a2a4a] hover:bg-[#1e3a6a] disabled:opacity-50 disabled:cursor-not-allowed border border-[#4a9eff] text-[#4a9eff] rounded-lg text-sm font-semibold transition-colors"
                >
                  {copying ? (
                    <>⏳ <span>යොදමින්...</span></>
                  ) : (
                    <>📋 <span>සියලු සේවකයන්ට යොදන්න</span></>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="bg-[#0d1629] border border-[#1e3a5f] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#071020] text-[#4a9eff] text-xs uppercase tracking-widest">
                  <th className="text-left px-4 py-3">වර්ගය</th>
                  <th className="text-left px-4 py-3">භාණ්ඩය</th>
                  <th className="text-right px-4 py-3">පෙරනිමි පිරිවැය</th>
                  <th className="text-right px-4 py-3">පෙරනිමි විකිණුම</th>
                  <th className="text-right px-4 py-3 text-[#fbbf24]">සේවක පිරිවැය</th>
                  <th className="text-right px-4 py-3 text-[#22c55e]">සේවක විකිණුම</th>
                  <th className="px-4 py-3 text-center">ක්‍රියා</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([catName, rows]) =>
                  rows.map((row, idx) => {
                    const isEditing = !!editing[row.item_id];
                    const hasOverride = !!row.price_override_id;
                    return (
                      <tr
                        key={row.item_id}
                        className={`border-t border-[#1e3a5f] ${hasOverride ? 'bg-[#0d2010]' : idx % 2 === 0 ? 'bg-[#0a1628]' : ''}`}
                      >
                        <td className="px-4 py-2 text-[#fbbf24] text-xs font-bold">
                          {idx === 0 ? catName : ''}
                        </td>
                        <td className="px-4 py-2 text-[#c8d8f0]">{row.item_name}</td>
                        <td className="px-4 py-2 text-right text-[#64748b] text-xs">{Number(row.default_cost).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-[#64748b] text-xs">{Number(row.default_selling).toFixed(2)}</td>

                        {/* Cost Price cell */}
                        <td className="px-2 py-1 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editing[row.item_id].cost}
                              onChange={e => setEditing(prev => ({ ...prev, [row.item_id]: { ...prev[row.item_id], cost: e.target.value } }))}
                              className="w-24 bg-[#0a1628] border border-[#4a9eff] text-[#fbbf24] px-2 py-1 rounded text-sm text-right outline-none"
                            />
                          ) : (
                            <span className={`font-semibold ${hasOverride ? 'text-[#fbbf24]' : 'text-[#94a3b8]'}`}>
                              {Number(row.cost_price).toFixed(2)}
                              {hasOverride && <span className="ml-1 text-[10px] text-[#22c55e]">✓</span>}
                            </span>
                          )}
                        </td>

                        {/* Sell Price cell */}
                        <td className="px-2 py-1 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editing[row.item_id].sell}
                              onChange={e => setEditing(prev => ({ ...prev, [row.item_id]: { ...prev[row.item_id], sell: e.target.value } }))}
                              className="w-24 bg-[#0a1628] border border-[#4a9eff] text-[#22c55e] px-2 py-1 rounded text-sm text-right outline-none"
                            />
                          ) : (
                            <span className={`font-semibold ${hasOverride ? 'text-[#22c55e]' : 'text-[#94a3b8]'}`}>
                              {Number(row.selling_price).toFixed(2)}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-1 text-center">
                          {isEditing ? (
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => savePrice(row.item_id)}
                                className="px-3 py-1 bg-[#0d3a1e] hover:bg-[#1a5a2e] text-[#22c55e] rounded text-xs font-semibold"
                              >සුරකින්න</button>
                              <button
                                onClick={() => cancelEdit(row.item_id)}
                                className="px-3 py-1 bg-[#1e1a3a] hover:bg-[#2a2456] text-[#a78bfa] rounded text-xs"
                              >අවලංගු</button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => startEdit(row)}
                                className="px-3 py-1 bg-[#1e3a5f] hover:bg-[#2a4f7a] text-[#4a9eff] rounded text-xs"
                              >සංස්කරණය</button>
                              {hasOverride && (
                                <button
                                  onClick={() => resetPrice(row.item_id)}
                                  className="px-3 py-1 bg-[#3a1e1e] hover:bg-[#5a2a2a] text-[#ef4444] rounded text-xs"
                                  title="පෙරනිමි මිලට ආපසු"
                                >යළි සකසන්න</button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-[#64748b] text-xs">
            💡 ඉඟිය: "සංස්කරණය" ක්ලික් කර මිල ඇතුළු කර "සුරකින්න" ක්ලික් කරන්න. "යළි සකසන්න" ක්ලික් කිරීමෙන් පෙරනිමි මිලට ආපසු යයි.
            සියලු සේවකයන්ට එකම මිල ගණන් යෙදීමට "සියලු සේවකයන්ට යොදන්න" ක්ලික් කරන්න.
          </p>
        </>
      )}
    </div>
  );
}

export default function EmployeePricesPage() {
  return <AdminGuard pageName="සේවක භාණ්ඩ මිල"><EmployeePricesContent /></AdminGuard>;
}