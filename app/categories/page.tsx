'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';

interface Category { id: number; name: string; sort_order: number; }

function CategoriesContent() {
  const [cats, setCats] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: '', sort_order: '0' });
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  const load = () => fetch('/api/categories').then(r => r.json()).then(setCats);
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editId ? 'PUT' : 'POST';
    const body = editId ? { ...form, id: editId } : form;
    const res = await fetch('/api/categories', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) { setMsg(editId ? 'යාවත්කාලීන විය!' : 'එකතු විය!'); setForm({ name: '', sort_order: '0' }); setEditId(null); load(); }
    else { const d = await res.json(); setMsg(d.error); }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('මෙම වර්ගය මකන්නද?')) return;
    await fetch('/api/categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-[#4a9eff] font-bold text-xl mb-6 uppercase tracking-widest">🗂️ වර්ග</h1>
      <form onSubmit={handleSubmit} className="bg-[#0d1629] border border-[#1e3a5f] rounded-lg p-4 mb-6 flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-[#4a9eff] text-xs uppercase tracking-widest block mb-1">වර්ගයේ නම</label>
          <input required value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
            className="w-full bg-[#0a1628] border border-[#1e3a5f] text-white px-3 py-2 rounded text-sm focus:border-[#4a9eff] outline-none" />
        </div>
        <div className="w-24">
          <label className="text-[#4a9eff] text-xs uppercase tracking-widest block mb-1">අනුපිළිවෙල</label>
          <input type="number" value={form.sort_order} onChange={e => setForm(p => ({...p, sort_order: e.target.value}))}
            className="w-full bg-[#0a1628] border border-[#1e3a5f] text-white px-3 py-2 rounded text-sm focus:border-[#4a9eff] outline-none" />
        </div>
        <button className="px-4 py-2 bg-[#1e4a7a] hover:bg-[#2a5f9a] text-white rounded font-semibold text-sm transition-all">{editId ? 'යාවත්කාලීන' : 'එකතු කරන්න'}</button>
        {editId && <button type="button" onClick={() => { setEditId(null); setForm({ name: '', sort_order: '0' }); }}
          className="px-4 py-2 bg-[#1e1a3a] text-[#a78bfa] rounded font-semibold text-sm">අවලංගු</button>}
      </form>
      {msg && <div className="mb-4 px-4 py-2 bg-[#1e3a5f] text-[#4a9eff] rounded text-sm">{msg}</div>}
      <div className="bg-[#0d1629] border border-[#1e3a5f] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#071020] text-[#4a9eff] text-xs uppercase tracking-widest">
              <th className="text-left px-4 py-3">නම</th><th className="text-center px-4 py-3">අනුපිළිවෙල</th><th className="px-4 py-3">ක්‍රියා</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c, i) => (
              <tr key={c.id} className={`border-t border-[#1e3a5f] ${i%2===0?'bg-[#0a1628]':''}`}>
                <td className="px-4 py-3 text-[#c8d8f0] font-medium">{c.name}</td>
                <td className="px-4 py-3 text-center text-[#94a3b8]">{c.sort_order}</td>
                <td className="px-4 py-3 flex gap-2 justify-center">
                  <button onClick={() => { setEditId(c.id); setForm({ name: c.name, sort_order: String(c.sort_order) }); }}
                    className="px-3 py-1 bg-[#1e3a5f] hover:bg-[#2a4f7a] text-[#4a9eff] rounded text-xs">සංස්කරණය</button>
                  <button onClick={() => handleDelete(c.id)}
                    className="px-3 py-1 bg-[#3a1e1e] hover:bg-[#5a2a2a] text-[#ef4444] rounded text-xs">මකන්න</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  return <AdminGuard pageName="වර්ග කළමනාකරණය"><CategoriesContent /></AdminGuard>;
}
