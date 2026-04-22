'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { lockAdmin } from './AdminGuard';

const navItems = [
  { href: '/issue',           label: 'භාණ්ඩ නිකුත් කිරීම', icon: '📦', protected: false },
  { href: '/dashboard',       label: 'දළ විශ්ලේෂණය',       icon: '📊', protected: false },
  { href: '/categories',      label: 'වර්ග',               icon: '🗂️', protected: true  },
  { href: '/items',           label: 'භාණ්ඩ',              icon: '🍞', protected: true  },
  { href: '/employees',       label: 'සේවකයන්',            icon: '👤', protected: true  },
  { href: '/employee-prices', label: 'සේවක මිල',           icon: '💰', protected: true  },
  { href: '/vehicles',        label: 'වාහන',               icon: '🚚', protected: true  },
  { href: '/setup',           label: 'DB සැකසීම',          icon: '⚙️', protected: true  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString('si-LK'));
    const check = () => {
      setIsAdminUnlocked(sessionStorage.getItem('admin_unlocked') === 'true');
    };
    check();
    window.addEventListener('admin_lock', check);
    // Also re-check on storage events (other tabs)
    window.addEventListener('storage', check);
    return () => {
      window.removeEventListener('admin_lock', check);
      window.removeEventListener('storage', check);
    };
  }, []);

  // Re-check after navigation (when returning from admin page)
  useEffect(() => {
    setIsAdminUnlocked(sessionStorage.getItem('admin_unlocked') === 'true');
  }, [pathname]);

  const handleLock = () => {
    if (confirm('පරිපාලක ප්‍රවේශය අගුළු දමන්නද?')) {
      lockAdmin();
      setIsAdminUnlocked(false);
    }
  };

  return (
    <nav className="w-52 bg-[#071020] border-r border-[#1e3a5f] flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-[#1e3a5f]">
        <div className="text-[#4a9eff] font-bold text-lg tracking-wider">තරූන් බේකර්ස්</div>
        <div className="text-[#94a3b8] text-[10px] uppercase tracking-widest mt-0.5">කළමනාකරණ පද්ධතිය</div>
      </div>

      {/* Nav Items */}
      <div className="flex-1 py-2 overflow-y-auto">
        {navItems.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                isActive
                  ? 'bg-[#1e3a5f] text-[#4a9eff] font-semibold border-r-2 border-[#4a9eff]'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#0d1629]'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.protected && (
                <span className="text-[10px] opacity-50" title="මුරපද ආරක්ෂිතයි">
                  {isAdminUnlocked ? '🔓' : '🔒'}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-[#1e3a5f]">
        {/* Admin lock/unlock status */}
        {isAdminUnlocked && (
          <button
            onClick={handleLock}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-[#ef4444] hover:bg-[#1a0808] transition-all"
          >
            <span>🔐</span>
            <span>පරිපාලකය අගුළු දමන්න</span>
          </button>
        )}
        <div className="px-4 py-3">
          <div className="text-[#4a9eff] text-[10px] uppercase tracking-widest">
            {dateStr}
          </div>
          {isAdminUnlocked && (
            <div className="text-[#22c55e] text-[9px] mt-0.5 uppercase tracking-widest">● පරිපාලකව ඇතුලත්</div>
          )}
        </div>
      </div>
    </nav>
  );
}