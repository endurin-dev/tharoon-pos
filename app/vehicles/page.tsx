'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';

interface Employee { id: number; name: string; }
interface Vehicle { id: number; vehicle_number: string; employee_id: number | null; employee_name?: string; }

function VehiclesContent() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({ vehicle_number: '', employee_id: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [vRes, eRes] = await Promise.all([fetch('/api/vehicles').then(r => r.json()), fetch('/api/employees').then(r => r.json())]);
    setVehicles(vRes); setEmployees(eRes);
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = editId
      ? { id: editId, vehicle_number: form.vehicle_number, employee_id: form.employee_id ? Number(form.employee_id) : null, is_active: true }
      : { vehicle_number: form.vehicle_number, employee_id: form.employee_id ? Number(form.employee_id) : null };
    const res = await fetch('/api/vehicles', { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) { setMsg(editId ? 'යාවත්කාලීන විය!' : 'එකතු විය!'); setForm({ vehicle_number: '', employee_id: '' }); setEditId(null); load(); }
    else { const d = await res.json(); setMsg(d.error); }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('මෙම වාහනය අක්‍රිය කරන්නද?')) return;
    await fetch('/api/vehicles', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-[#4a9eff] font-bold text-xl mb-6 uppercase tracking-widest">🚚 වාහන</h1>
      <form onSubmit={handleSubmit} className="bg-[#0d1629] border border-[#1e3a5f] rounded-lg p-4 mb-6 grid grid-cols-2 gap-3">
        <div>
          <label className="text-[#4a9eff] text-xs uppercase tracking-widest block mb-1">වාහන අංකය</label>
          <input required value={form.vehicle_number} onChange={e => setForm(p => ({ ...p, vehicle_number: e.target.value }))} placeholder="උදා: 006"
            className="w-full bg-[#0a1628] border border-[#1e3a5f] text-white px-3 py-2 rounded text-sm focus:border-[#4a9eff] outline-none" />
        </div>
        <div>
          <label className="text-[#4a9eff] text-xs uppercase tracking-widest block mb-1">පවරන ලද සේවකයා</label>
          <select value={form.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}
            className="w-full bg-[#0a1628] border border-[#1e3a5f] text-white px-3 py-2 rounded text-sm focus:border-[#4a9eff] outline-none">
            <option value="">කිසිවෙකු නැත</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </select>
        </div>
        <div className="col-span-2 flex gap-2">
          <button className="px-6 py-2 bg-[#1e4a7a] hover:bg-[#2a5f9a] text-white rounded font-semibold text-sm transition-all">
            {editId ? 'වාහනය යාවත්කාලීන කරන්න' : 'වාහනය එකතු කරන්න'}
          </button>
          {editId && <button type="button" onClick={() => { setEditId(null); setForm({ vehicle_number: '', employee_id: '' }); }}
            className="px-4 py-2 bg-[#1e1a3a] text-[#a78bfa] rounded text-sm">අවලංගු කරන්න</button>}
        </div>
      </form>
      {msg && <div className="mb-4 px-4 py-2 bg-[#1e3a5f] text-[#4a9eff] rounded text-sm">{msg}</div>}
      <div className="bg-[#0d1629] border border-[#1e3a5f] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#071020] text-[#4a9eff] text-xs uppercase tracking-widest">
              <th className="text-left px-4 py-3">වාහන අංකය</th><th className="text-left px-4 py-3">සේවකයා</th><th className="px-4 py-3">ක්‍රියා</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v, i) => (
              <tr key={v.id} className={`border-t border-[#1e3a5f] ${i % 2 === 0 ? 'bg-[#0a1628]' : ''}`}>
                <td className="px-4 py-3 text-[#fbbf24] font-bold font-mono text-base">{v.vehicle_number}</td>
                <td className="px-4 py-3 text-[#c8d8f0]">{v.employee_name || '—'}</td>
                <td className="px-4 py-3 flex gap-2 justify-center">
                  <button onClick={() => { setEditId(v.id); setForm({ vehicle_number: v.vehicle_number, employee_id: v.employee_id ? String(v.employee_id) : '' }); }}
                    className="px-3 py-1 bg-[#1e3a5f] hover:bg-[#2a4f7a] text-[#4a9eff] rounded text-xs">සංස්කරණය</button>
                  <button onClick={() => handleDelete(v.id)}
                    className="px-3 py-1 bg-[#3a1e1e] hover:bg-[#5a2a2a] text-[#ef4444] rounded text-xs">ඉවත් කරන්න</button>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && <tr><td colSpan={3} className="text-center px-4 py-8 text-[#4a9eff] opacity-50">වාහන ලියාපදිංචි නොවේ.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function VehiclesPage() {
  return <AdminGuard pageName="වාහන කළමනාකරණය"><VehiclesContent /></AdminGuard>;
}
