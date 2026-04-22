'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';

interface Employee { id: number; name: string; nic: string; contact: string; }

function EmployeesContent() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({ name: '', nic: '', contact: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  const load = () => fetch('/api/employees').then(r => r.json()).then(setEmployees);
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = editId ? { ...form, id: editId, is_active: true } : form;
    const res = await fetch('/api/employees', { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) { setMsg(editId ? 'යාවත්කාලීන විය!' : 'සේවකයා එකතු විය!'); setForm({ name: '', nic: '', contact: '' }); setEditId(null); load(); }
    else { const d = await res.json(); setMsg(d.error); }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('මෙම සේවකයා අක්‍රිය කරන්නද?')) return;
    await fetch('/api/employees', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-[#4a9eff] font-bold text-xl mb-6 uppercase tracking-widest">👤 සේවකයන්</h1>
      <form onSubmit={handleSubmit} className="bg-[#0d1629] border border-[#1e3a5f] rounded-lg p-4 mb-6 grid grid-cols-3 gap-3">
        {[
          { key: 'name', label: 'සම්පූර්ණ නම', type: 'text', required: true },
          { key: 'nic', label: 'ජා.හැ.අ. / ID', type: 'text', required: false },
          { key: 'contact', label: 'දුරකථන අංකය', type: 'text', required: false },
        ].map(f => (
          <div key={f.key}>
            <label className="text-[#4a9eff] text-xs uppercase tracking-widest block mb-1">{f.label}</label>
            <input type={f.type} required={f.required} value={(form as any)[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              className="w-full bg-[#0a1628] border border-[#1e3a5f] text-white px-3 py-2 rounded text-sm focus:border-[#4a9eff] outline-none" />
          </div>
        ))}
        <div className="col-span-3 flex gap-2">
          <button className="px-6 py-2 bg-[#1e4a7a] hover:bg-[#2a5f9a] text-white rounded font-semibold text-sm transition-all">
            {editId ? 'සේවකයා යාවත්කාලීන කරන්න' : 'සේවකයා එකතු කරන්න'}
          </button>
          {editId && <button type="button" onClick={() => { setEditId(null); setForm({ name: '', nic: '', contact: '' }); }}
            className="px-4 py-2 bg-[#1e1a3a] text-[#a78bfa] rounded text-sm">අවලංගු කරන්න</button>}
        </div>
      </form>
      {msg && <div className="mb-4 px-4 py-2 bg-[#1e3a5f] text-[#4a9eff] rounded text-sm">{msg}</div>}
      <div className="bg-[#0d1629] border border-[#1e3a5f] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#071020] text-[#4a9eff] text-xs uppercase tracking-widest">
              <th className="text-left px-4 py-3">නම</th><th className="text-left px-4 py-3">ජා.හැ.අ.</th>
              <th className="text-left px-4 py-3">දුරකථනය</th><th className="px-4 py-3">ක්‍රියා</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, i) => (
              <tr key={emp.id} className={`border-t border-[#1e3a5f] ${i % 2 === 0 ? 'bg-[#0a1628]' : ''}`}>
                <td className="px-4 py-3 text-[#c8d8f0] font-semibold">{emp.name}</td>
                <td className="px-4 py-3 text-[#94a3b8]">{emp.nic || '—'}</td>
                <td className="px-4 py-3 text-[#94a3b8]">{emp.contact || '—'}</td>
                <td className="px-4 py-3 flex gap-2 justify-center">
                  <button onClick={() => { setEditId(emp.id); setForm({ name: emp.name, nic: emp.nic || '', contact: emp.contact || '' }); }}
                    className="px-3 py-1 bg-[#1e3a5f] hover:bg-[#2a4f7a] text-[#4a9eff] rounded text-xs">සංස්කරණය</button>
                  <button onClick={() => handleDelete(emp.id)}
                    className="px-3 py-1 bg-[#3a1e1e] hover:bg-[#5a2a2a] text-[#ef4444] rounded text-xs">ඉවත් කරන්න</button>
                </td>
              </tr>
            ))}
            {employees.length === 0 && <tr><td colSpan={4} className="text-center px-4 py-8 text-[#4a9eff] opacity-50">සේවකයන් ලියාපදිංචි නොවේ.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  return <AdminGuard pageName="සේවකයන් කළමනාකරණය"><EmployeesContent /></AdminGuard>;
}
