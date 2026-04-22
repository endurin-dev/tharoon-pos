'use client';

import { useState, useEffect } from 'react';

interface AdminGuardProps {
  children: React.ReactNode;
  pageName: string;
}

// Expose a global lock function for the Sidebar
export function lockAdmin() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('admin_unlocked');
    window.dispatchEvent(new Event('admin_lock'));
  }
}

export default function AdminGuard({ children, pageName }: AdminGuardProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const check = () => {
      const isUnlocked = sessionStorage.getItem('admin_unlocked') === 'true';
      setUnlocked(isUnlocked);
    };
    check();
    window.addEventListener('admin_lock', check);
    return () => window.removeEventListener('admin_lock', check);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('admin_unlocked', 'true');
        setUnlocked(true);
      } else {
        setError(data.error || 'වැරදි මුරපදය');
        setPassword('');
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    } catch {
      setError('සේවාදායකය සම්බන්ධ කිරීමේ දෝෂයකි');
    }
    setLoading(false);
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#0a0f1e]">
      <div
        className={`bg-[#0d1629] border border-[#1e3a5f] rounded-2xl p-8 w-full max-w-sm shadow-2xl transition-transform ${shake ? 'animate-shake' : ''}`}
        style={shake ? { animation: 'shake 0.4s ease' } : {}}
      >
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">🔐</div>
          <h2 className="text-[#4a9eff] font-bold text-xl tracking-widest uppercase">{pageName}</h2>
          <p className="text-[#64748b] text-xs mt-2">පරිපාලක ප්‍රවේශය — මුරපදය ඇතුළු කරන්න</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[#4a9eff] text-xs uppercase tracking-widest block mb-2">මුරපදය</label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#071020] border border-[#1e3a5f] text-white px-4 py-3 rounded-lg text-sm focus:border-[#4a9eff] outline-none tracking-widest text-center text-xl"
            />
          </div>

          {error && (
            <div className="bg-[#3a0d0d] border border-[#5a1a1a] text-[#ef4444] px-3 py-2 rounded text-sm text-center font-semibold">
              ✕ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-[#1e4a7a] hover:bg-[#2a5f9a] text-white rounded-lg font-bold text-sm tracking-wider uppercase transition-all disabled:opacity-40 mt-1"
          >
            {loading ? '⏳ පරීක්ෂා කිරීම...' : '🔓 ඇතුල් වන්න'}
          </button>
        </form>

        <p className="text-center text-[#1e3a5f] text-xs mt-6">
          අනවසර ප්‍රවේශය දැඩි ලෙස තහනම්
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
