'use client';

import { useState } from 'react';
import AdminGuard from '@/components/AdminGuard';

function SetupContent() {
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInit = async () => {
    if (!confirm('CREATE TABLE IF NOT EXISTS සහ බීජ දත්ත ධාවනය කරන්නද?')) return;
    setLoading(true);
    const res = await fetch('/api/init', { method: 'POST' });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-[#4a9eff] font-bold text-xl mb-2 uppercase tracking-widest">⚙️ දත්ත සමුදා සැකසීම</h1>
      <p className="text-[#94a3b8] text-sm mb-6">
        අවශ්‍ය වගු සහ බීජ දත්ත සමග PostgreSQL දත්ත සමුදාව ආරම්භ කරන්න.
      </p>
      <div className="bg-[#0d1629] border border-[#1e3a5f] rounded-lg p-4 mb-4">
        <h2 className="text-[#4a9eff] font-semibold text-sm mb-2 uppercase tracking-widest">නිර්මිත වගු</h2>
        <ul className="text-[#94a3b8] text-xs space-y-1 font-mono">
          {['categories','items','employees','vehicles','employee_item_prices','issue_sessions','issue_items'].map(t => (
            <li key={t} className="flex items-center gap-2"><span className="text-[#4a9eff]">▸</span> {t}</li>
          ))}
        </ul>
      </div>
      <div className="bg-[#0d1629] border border-[#1e3a5f] rounded-lg p-4 mb-6">
        <h2 className="text-[#4a9eff] font-semibold text-sm mb-2 uppercase tracking-widest">පරිසරය</h2>
        <p className="text-[#94a3b8] text-xs">මුරපදය සැකසීමට <code className="text-[#fbbf24]">ADMIN_PASSWORD</code> env var එකක් add කරන්න:</p>
        <pre className="mt-2 bg-[#071020] border border-[#1e3a5f] rounded p-3 text-[#22c55e] text-xs overflow-x-auto">
{`DATABASE_URL=postgresql://user:pass@localhost:5432/bakery_db
ADMIN_PASSWORD=123`}
        </pre>
      </div>
      <button onClick={handleInit} disabled={loading}
        className="px-8 py-3 bg-[#1e4a7a] hover:bg-[#2a5f9a] text-white rounded-lg font-bold text-sm tracking-wider uppercase transition-all disabled:opacity-50">
        {loading ? '⏳ ආරම්භ වෙමින්...' : '🚀 දත්ත සමුදාව ආරම්භ කරන්න'}
      </button>
      {result && (
        <div className={`mt-4 px-4 py-3 rounded-lg border text-sm font-mono ${result.success ? 'bg-[#0d3a1e] border-[#1a5a2e] text-[#22c55e]' : 'bg-[#3a0d0d] border-[#5a1a1a] text-[#ef4444]'}`}>
          {result.success ? '✓ ' : '✕ '}{result.message || result.error}
        </div>
      )}
    </div>
  );
}

export default function SetupPage() {
  return <AdminGuard pageName="දත්ත සමුදා සැකසීම"><SetupContent /></AdminGuard>;
}
