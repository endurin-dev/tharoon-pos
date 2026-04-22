'use client';

import { useEffect, useState, useCallback } from 'react';

interface EmployeeItem {
  item_name: string;
  category_name: string;
  total_sold: number;
  total_selling: number;
}

interface DashboardData {
  date: string;
  salesByEmployee: {
    employee_id: number;
    employee_name: string;
    vehicle_number: string;
    session_type: string;
    payment_status: string;
    total_cost: number;
    total_selling: number;
    profit: number;
    items: EmployeeItem[];
  }[];
  soldByCategory: {
    category_name: string;
    total_sold: number;
    total_selling: number;
    total_cost: number;
  }[];
  topItems: {
    item_name: string;
    category_name: string;
    total_sold: number;
    total_selling: number;
  }[];
  dayTotals: {
    total_sessions: number;
    total_employees: number;
    grand_cost: number;
    grand_selling: number;
    paid_sessions: number;
    unpaid_sessions: number;
    unpaid_amount: number;
  };
  sessionBreakdown: {
    total_morning: number;
    total_evening: number;
    total_returned: number;
    total_net_sold: number;
  };
}

function StatCard({
  label, value, sub, color = 'blue', icon,
}: {
  label: string; value: string; sub?: string; color?: string; icon?: string;
}) {
  const palette: Record<string, { border: string; text: string; bg: string }> = {
    blue:   { border: 'border-[#1e3a5f]',  text: 'text-[#4a9eff]',  bg: 'bg-[#0a1e38]' },
    green:  { border: 'border-[#1a5a2e]',  text: 'text-[#22c55e]',  bg: 'bg-[#071a0e]' },
    yellow: { border: 'border-[#4a3000]',  text: 'text-[#fbbf24]',  bg: 'bg-[#1a1000]' },
    red:    { border: 'border-[#5a1a1a]',  text: 'text-[#ef4444]',  bg: 'bg-[#1a0707]' },
    purple: { border: 'border-[#2a1a4a]',  text: 'text-[#a78bfa]',  bg: 'bg-[#0f0a1e]' },
    cyan:   { border: 'border-[#0d3a4a]',  text: 'text-[#38bdf8]',  bg: 'bg-[#041420]' },
    orange: { border: 'border-[#4a2000]',  text: 'text-[#fb923c]',  bg: 'bg-[#1a0c00]' },
  };
  const p = palette[color] || palette.blue;
  return (
    <div className={`${p.bg} border ${p.border} rounded-xl p-4 flex flex-col gap-1.5 relative overflow-hidden`}>
      {icon && <div className="absolute top-3 right-3 text-2xl opacity-20">{icon}</div>}
      <div className="text-[#64748b] text-xs uppercase tracking-widest font-medium">{label}</div>
      <div className={`text-2xl font-bold font-mono ${p.text} leading-tight`}>{value}</div>
      {sub && <div className="text-[#64748b] text-xs">{sub}</div>}
    </div>
  );
}

function HBar({ label, value, maxVal, color, suffix = '' }: { label: string; value: number; maxVal: number; color: string; suffix?: string }) {
  const pct = maxVal > 0 ? Math.max(3, (value / maxVal) * 100) : 3;
  return (
    <div className="flex items-center gap-3 group">
      <div className="w-28 text-xs text-[#94a3b8] text-right truncate shrink-0 group-hover:text-white transition-colors">{label}</div>
      <div className="flex-1 bg-[#071020] rounded-full h-6 overflow-hidden">
        <div
          className={`h-full rounded-full flex items-center justify-end pr-2.5 transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        >
          <span className="text-[10px] font-bold text-white whitespace-nowrap">{value}{suffix}</span>
        </div>
      </div>
    </div>
  );
}

const catColors = [
  'bg-[#1e4a7a]', 'bg-[#0d5a2e]', 'bg-[#5a3000]', 'bg-[#2a1a5a]',
  'bg-[#0d4a5a]', 'bg-[#5a1a1a]', 'bg-[#1a3a5a]', 'bg-[#2a4a1a]',
];

// Employee card with expandable item breakdown
function EmployeeCard({ e, maxSell }: { e: DashboardData['salesByEmployee'][0]; maxSell: number }) {
  const [expanded, setExpanded] = useState(false);
  const pct = maxSell > 0 ? Math.max(3, (Number(e.total_selling) / maxSell) * 100) : 3;

  // Group items by category
  const grouped: Record<string, EmployeeItem[]> = {};
  for (const item of (e.items || [])) {
    if (!grouped[item.category_name]) grouped[item.category_name] = [];
    grouped[item.category_name].push(item);
  }

  return (
    <div className="bg-[#071020] rounded-xl border border-[#1e3a5f] overflow-hidden">
      {/* Main row */}
      <div className="flex items-center justify-between px-3 py-2.5 gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-[#c8d8f0] font-semibold text-sm truncate">{e.employee_name}</span>
          {e.vehicle_number && <span className="text-[#64748b] text-xs shrink-0">🚚 {e.vehicle_number}</span>}
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${e.payment_status === 'paid' ? 'bg-[#0d3a1e] text-[#22c55e]' : 'bg-[#3a0d0d] text-[#ef4444]'}`}>
            {e.payment_status === 'paid' ? 'ගෙවා ඇත' : 'ගෙවා නැත'}
          </span>
        </div>
        <div className="flex gap-3 text-right shrink-0 items-center">
          <div className="text-right">
            <div className="text-[#64748b] text-[9px]">පිරිවැය</div>
            <div className="text-[#fbbf24] font-mono text-xs">රු.{Number(e.total_cost).toFixed(0)}</div>
          </div>
          <div className="text-right">
            <div className="text-[#64748b] text-[9px]">විකිණුම</div>
            <div className="text-[#22c55e] font-bold font-mono text-xs">රු.{Number(e.total_selling).toFixed(0)}</div>
          </div>
          <div className="text-right">
            <div className="text-[#64748b] text-[9px]">ලාභය</div>
            <div className="text-[#38bdf8] font-mono text-xs">+{Number(e.profit).toFixed(0)}</div>
          </div>
          {(e.items || []).length > 0 && (
            <button
              onClick={() => setExpanded(p => !p)}
              className={`ml-1 px-2 py-1 rounded text-[10px] font-bold border transition-all shrink-0 ${
                expanded
                  ? 'bg-[#1e3a5f] border-[#4a9eff] text-[#4a9eff]'
                  : 'bg-[#0d1629] border-[#1e3a5f] text-[#64748b] hover:border-[#4a9eff] hover:text-[#4a9eff]'
              }`}
            >
              {expanded ? '▲ වසන්න' : `▼ භාණ්ඩ (${e.items.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Selling bar */}
      <div className="px-3 pb-2">
        <div className="w-full bg-[#040c18] rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1e4a7a] to-[#2a6aaa] transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Expanded item breakdown */}
      {expanded && (e.items || []).length > 0 && (
        <div className="border-t border-[#1e3a5f] px-3 py-2 bg-[#04090f]">
          {Object.entries(grouped).map(([catName, items]) => (
            <div key={catName} className="mb-2 last:mb-0">
              {/* Category header */}
              <div className="text-[#fbbf24] text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
                {catName}
              </div>
              {/* Items table */}
              <table className="w-full text-xs mb-1">
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b border-[#0d1629] last:border-0">
                      <td className="py-1 text-[#94a3b8] pl-3">{item.item_name}</td>
                      <td className="py-1 text-center">
                        <span className="inline-block bg-[#1a2a3a] text-[#7cb8ff] font-bold rounded px-2 py-0.5 text-[11px]">
                          {Number(item.total_sold)} ක්
                        </span>
                      </td>
                      <td className="py-1 text-right text-[#22c55e] font-mono pr-1">
                        රු.{Number(item.total_selling).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {/* Employee item totals */}
          <div className="border-t border-[#1e3a5f] pt-1.5 mt-1 flex justify-between text-[10px] font-bold">
            <span className="text-[#64748b] uppercase tracking-widest">
              එකතුව: {(e.items || []).reduce((s, i) => s + Number(i.total_sold), 0)} ක්
            </span>
            <span className="text-[#22c55e] font-mono">
              රු.{(e.items || []).reduce((s, i) => s + Number(i.total_selling), 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?date=${d}`);
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  useEffect(() => {
    const t = setInterval(() => load(date), 60000);
    return () => clearInterval(t);
  }, [date, load]);

  const dt = data?.dayTotals;
  const sb = data?.sessionBreakdown;
  const profit = dt ? Number(dt.grand_selling) - Number(dt.grand_cost) : 0;
  const profitMargin = dt && Number(dt.grand_selling) > 0
    ? ((profit / Number(dt.grand_selling)) * 100).toFixed(1)
    : '0.0';
  const maxEmpSell = data ? Math.max(...data.salesByEmployee.map(e => Number(e.total_selling)), 1) : 1;
  const maxCatSold = data ? Math.max(...data.soldByCategory.map(c => Number(c.total_sold)), 1) : 1;

  const isToday = date === today;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#0a0f1e]">

      {/* Sticky Header */}
      <div className="bg-[#071020] border-b border-[#1e3a5f] px-6 py-3 flex items-center justify-between sticky top-0 z-20 backdrop-blur">
        <div>
          <h1 className="text-[#4a9eff] font-bold text-lg uppercase tracking-widest flex items-center gap-2">
            📊 <span>දෛනික දළ විශ්ලේෂණය</span>
            {isToday && <span className="ml-2 px-2 py-0.5 bg-[#0d3a1e] text-[#22c55e] text-[10px] rounded-full uppercase tracking-widest font-bold animate-pulse">● ජීවිතය</span>}
          </h1>
          <p className="text-[#3a5a7a] text-xs mt-0.5">
            අවසන් යාවත්කාලීන: {lastRefresh.toLocaleTimeString('si-LK')} · ස්වයං-යාවත්කාලීන: 60s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-[#4a9eff] text-xs uppercase tracking-widest">දිනය</label>
          <input
            type="date" value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-[#0d1629] border border-[#1e3a5f] text-white px-3 py-1.5 rounded text-sm focus:border-[#4a9eff] outline-none"
          />
          <button
            onClick={() => setDate(today)}
            className={`px-3 py-1.5 rounded text-xs border transition-all ${isToday ? 'bg-[#0d3a1e] border-[#1a5a2e] text-[#22c55e]' : 'bg-[#0d1629] border-[#1e3a5f] text-[#94a3b8] hover:border-[#4a9eff] hover:text-[#4a9eff]'}`}
          >
            අද
          </button>
          <button
            onClick={() => load(date)}
            className="px-3 py-1.5 bg-[#1e3a5f] hover:bg-[#2a4f7a] text-[#4a9eff] rounded text-xs border border-[#2a4f7a] transition-all"
          >
            🔄 යළි පූරණය
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-3 animate-spin">⏳</div>
            <div className="text-[#4a9eff] text-sm animate-pulse">දත්ත පූරණය වෙමින්...</div>
          </div>
        </div>
      )}

      {!loading && (!data || !dt || Number(dt.total_sessions) === 0) && (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-6xl opacity-30">📭</div>
          <div className="text-[#64748b] text-lg">
            {new Date(date + 'T00:00:00').toLocaleDateString('si-LK', { day: 'numeric', month: 'long', year: 'numeric' })} සඳහා සැසි නොමැත
          </div>
          <p className="text-[#3a5a7a] text-sm">
            භාණ්ඩ නිකුත් කිරීමේ පිටුවෙන් නව සැසියක් ආරම්භ කරන්න
          </p>
        </div>
      )}

      {!loading && data && dt && Number(dt.total_sessions) > 0 && (
        <div className="p-6 space-y-6">

          {/* ── Row 1: Key KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon="💰" label="මුළු විකිණුම" color="green"
              value={`රු. ${Number(dt.grand_selling).toLocaleString('si-LK', { minimumFractionDigits: 2 })}`}
              sub={`${dt.total_sessions} සැසි · ${dt.total_employees} සේවකයන්`}
            />
            <StatCard
              icon="📈" label="ශුද්ධ ලාභය" color={profit >= 0 ? 'cyan' : 'red'}
              value={`රු. ${Math.abs(profit).toLocaleString('si-LK', { minimumFractionDigits: 2 })}`}
              sub={`${profitMargin}% ලාභ අනුපාතය`}
            />
            <StatCard
              icon="⚠️" label="ගෙවා නොමැති" color="red"
              value={`රු. ${Number(dt.unpaid_amount).toLocaleString('si-LK', { minimumFractionDigits: 2 })}`}
              sub={`${dt.unpaid_sessions} ගෙවා නොමැති සැසි`}
            />
            <StatCard
              icon="🏷️" label="විකිණූ ප්‍රමාණ" color="yellow"
              value={String(Number(sb?.total_net_sold || 0))}
              sub={`ආපසු: ${Number(sb?.total_returned || 0)} · මුළු: ${Number(sb?.total_morning || 0) + Number(sb?.total_evening || 0)}`}
            />
          </div>

          {/* ── Row 2: Secondary stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="🧑‍🤝‍🧑" label="සේවකයන්" color="purple"  value={String(dt.total_employees)} sub="අද ක්‍රියාශීලී" />
            <StatCard icon="✅" label="ගෙවා ඇති"   color="green"   value={String(dt.paid_sessions)}   sub={`${dt.total_sessions} න් ${dt.paid_sessions}`} />
            <StatCard icon="🌅" label="උදේ ප්‍රමාණ" color="blue"    value={String(Number(sb?.total_morning || 0))} sub="නිකුත් කළ" />
            <StatCard icon="🌆" label="සවස ප්‍රමාණ" color="blue"    value={String(Number(sb?.total_evening || 0))} sub="නිකුත් කළ" />
          </div>

          {/* ── Row 3: Employee sales + Category chart ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Sales by Employee */}
            <div className="bg-[#0d1629] border border-[#1e3a5f] rounded-xl p-5">
              <h2 className="text-[#4a9eff] font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                <span>👤</span> සේවකයා අනුව විකිණුම
                <span className="text-[#3a5a7a] text-xs font-normal normal-case">▼ භාණ්ඩ ක්ලික් කරන්න</span>
              </h2>
              {data.salesByEmployee.length === 0 ? (
                <p className="text-[#64748b] text-sm text-center py-8">දත්ත නොමැත</p>
              ) : (
                <div className="space-y-2">
                  {data.salesByEmployee.map((e, i) => (
                    <EmployeeCard key={i} e={e} maxSell={maxEmpSell} />
                  ))}
                </div>
              )}
            </div>

            {/* Items sold by Category */}
            <div className="bg-[#0d1629] border border-[#1e3a5f] rounded-xl p-5">
              <h2 className="text-[#4a9eff] font-bold text-sm uppercase tracking-widest mb-5 flex items-center gap-2">
                <span>🗂️</span> වර්ගය අනුව විකිණූ ප්‍රමාණ
              </h2>
              {data.soldByCategory.length === 0 ? (
                <p className="text-[#64748b] text-sm text-center py-8">දත්ත නොමැත</p>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2.5 mb-5">
                    {data.soldByCategory.map((c, i) => (
                      <HBar
                        key={i} label={c.category_name}
                        value={Number(c.total_sold)} maxVal={maxCatSold}
                        color={catColors[i % catColors.length]}
                      />
                    ))}
                  </div>
                  <div className="border-t border-[#1e3a5f] pt-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[#3a5a7a] uppercase tracking-widest">
                          <th className="text-left pb-2">වර්ගය</th>
                          <th className="text-center pb-2">ප්‍රමාණ</th>
                          <th className="text-right pb-2">විකිණුම</th>
                          <th className="text-right pb-2">ලාභය</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.soldByCategory.map((c, i) => (
                          <tr key={i} className="border-t border-[#071020]">
                            <td className="py-1.5">
                              <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${catColors[i % catColors.length]}`}></span>
                              <span className="text-[#c8d8f0]">{c.category_name}</span>
                            </td>
                            <td className="py-1.5 text-center text-[#fbbf24] font-bold">{Number(c.total_sold)}</td>
                            <td className="py-1.5 text-right text-[#22c55e]">රු.{Number(c.total_selling).toFixed(0)}</td>
                            <td className="py-1.5 text-right text-[#38bdf8]">රු.{(Number(c.total_selling) - Number(c.total_cost)).toFixed(0)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#1e3a5f] font-bold">
                          <td className="pt-2 text-[#4a9eff]">එකතුව</td>
                          <td className="pt-2 text-center text-[#fbbf24]">
                            {data.soldByCategory.reduce((a, c) => a + Number(c.total_sold), 0)}
                          </td>
                          <td className="pt-2 text-right text-[#22c55e]">
                            රු.{data.soldByCategory.reduce((a, c) => a + Number(c.total_selling), 0).toFixed(0)}
                          </td>
                          <td className="pt-2 text-right text-[#38bdf8]">
                            රු.{data.soldByCategory.reduce((a, c) => a + Number(c.total_selling) - Number(c.total_cost), 0).toFixed(0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Row 4: Top items ── */}
          <div className="bg-[#0d1629] border border-[#1e3a5f] rounded-xl p-5">
            <h2 className="text-[#4a9eff] font-bold text-sm uppercase tracking-widest mb-5 flex items-center gap-2">
              <span>🏆</span> වැඩිපුරම විකිණූ භාණ්ඩ <span className="text-[#3a5a7a] text-xs font-normal">(ඉහළම 10)</span>
            </h2>
            {data.topItems.length === 0 ? (
              <p className="text-[#64748b] text-sm text-center py-4">දත්ත නොමැත</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {data.topItems.map((item, i) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const rankColors = [
                    'border-[#4a3000] bg-[#1a1000]',
                    'border-[#2a3a4a] bg-[#0a1520]',
                    'border-[#2a1a00] bg-[#0e0900]',
                  ];
                  return (
                    <div key={i} className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${rankColors[i] || 'border-[#1e3a5f] bg-[#071020]'}`}>
                      <div className="text-2xl w-8 text-center shrink-0">
                        {i < 3 ? medals[i] : <span className="text-[#64748b] text-sm font-bold">#{i + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[#c8d8f0] text-sm font-semibold truncate">{item.item_name}</div>
                        <div className="text-[#64748b] text-xs">{item.category_name}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[#fbbf24] font-bold font-mono">{Number(item.total_sold)} ක්</div>
                        <div className="text-[#22c55e] text-xs">රු.{Number(item.total_selling).toFixed(0)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Row 5: Payment status + Session breakdown + Financial ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Payment status */}
            <div className="bg-[#0d1629] border border-[#1e3a5f] rounded-xl p-5">
              <h2 className="text-[#4a9eff] font-bold text-sm uppercase tracking-widest mb-5 flex items-center gap-2">
                <span>💳</span> ගෙවීම් තත්ත්වය
              </h2>
              <div className="flex gap-4 mb-5">
                <div className="flex-1 text-center bg-[#071a0e] border border-[#1a5a2e] rounded-xl py-4">
                  <div className="text-4xl font-bold text-[#22c55e]">{dt.paid_sessions}</div>
                  <div className="text-xs text-[#64748b] mt-1">ගෙවා ඇත</div>
                </div>
                <div className="flex-1 text-center bg-[#1a0707] border border-[#5a1a1a] rounded-xl py-4">
                  <div className="text-4xl font-bold text-[#ef4444]">{dt.unpaid_sessions}</div>
                  <div className="text-xs text-[#64748b] mt-1">ගෙවා නැත</div>
                  {Number(dt.unpaid_amount) > 0 && (
                    <div className="text-[10px] text-[#ef4444] mt-1">රු.{Number(dt.unpaid_amount).toFixed(2)}</div>
                  )}
                </div>
              </div>
              {(dt.paid_sessions + dt.unpaid_sessions) > 0 && (
                <>
                  <div className="w-full bg-[#071020] rounded-full h-5 overflow-hidden flex">
                    <div className="bg-[#22c55e] h-full transition-all duration-700"
                      style={{ width: `${(dt.paid_sessions / (dt.paid_sessions + dt.unpaid_sessions)) * 100}%` }} />
                    <div className="bg-[#ef4444] h-full flex-1" />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#64748b] mt-1.5">
                    <span className="text-[#22c55e]">ගෙවා ඇත: {((dt.paid_sessions / (dt.paid_sessions + dt.unpaid_sessions)) * 100).toFixed(0)}%</span>
                    <span className="text-[#ef4444]">ගෙවා නැත: {((dt.unpaid_sessions / (dt.paid_sessions + dt.unpaid_sessions)) * 100).toFixed(0)}%</span>
                  </div>
                </>
              )}
            </div>

            {/* Session breakdown */}
            <div className="bg-[#0d1629] border border-[#1e3a5f] rounded-xl p-5">
              <h2 className="text-[#4a9eff] font-bold text-sm uppercase tracking-widest mb-5 flex items-center gap-2">
                <span>🌅</span> නිකුත් කිරීමේ සාරාංශය
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center bg-[#041420] border border-[#0d3a4a] rounded-xl py-3">
                  <div className="text-3xl font-bold text-[#38bdf8]">{Number(sb?.total_morning || 0)}</div>
                  <div className="text-xs text-[#64748b] mt-1">🌅 උදේ</div>
                </div>
                <div className="text-center bg-[#0f0a1e] border border-[#2a1a4a] rounded-xl py-3">
                  <div className="text-3xl font-bold text-[#a78bfa]">{Number(sb?.total_evening || 0)}</div>
                  <div className="text-xs text-[#64748b] mt-1">🌆 සවස</div>
                </div>
                <div className="text-center bg-[#1a0707] border border-[#5a1a1a] rounded-xl py-3">
                  <div className="text-3xl font-bold text-[#ef4444]">{Number(sb?.total_returned || 0)}</div>
                  <div className="text-xs text-[#64748b] mt-1">↩ ආපසු</div>
                </div>
                <div className="text-center bg-[#1a1000] border border-[#4a3000] rounded-xl py-3">
                  <div className="text-3xl font-bold text-[#fbbf24]">{Number(sb?.total_net_sold || 0)}</div>
                  <div className="text-xs text-[#64748b] mt-1">✅ ශුද්ධ</div>
                </div>
              </div>
              <div className="text-center text-xs text-[#64748b] bg-[#071020] rounded-lg py-2">
                ශුද්ධ = උදේ + සවස − ආපසු
              </div>
            </div>

            {/* Financial summary */}
            <div className="bg-[#0d1629] border border-[#1e3a5f] rounded-xl p-5">
              <h2 className="text-[#4a9eff] font-bold text-sm uppercase tracking-widest mb-5 flex items-center gap-2">
                <span>💰</span> මූල්‍ය සාරාංශය
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-[#1a1000] border border-[#4a3000] rounded-xl px-4 py-3">
                  <div>
                    <div className="text-[#64748b] text-xs uppercase">මුළු පිරිවැය</div>
                    <div className="text-[#fbbf24] text-xl font-bold font-mono">රු. {Number(dt.grand_cost).toLocaleString('si-LK', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <span className="text-3xl opacity-30">📦</span>
                </div>
                <div className="flex items-center justify-between bg-[#071a0e] border border-[#1a5a2e] rounded-xl px-4 py-3">
                  <div>
                    <div className="text-[#64748b] text-xs uppercase">මුළු විකිණුම</div>
                    <div className="text-[#22c55e] text-xl font-bold font-mono">රු. {Number(dt.grand_selling).toLocaleString('si-LK', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <span className="text-3xl opacity-30">💵</span>
                </div>
                <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${profit >= 0 ? 'bg-[#041420] border-[#0d3a4a]' : 'bg-[#1a0707] border-[#5a1a1a]'}`}>
                  <div>
                    <div className="text-[#64748b] text-xs uppercase">ශුද්ධ ලාභය</div>
                    <div className={`text-xl font-bold font-mono ${profit >= 0 ? 'text-[#38bdf8]' : 'text-[#ef4444]'}`}>
                      රු. {profit.toLocaleString('si-LK', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[#64748b] text-xs mt-0.5">{profitMargin}% margin</div>
                  </div>
                  <span className="text-3xl opacity-30">{profit >= 0 ? '📈' : '📉'}</span>
                </div>
              </div>
              {Number(dt.grand_selling) > 0 && (
                <div className="mt-4">
                  <div className="w-full bg-[#071020] rounded-full h-5 overflow-hidden flex text-[10px] font-bold">
                    <div className="bg-[#1e4a7a] h-full flex items-center justify-center text-[#4a9eff] transition-all duration-700"
                      style={{ width: `${(Number(dt.grand_cost) / Number(dt.grand_selling)) * 100}%` }}>
                      {((Number(dt.grand_cost) / Number(dt.grand_selling)) * 100).toFixed(0)}%
                    </div>
                    <div className="bg-[#0d3a1e] h-full flex-1 flex items-center justify-center text-[#22c55e]">
                      {(100 - (Number(dt.grand_cost) / Number(dt.grand_selling)) * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#64748b] mt-1">
                    <span className="text-[#4a9eff]">■ පිරිවැය</span>
                    <span className="text-[#22c55e]">■ ලාභය</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}