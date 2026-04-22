'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { CategoryWithItems, Employee, Vehicle } from '@/lib/types';
import { BillRow } from '@/app/page';

interface IssueGridProps {
  categories: CategoryWithItems[];
  employees: Employee[];
  vehicles: Vehicle[];
  sessionType: 'morning' | 'full_day';
  selectedDate: string;
  selectedEmployee: Employee | null;
  selectedVehicle: Vehicle | null;
  onSessionTypeChange: (t: 'morning' | 'full_day') => void;
  onDateChange: (d: string) => void;
  onEmployeeChange: (e: Employee | null) => void;
  onVehicleChange: (v: Vehicle | null) => void;
  onCategoryChange: (catId: number, itemId: number, field: 'morning_qty' | 'evening_qty' | 'returned_qty', val: number) => void;
  onSave: () => void;
  onUpdate: () => void;
  onGetBill: () => void;
  onSummary: () => void;
  isSaving: boolean;
  paymentStatus: 'paid' | 'unpaid';
  onPaymentStatusChange: (s: 'paid' | 'unpaid') => void;
  sessionExists: boolean;
  sessionId: number | null;
  finalBalance: number;
  grandTotalCost: number;
  grandTotalSelling: number;
  billRows: BillRow[];
  billRowsTotal: number;
  onSaveBillRow: (row: BillRow) => Promise<void>;
  onDeleteBillRow: (id: number) => Promise<void>;
}

const EMPTY_ROW = { description: '', qty: 1, amount: 0, sort_order: 0 };

export default function IssueGrid({
  categories, employees, vehicles, sessionType, selectedDate, selectedEmployee,
  selectedVehicle, onSessionTypeChange, onDateChange, onEmployeeChange, onVehicleChange,
  onCategoryChange, onSave, onUpdate, onGetBill, onSummary, isSaving,
  paymentStatus, onPaymentStatusChange, sessionExists, sessionId,
  finalBalance, grandTotalCost, grandTotalSelling,
  billRows, billRowsTotal, onSaveBillRow, onDeleteBillRow,
}: IssueGridProps) {
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const inputOrder = useRef<string[]>([]);

  const [showBillRows, setShowBillRows] = useState(false);
  const [editingRow, setEditingRow] = useState<BillRow | null>(null);
  const [savingRow, setSavingRow] = useState(false);

  useEffect(() => {
    const keys: string[] = [];
    for (const cat of categories) {
      for (const item of cat.items) {
        keys.push(`${item.id}-morning`);
        if (sessionType === 'full_day') keys.push(`${item.id}-evening`);
        keys.push(`${item.id}-returned`);
      }
    }
    inputOrder.current = keys;
  }, [categories, sessionType]);

  const registerRef = useCallback((key: string, el: HTMLInputElement | null) => {
    if (el) inputRefs.current.set(key, el);
    else inputRefs.current.delete(key);
  }, []);

  const focusKey2 = useCallback((key: string) => {
    const el = inputRefs.current.get(key);
    if (el) { el.focus(); el.select(); setFocusKey(key); }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, currentKey: string) => {
    const order = inputOrder.current;
    const idx = order.indexOf(currentKey);
    const currentField = currentKey.substring(currentKey.lastIndexOf('-') + 1);
    const sameFieldKeys = order.filter(k => k.endsWith(`-${currentField}`));
    const fieldIdx = sameFieldKeys.indexOf(currentKey);

    if (e.key === 'Enter') {
      e.preventDefault();
      const nextKey = sameFieldKeys[fieldIdx + 1];
      if (nextKey) {
        focusKey2(nextKey);
      } else {
        const nextInOrder = order[idx + 1];
        if (nextInOrder) {
          const nextField = nextInOrder.substring(nextInOrder.lastIndexOf('-') + 1);
          const nextColKeys = order.filter(k => k.endsWith(`-${nextField}`));
          if (nextColKeys.length > 0) focusKey2(nextColKeys[0]);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const next = order[idx + 1];
      if (next) focusKey2(next);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextKey = sameFieldKeys[fieldIdx + 1];
      if (nextKey) focusKey2(nextKey);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevKey = sameFieldKeys[fieldIdx - 1];
      if (prevKey) focusKey2(prevKey);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = order[idx + 1];
      if (next) focusKey2(next);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = order[idx - 1];
      if (prev) focusKey2(prev);
    }
  }, [focusKey2]);

  const startNewRow = () => {
    setEditingRow({ ...EMPTY_ROW, sort_order: billRows.length });
    setShowBillRows(true);
  };

  const handleSaveRow = async () => {
    if (!editingRow || !editingRow.description.trim()) return;
    setSavingRow(true);
    await onSaveBillRow(editingRow);
    setSavingRow(false);
    setEditingRow(null);
  };

  const handleEditExisting = (row: BillRow) => {
    setEditingRow({ ...row });
    setShowBillRows(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f1e] text-white font-mono">

      {/* ── TOP CONTROLS ── */}
      <div className="bg-[#0d1629] border-b border-[#1e3a5f] px-4 py-2 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-[#4a9eff] font-semibold uppercase tracking-widest text-xs">දිනය</span>
          <input type="date" value={selectedDate} onChange={e => onDateChange(e.target.value)}
            className="bg-[#0a1628] border border-[#1e3a5f] text-white px-2 py-1 rounded text-sm focus:border-[#4a9eff] outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#4a9eff] font-semibold uppercase tracking-widest text-xs">සේවකයා</span>
          <select value={selectedEmployee?.id ?? ''}
            onChange={e => { const emp = employees.find(x => x.id === Number(e.target.value)) || null; onEmployeeChange(emp); }}
            className="bg-[#0a1628] border border-[#1e3a5f] text-white px-2 py-1 rounded text-sm focus:border-[#4a9eff] outline-none min-w-[130px]">
            <option value="">තෝරන්න...</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#4a9eff] font-semibold uppercase tracking-widest text-xs">වාහනය</span>
          <select value={selectedVehicle?.id ?? ''}
            onChange={e => { const v = vehicles.find(x => x.id === Number(e.target.value)) || null; onVehicleChange(v); }}
            className="bg-[#0a1628] border border-[#1e3a5f] text-white px-2 py-1 rounded text-sm focus:border-[#4a9eff] outline-none min-w-[100px]">
            <option value="">කිසිවක් නැත</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3 border-l border-[#1e3a5f] pl-4">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="radio" name="session" value="morning" checked={sessionType === 'morning'}
              onChange={() => onSessionTypeChange('morning')} className="accent-[#4a9eff]" />
            <span className="text-[#a0b8d8] text-xs">උදේ</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="radio" name="session" value="full_day" checked={sessionType === 'full_day'}
              onChange={() => onSessionTypeChange('full_day')} className="accent-[#4a9eff]" />
            <span className="text-[#a0b8d8] text-xs">සම්පූර්ණ දිනය</span>
          </label>
        </div>
        <div className="flex items-center gap-3 border-l border-[#1e3a5f] pl-4">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="radio" name="payment" value="paid" checked={paymentStatus === 'paid'}
              onChange={() => onPaymentStatusChange('paid')} className="accent-[#22c55e]" />
            <span className="text-[#a0b8d8] text-xs">ගෙවා ඇත</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="radio" name="payment" value="unpaid" checked={paymentStatus === 'unpaid'}
              onChange={() => onPaymentStatusChange('unpaid')} className="accent-[#ef4444]" />
            <span className="text-[#a0b8d8] text-xs">ගෙවා නැත</span>
          </label>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={onSummary} className="px-3 py-1 bg-[#1e3a5f] hover:bg-[#2a4f7a] text-[#4a9eff] text-xs rounded border border-[#2a4f7a] transition-all">සාරාංශය</button>
          <button onClick={onGetBill} className="px-3 py-1 bg-[#164a2e] hover:bg-[#1e6640] text-[#22c55e] text-xs rounded border border-[#1e6640] transition-all">බිල ලබාගන්න</button>
        </div>
      </div>

      {/* ── GRID HEADER ── */}
      <div className="bg-[#071020] border-b border-[#1e3a5f] sticky top-0 z-20">
        <div className="grid text-[10px] font-bold uppercase tracking-widest text-[#4a9eff]" style={{
          gridTemplateColumns: '160px 140px 80px 80px 80px 90px 90px 90px 90px'
        }}>
          <div className="px-3 py-2 border-r border-[#1e3a5f]">වර්ගය</div>
          <div className="px-3 py-2 border-r border-[#1e3a5f]">භාණ්ඩය</div>
          <div className="px-2 py-2 border-r border-[#1e3a5f] text-center">උදේ ප්‍රමාණ</div>
          {sessionType === 'full_day' && <div className="px-2 py-2 border-r border-[#1e3a5f] text-center">සවස ප්‍රමාණ</div>}
          <div className="px-2 py-2 border-r border-[#1e3a5f] text-center">ආපසු</div>
          <div className="px-2 py-2 border-r border-[#1e3a5f] text-center">පිරිවැය</div>
          <div className="px-2 py-2 border-r border-[#1e3a5f] text-center">විකිණුම</div>
          <div className="px-2 py-2 border-r border-[#1e3a5f] text-center">මුළු පිරිවැය</div>
          <div className="px-2 py-2 text-center">මුළු විකිණුම</div>
        </div>
      </div>

      {/* ── GRID BODY ── */}
      <div className="flex-1 overflow-y-auto">
        {categories.map(cat => {
          let catCost = 0, catSell = 0;
          cat.items.forEach(item => {
            const sold = Math.max(0, item.morning_qty + item.evening_qty - item.returned_qty);
            catCost += sold * item.effective_cost;
            catSell += sold * item.effective_selling;
          });
          return (
            <div key={cat.id} className="border-b border-[#1e3a5f]">
              {cat.items.map((item, idx) => {
                const sold = Math.max(0, item.morning_qty + item.evening_qty - item.returned_qty);
                const totalCost = sold * item.effective_cost;
                const totalSell = sold * item.effective_selling;
                const morningKey = `${item.id}-morning`;
                const eveningKey = `${item.id}-evening`;
                const returnedKey = `${item.id}-returned`;
                return (
                  <div key={item.id}
                    className="grid border-b border-[#0d1629] hover:bg-[#0d1a30] transition-colors"
                    style={{ gridTemplateColumns: '160px 140px 80px 80px 80px 90px 90px 90px 90px' }}>
                    <div className={`px-3 py-1.5 border-r border-[#1e3a5f] flex items-center ${idx === 0 ? 'text-[#fbbf24] font-bold text-xs' : ''}`}>
                      {idx === 0 ? cat.name : ''}
                    </div>
                    <div className="px-3 py-1.5 border-r border-[#1e3a5f] text-[#c8d8f0] text-xs flex items-center">{item.name}</div>
                    <div className="border-r border-[#1e3a5f] flex items-center justify-center p-0.5">
                      <input ref={el => registerRef(morningKey, el)} type="number" min={0}
                        value={item.morning_qty || ''}
                        onChange={e => onCategoryChange(cat.id, item.id, 'morning_qty', Number(e.target.value) || 0)}
                        onFocus={e => { e.target.select(); setFocusKey(morningKey); }}
                        onKeyDown={e => handleKeyDown(e, morningKey)}
                        className={`w-full h-full bg-transparent text-center text-sm outline-none border rounded px-1 py-0.5
                          ${focusKey === morningKey ? 'border-[#4a9eff] bg-[#0d2040] text-white' : 'border-transparent text-[#7cb8ff] hover:border-[#2a4f7a]'}
                          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      />
                    </div>
                    {sessionType === 'full_day' && (
                      <div className="border-r border-[#1e3a5f] flex items-center justify-center p-0.5">
                        <input ref={el => registerRef(eveningKey, el)} type="number" min={0}
                          value={item.evening_qty || ''}
                          onChange={e => onCategoryChange(cat.id, item.id, 'evening_qty', Number(e.target.value) || 0)}
                          onFocus={e => { e.target.select(); setFocusKey(eveningKey); }}
                          onKeyDown={e => handleKeyDown(e, eveningKey)}
                          className={`w-full h-full bg-transparent text-center text-sm outline-none border rounded px-1 py-0.5
                            ${focusKey === eveningKey ? 'border-[#4a9eff] bg-[#0d2040] text-white' : 'border-transparent text-[#7cb8ff] hover:border-[#2a4f7a]'}
                            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                        />
                      </div>
                    )}
                    <div className="border-r border-[#1e3a5f] flex items-center justify-center p-0.5">
                      <input ref={el => registerRef(returnedKey, el)} type="number" min={0}
                        value={item.returned_qty || ''}
                        onChange={e => onCategoryChange(cat.id, item.id, 'returned_qty', Number(e.target.value) || 0)}
                        onFocus={e => { e.target.select(); setFocusKey(returnedKey); }}
                        onKeyDown={e => handleKeyDown(e, returnedKey)}
                        className={`w-full h-full bg-transparent text-center text-sm outline-none border rounded px-1 py-0.5
                          ${focusKey === returnedKey ? 'border-[#f97316] bg-[#1a0d00] text-orange-300' : 'border-transparent text-[#f97316] hover:border-[#7a3a1a]'}
                          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      />
                    </div>
                    <div className="border-r border-[#1e3a5f] flex items-center justify-end px-2 text-xs text-[#94a3b8]">
                      {item.effective_cost > 0 ? item.effective_cost.toFixed(2) : '-'}
                    </div>
                    <div className="border-r border-[#1e3a5f] flex items-center justify-end px-2 text-xs text-[#94a3b8]">
                      {item.effective_selling > 0 ? item.effective_selling.toFixed(2) : '-'}
                    </div>
                    <div className="border-r border-[#1e3a5f] flex items-center justify-end px-2 text-xs text-[#fbbf24]">
                      {totalCost > 0 ? totalCost.toFixed(2) : '-'}
                    </div>
                    <div className="flex items-center justify-end px-2 text-xs text-[#22c55e]">
                      {totalSell > 0 ? totalSell.toFixed(2) : '-'}
                    </div>
                  </div>
                );
              })}
              {(catCost > 0 || catSell > 0) && (
                <div className="grid bg-[#071420] text-[10px]" style={{
                  gridTemplateColumns: '160px 140px 80px 80px 80px 90px 90px 90px 90px'
                }}>
                  <div className="px-3 py-1 text-right text-[#4a9eff] uppercase tracking-widest"
                    style={{ gridColumn: sessionType === 'full_day' ? '1 / 8' : '1 / 7' }}>
                    {cat.name} උප එකතුව
                  </div>
                  <div className="px-2 py-1 text-right text-[#fbbf24] border-l border-[#1e3a5f]">{catCost.toFixed(2)}</div>
                  <div className="px-2 py-1 text-right text-[#22c55e] border-l border-[#1e3a5f]">{catSell.toFixed(2)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── EXTRA BILL ROWS PANEL ── */}
      {showBillRows && (
        <div className="bg-[#0a0d1a] border-t-2 border-[#2a1a4a] px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[#a78bfa] text-xs uppercase tracking-widest font-semibold">➕ අතිරේක බිල් පේළි</span>
              <span className="text-[#64748b] text-xs">(බිලේ දිස්වේ, ශේෂයට ඇතුළත් වේ)</span>
            </div>
            {!sessionId && (
              <span className="text-[#ef4444] text-xs animate-pulse">⚠ පළමුව සැසිය සුරකින්න</span>
            )}
          </div>

          {billRows.length > 0 && (
            <div className="mb-3 rounded-lg border border-[#2a1a4a] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#0d0a1e] text-[#a78bfa] uppercase tracking-widest text-[10px]">
                    <th className="text-left px-3 py-2 border-r border-[#2a1a4a]">විස්තරය</th>
                    <th className="text-center px-2 py-2 border-r border-[#2a1a4a] w-16">ගණන</th>
                    <th className="text-right px-2 py-2 border-r border-[#2a1a4a] w-24">මිල (රු.)</th>
                    <th className="text-right px-2 py-2 border-r border-[#2a1a4a] w-24">එකතුව</th>
                    <th className="w-28 px-2 py-2 text-center">ක්‍රියා</th>
                  </tr>
                </thead>
                <tbody>
                  {billRows.map((row, i) => (
                    <tr key={row.id ?? i} className={`border-t border-[#1a1030] ${i % 2 === 0 ? 'bg-[#0a0f1e]' : 'bg-[#0d0a20]'}`}>
                      <td className="px-3 py-1.5 text-[#c8d8f0] border-r border-[#1a1030]">{row.description}</td>
                      <td className="px-2 py-1.5 text-center text-[#94a3b8] border-r border-[#1a1030]">{Number(row.qty)}</td>
                      <td className="px-2 py-1.5 text-right text-[#94a3b8] border-r border-[#1a1030]">{Number(row.amount).toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-right font-semibold text-[#22c55e] border-r border-[#1a1030]">
                        {(Number(row.qty) * Number(row.amount)).toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => handleEditExisting(row)}
                            className="px-2 py-0.5 bg-[#1e3a5f] hover:bg-[#2a4f7a] text-[#4a9eff] rounded text-[10px] transition-colors">
                            සංස්කරණය
                          </button>
                          <button onClick={() => row.id && onDeleteBillRow(row.id)}
                            className="px-2 py-0.5 bg-[#3a1e1e] hover:bg-[#5a2a2a] text-[#ef4444] rounded text-[10px] transition-colors">
                            ඉවත්
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-[#2a1a4a] bg-[#0d0a1e]">
                    <td colSpan={3} className="px-3 py-1.5 text-right text-[#a78bfa] text-[10px] uppercase tracking-widest font-bold border-r border-[#1a1030]">
                      අතිරේක මුළු එකතුව
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold text-[#22c55e] border-r border-[#1a1030]">
                      රු. {billRowsTotal.toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {editingRow !== null ? (
            <div className="flex items-center gap-2 flex-wrap bg-[#0d1220] border border-[#2a1a4a] rounded-lg px-3 py-2">
              <input
                type="text"
                placeholder="විස්තරය (eg: transport, extra charge...)"
                value={editingRow.description}
                onChange={e => setEditingRow(prev => prev ? { ...prev, description: e.target.value } : null)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveRow(); }}
                className="flex-1 min-w-[200px] bg-[#071020] border border-[#2a1a4a] focus:border-[#a78bfa] text-white px-3 py-1.5 rounded text-sm outline-none placeholder-[#3a4a6a]"
              />
              <div className="flex items-center gap-1.5">
                <span className="text-[#64748b] text-xs whitespace-nowrap">ගණන:</span>
                <input type="number" min={0} step="0.01" value={editingRow.qty}
                  onChange={e => setEditingRow(prev => prev ? { ...prev, qty: Number(e.target.value) || 0 } : null)}
                  onFocus={e => e.target.select()}
                  className="w-20 bg-[#071020] border border-[#2a1a4a] focus:border-[#a78bfa] text-white px-2 py-1.5 rounded text-sm outline-none text-center
                    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#64748b] text-xs whitespace-nowrap">මිල (රු.):</span>
                <input type="number" min={0} step="0.01" value={editingRow.amount}
                  onChange={e => setEditingRow(prev => prev ? { ...prev, amount: Number(e.target.value) || 0 } : null)}
                  onFocus={e => e.target.select()}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveRow(); }}
                  className="w-28 bg-[#071020] border border-[#2a1a4a] focus:border-[#a78bfa] text-[#22c55e] font-semibold px-2 py-1.5 rounded text-sm outline-none text-right
                    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              {Number(editingRow.qty) > 0 && Number(editingRow.amount) > 0 && (
                <span className="text-[#22c55e] text-sm font-bold">
                  = රු. {(Number(editingRow.qty) * Number(editingRow.amount)).toFixed(2)}
                </span>
              )}
              <button onClick={handleSaveRow}
                disabled={savingRow || !editingRow.description.trim() || !sessionId}
                className="px-4 py-1.5 bg-[#0d3a1e] hover:bg-[#1a5a2e] disabled:opacity-40 text-[#22c55e] rounded text-sm font-semibold transition-colors">
                {savingRow ? '...' : '✓ සුරකින්න'}
              </button>
              <button onClick={() => setEditingRow(null)}
                className="px-3 py-1.5 bg-[#1e1a3a] hover:bg-[#2a2456] text-[#a78bfa] rounded text-sm transition-colors">
                අවලංගු
              </button>
            </div>
          ) : (
            <button onClick={startNewRow}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a1030] hover:bg-[#2a1a4a] border border-dashed border-[#3a2a5a] hover:border-[#a78bfa] text-[#a78bfa] rounded-lg text-sm transition-all">
              ＋ නව පේළියක් එකතු කරන්න
            </button>
          )}
        </div>
      )}

      {/* ── FOOTER ── */}
      <div className="bg-[#071020] border-t-2 border-[#1e3a5f] px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2 flex-wrap">
            {!sessionExists ? (
              <button onClick={onSave} disabled={isSaving}
                className="px-5 py-2 bg-[#1e4a7a] hover:bg-[#2a5f9a] text-white text-sm font-bold rounded border border-[#2a5f9a] transition-all disabled:opacity-50 uppercase tracking-wider">
                {isSaving ? 'සුරකිමින්...' : '💾 සුරකින්න'}
              </button>
            ) : (
              <button onClick={onUpdate} disabled={isSaving}
                className="px-5 py-2 bg-[#4a3000] hover:bg-[#6a4500] text-[#fbbf24] text-sm font-bold rounded border border-[#6a4500] transition-all disabled:opacity-50 uppercase tracking-wider">
                {isSaving ? 'යාවත්කාලීන...' : '✏️ යාවත්කාලීන'}
              </button>
            )}
            <button onClick={onGetBill}
              className="px-5 py-2 bg-[#0d3a1e] hover:bg-[#1a5a2e] text-[#22c55e] text-sm font-bold rounded border border-[#1a5a2e] transition-all uppercase tracking-wider">
              🧾 බිල
            </button>
            <button onClick={onSummary}
              className="px-5 py-2 bg-[#1e1a3a] hover:bg-[#2a2456] text-[#a78bfa] text-sm font-bold rounded border border-[#2a2456] transition-all uppercase tracking-wider">
              📊 සාරාංශය
            </button>
            <button onClick={() => setShowBillRows(p => !p)}
              className={`px-5 py-2 text-sm font-bold rounded border transition-all uppercase tracking-wider ${
                showBillRows
                  ? 'bg-[#1a1030] border-[#a78bfa] text-[#a78bfa]'
                  : 'bg-[#0d0a1e] border-[#2a2456] text-[#64748b] hover:text-[#a78bfa] hover:border-[#a78bfa]'
              }`}>
              {billRows.length > 0 ? `➕✓ අතිරේක (${billRows.length})` : '➕ අතිරේක'}
            </button>
          </div>

          <div className="flex items-end gap-5 text-right">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#4a9eff] mb-0.5">මුළු පිරිවැය</div>
              <div className="text-lg font-bold text-[#fbbf24] font-mono">රු. {grandTotalCost.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#4a9eff] mb-0.5">මුළු විකිණුම</div>
              <div className="text-lg font-bold text-[#22c55e] font-mono">රු. {grandTotalSelling.toFixed(2)}</div>
            </div>
            {billRowsTotal !== 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#4a9eff] mb-0.5">අතිරේක</div>
                <div className="text-lg font-bold text-[#a78bfa] font-mono">රු. {billRowsTotal.toFixed(2)}</div>
              </div>
            )}
            <div className="border-l border-[#1e3a5f] pl-5">
              <div className="text-[10px] uppercase tracking-widest text-[#4a9eff] mb-0.5">අවසාන ශේෂය</div>
              <div className={`text-2xl font-bold font-mono ${finalBalance >= 0 ? 'text-[#38bdf8]' : 'text-[#ef4444]'}`}>
                රු. {finalBalance.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}