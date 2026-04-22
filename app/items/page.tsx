'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';

interface Category { id: number; name: string; }
interface Item { id: number; category_id: number; name: string; cost_price: number; selling_price: number; sort_order: number; category_name?: string; }

function ItemsContent() {
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [form, setForm] = useState({ category_id: '', name: '', cost_price: '', selling_price: '', sort_order: '0' });
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [itemsRes, catsRes] = await Promise.all([
      fetch('/api/items?with_categories=1').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]);
    setCats(catsRes);
    const seen = new Set<number>();
    const deduped: Item[] = [];
    for (const row of itemsRes) {
      if (row.id && !seen.has(row.id)) { seen.add(row.id); deduped.push({ ...row, category_name: row.category_name }); }
    }
    setItems(deduped);
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = editId
      ? { id: editId, ...form, category_id: Number(form.category_id), cost_price: Number(form.cost_price), selling_price: Number(form.selling_price), sort_order: Number(form.sort_order), is_active: true }
      : { ...form, category_id: Number(form.category_id), cost_price: Number(form.cost_price), selling_price: Number(form.selling_price), sort_order: Number(form.sort_order) };
    const res = await fetch('/api/items', { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) { setMsg(editId ? 'යාවත්කාලීන විය!' : 'එකතු විය!'); setForm({ category_id: '', name: '', cost_price: '', selling_price: '', sort_order: '0' }); setEditId(null); load(); }
    else { const d = await res.json(); setMsg(d.error); }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('මෙම භාණ්ඩය අක්‍රිය කරන්නද?')) return;
    await fetch('/api/items', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-[#4a9eff] font-bold text-xl mb-6 uppercase tracking-widest">🍞 භාණ්ඩ</h1>
      <form onSubmit={handleSubmit} className="bg-[#0d1629] border border-[#1e3a5f] rounded-lg p-4 mb-6 grid grid-cols-2 gap-3">
        <div>
          <label className="text-[#4a9eff] text-xs uppercase tracking-widest block mb-1">වර්ගය</label>
          <select required value={form.category_id} onChange={e => setForm(p => ({...p, category_id: e.target.value}))}
            className="w-full bg-[#0a1628] border border-[#1e3a5f] text-white px-3 py-2 rounded text-sm focus:border-[#4a9eff] outline-none">
            <option value="">වර්ගය තෝරන්න...</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[#4a9eff] text-xs uppercase tracking-widest block mb-1">භාණ්ඩයේ නම</label>
          <input required value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
            className="w-full bg-[#0a1628] border border-[#1e3a5f] text-white px-3 py-2 rounded text-sm focus:border-[#4a9eff] outline-none" />
        </div>
        <div>
          <label className="text-[#4a9eff] text-xs uppercase tracking-widest block mb-1">පිරිවැය මිල (රු.)</label>
          <input type="number" step="0.01" required value={form.cost_price} onChange={e => setForm(p => ({...p, cost_price: e.target.value}))}
            className="w-full bg-[#0a1628] border border-[#1e3a5f] text-white px-3 py-2 rounded text-sm focus:border-[#4a9eff] outline-none" />
        </div>
        <div>
          <label className="text-[#4a9eff] text-xs uppercase tracking-widest block mb-1">විකිණුම් මිල (රු.)</label>
          <input type="number" step="0.01" required value={form.selling_price} onChange={e => setForm(p => ({...p, selling_price: e.target.value}))}
            className="w-full bg-[#0a1628] border border-[#1e3a5f] text-white px-3 py-2 rounded text-sm focus:border-[#4a9eff] outline-none" />
        </div>
        <div>
          <label className="text-[#4a9eff] text-xs uppercase tracking-widest block mb-1">අනුපිළිවෙල</label>
          <input type="number" value={form.sort_order} onChange={e => setForm(p => ({...p, sort_order: e.target.value}))}
            className="w-full bg-[#0a1628] border border-[#1e3a5f] text-white px-3 py-2 rounded text-sm focus:border-[#4a9eff] outline-none" />
        </div>
        <div className="flex items-end gap-2">
          <button className="px-6 py-2 bg-[#1e4a7a] hover:bg-[#2a5f9a] text-white rounded font-semibold text-sm">{editId ? 'යාවත්කාලීන' : 'භාණ්ඩය එකතු කරන්න'}</button>
          {editId && <button type="button" onClick={() => { setEditId(null); setForm({ category_id: '', name: '', cost_price: '', selling_price: '', sort_order: '0' }); }}
            className="px-4 py-2 bg-[#1e1a3a] text-[#a78bfa] rounded text-sm">අවලංගු</button>}
        </div>
      </form>
      {msg && <div className="mb-4 px-4 py-2 bg-[#1e3a5f] text-[#4a9eff] rounded text-sm">{msg}</div>}
      <div className="bg-[#0d1629] border border-[#1e3a5f] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#071020] text-[#4a9eff] text-xs uppercase tracking-widest">
              <th className="text-left px-4 py-3">වර්ගය</th><th className="text-left px-4 py-3">භාණ්ඩය</th>
              <th className="text-right px-4 py-3">පිරිවැය</th><th className="text-right px-4 py-3">විකිණුම</th><th className="px-4 py-3">ක්‍රියා</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} className={`border-t border-[#1e3a5f] ${i%2===0?'bg-[#0a1628]':''}`}>
                <td className="px-4 py-2 text-[#fbbf24] text-xs">{item.category_name}</td>
                <td className="px-4 py-2 text-[#c8d8f0]">{item.name}</td>
                <td className="px-4 py-2 text-right text-[#94a3b8]">{Number(item.cost_price).toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-[#22c55e]">{Number(item.selling_price).toFixed(2)}</td>
                <td className="px-4 py-2 flex gap-2 justify-center">
                  <button onClick={() => { setEditId(item.id); setForm({ category_id: String(item.category_id), name: item.name, cost_price: String(item.cost_price), selling_price: String(item.selling_price), sort_order: String(item.sort_order) }); }}
                    className="px-3 py-1 bg-[#1e3a5f] hover:bg-[#2a4f7a] text-[#4a9eff] rounded text-xs">සංස්කරණය</button>
                  <button onClick={() => handleDelete(item.id)}
                    className="px-3 py-1 bg-[#3a1e1e] hover:bg-[#5a2a2a] text-[#ef4444] rounded text-xs">ඉවත් කරන්න</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ItemsPage() {
  return <AdminGuard pageName="භාණ්ඩ කළමනාකරණය"><ItemsContent /></AdminGuard>;
}
