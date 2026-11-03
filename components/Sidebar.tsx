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
  const isIssuePage = pathname === '/issue';
  const [isCollapsed, setIsCollapsed] = useState(true);
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
    <nav className={`${isCollapsed ? 'w-16' : 'w-52'} ${isIssuePage ? 'bg-white border-slate-200' : 'bg-[#071020] border-[#1e3a5f]'} border-r flex flex-col shrink-0 transition-[width] duration-200`}>
      {/* Brand */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-3 border-b ${isIssuePage ? 'border-slate-200' : 'border-[#1e3a5f]'}`}>
        {!isCollapsed && (
          <div className="min-w-0">
            <div className={`${isIssuePage ? 'text-blue-700' : 'text-[#4a9eff]'} font-bold text-lg tracking-wider whitespace-nowrap`}>තරූන් බේකර්ස්</div>
            <div className={`${isIssuePage ? 'text-slate-500' : 'text-[#94a3b8]'} text-[10px] uppercase tracking-widest mt-0.5 whitespace-nowrap`}>කළමනාකරණ පද්ධතිය</div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed(collapsed => !collapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`rounded p-2 transition-colors ${isIssuePage ? 'text-slate-600 hover:bg-slate-100' : 'text-[#94a3b8] hover:bg-[#0d1629]'}`}
        >
          {isCollapsed ? '☰' : '‹'}
        </button>
      </div>

      {/* Nav Items */}
      <div className="flex-1 py-2 overflow-y-auto">
        {navItems.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-4'} py-2.5 text-sm transition-all ${
                isActive
                  ? isIssuePage
                    ? 'bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-600'
                    : 'bg-[#1e3a5f] text-[#4a9eff] font-semibold border-r-2 border-[#4a9eff]'
                  : isIssuePage
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    : 'text-[#94a3b8] hover:text-white hover:bg-[#0d1629]'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {!isCollapsed && <span className="flex-1">{item.label}</span>}
              {!isCollapsed && item.protected && (
                <span className="text-[10px] opacity-50" title="මුරපද ආරක්ෂිතයි">
                  {isAdminUnlocked ? '🔓' : '🔒'}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className={`border-t ${isIssuePage ? 'border-slate-200' : 'border-[#1e3a5f]'}`}>
        {/* Admin lock/unlock status */}
        {isAdminUnlocked && (
          <button
            onClick={handleLock}
            title={isCollapsed ? 'පරිපාලකය අගුළු දමන්න' : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2 px-4'} py-2.5 text-xs text-[#ef4444] ${isIssuePage ? 'hover:bg-red-50' : 'hover:bg-[#1a0808]'} transition-all`}
          >
            <span>🔐</span>
            {!isCollapsed && <span>පරිපාලකය අගුළු දමන්න</span>}
          </button>
        )}
        {!isCollapsed && (
          <div className="px-4 py-3">
            <div className={`${isIssuePage ? 'text-blue-700' : 'text-[#4a9eff]'} text-[10px] uppercase tracking-widest`}>
              {dateStr}
            </div>
            {isAdminUnlocked && (
              <div className="text-[#22c55e] text-[9px] mt-0.5 uppercase tracking-widest">● පරිපාලකව ඇතුලත්</div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}