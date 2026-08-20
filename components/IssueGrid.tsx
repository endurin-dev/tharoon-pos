// ─────────────────────────────────────────────────────────────────────────────
// IssueGrid.tsx  –  FIXED + RESTYLED EXTRA CHARGES + SOURCE SELECTOR
//
// PREVIOUS FIXES:
//  1. Split single `amountRef` into `addAmountRef` + `editAmountRef` so the
//     add-row and edit-row inputs never fight over the same ref.
//  2. All Tab/Enter handlers in add-row now point to `addAmountRef`.
//  3. All Tab/Enter handlers in edit-row now point to `editAmountRef`.
//  4. Add-button disabled guard uses `newRow.amount === ''` instead of
//     relying on a falsy check so "0" doesn't accidentally enable it wrong.
//  5. Extra charges section uses a distinct amber/dark-amber theme so it
//     visually separates from the navy grid above it.
//
//  6. Extra charges no longer blindly sum/min into the final balance.
//     A radio toggle — "විකුනුම් මුදලින්" (from sale total) vs
//     "කොමිස් මුදලින්" (from commission/profit total, DEFAULT) — controls
//     which total the extras are deducted from. The actual math lives in
//     page.tsx (finalBalance); this component only renders the selector
//     and reports the choice up via onExtraSourceChange.
//  7. Selector is placed directly above the "add extra charge" row so it's
//     obvious which total a new extra will affect.
//
//  8. Sale-total adjustment is now a plain signed ADDITION: adjustedSell =
//     grandTotalSelling + billRowsTotal. A positive extra amount increases
//     the sale total; a negative extra amount decreases it (adding a
//     negative number already subtracts its magnitude, so no separate
//     "minus" branch is needed). This replaces the earlier subtraction-based
//     formula, which had the sign backwards. Must mirror BillModal.tsx's
//     adjustedSell exactly.
//
// LATEST FIX (matches BillModal.tsx):
//  9. `finalBalance` shown in the footer (අවසාන ශේෂය) is a PROP passed down
//     from page.tsx — this component does not compute it. To keep the
//     receipt (BillModal) and this on-screen footer in agreement, page.tsx
//     MUST compute finalBalance as the raw `grandTotalSelling - grandTotalCost`,
//     ignoring billRowsTotal / extraSource entirely — extras must never move
//     this number, only the "මුළු පිරිවැය" / "මුළු විකිණුම" boxes below should
//     show the adjusted figures. See the marked block near the footer JSX.
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { CategoryWithItems, Employee, Vehicle, BillRow } from '@/lib/types';

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
  onCategoryChange: (catId: number, itemId: number, field: 'morning_qty' | 'morning_returned_qty' | 'evening_qty' | 'returned_qty', val: number) => void;
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
  onSaveBillRow: (row: BillRow, overrideSessionId?: number) => Promise<void>;
  onDeleteBillRow: (id: number) => Promise<void>;
  /** Called when no session exists yet; must save and return the new session_id */
  onAutoSave: () => Promise<number | null>;
  /** NEW: which total extra charges are deducted from */
  extraSource: 'sale' | 'commission';
  onExtraSourceChange: (s: 'sale' | 'commission') => void;
}

const COLS     = '160px 140px 80px 80px 80px 80px 90px 90px 90px 90px';
const COLS_MRN = '160px 140px 80px 80px 80px 80px 90px 90px 90px 90px';

// ── Blank add-row state ───────────────────────────────────────────────────────
const BLANK = { description: '', amount: '' as string | number };

export default function IssueGrid({
  categories, employees, vehicles, sessionType, selectedDate, selectedEmployee,
  selectedVehicle, onSessionTypeChange, onDateChange, onEmployeeChange, onVehicleChange,
  onCategoryChange, onSave, onUpdate, onGetBill, onSummary, isSaving,
  paymentStatus, onPaymentStatusChange, sessionExists, sessionId,
  finalBalance, grandTotalCost, grandTotalSelling,
  billRows, billRowsTotal, onSaveBillRow, onDeleteBillRow, onAutoSave,
  extraSource, onExtraSourceChange,
}: IssueGridProps) {

  // ── grid keyboard nav ───────────────────────────────────────────────────────
  const inputRefs  = useRef<Map<string, HTMLInputElement>>(new Map());
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const inputOrder = useRef<string[]>([]);

  useEffect(() => {
    const keys: string[] = [];
    for (const cat of categories) {
      for (const item of cat.items) {
        keys.push(`${item.id}-morning`);
        keys.push(`${item.id}-morning-returned`);
        if (sessionType === 'full_day') keys.push(`${item.id}-evening`);
        keys.push(`${item.id}-returned`);
      }
    }
    inputOrder.current = keys;
  }, [categories, sessionType]);

  const registerRef = useCallback((key: string, el: HTMLInputElement | null) => {
    if (el) inputRefs.current.set(key, el); else inputRefs.current.delete(key);
  }, []);

  const focusKey2 = useCallback((key: string) => {
    const el = inputRefs.current.get(key);
    if (el) { el.focus(); el.select(); setFocusKey(key); }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, currentKey: string) => {
    const order = inputOrder.current;
    const idx   = order.indexOf(currentKey);
    const parts = currentKey.split('-');
    const colSuffix = parts.length === 3 ? 'morning-returned' : parts[1];

    const sameFieldKeys = order.filter(k => {
      const kp = k.split('-');
      return kp.length === 3 ? colSuffix === 'morning-returned' : kp[1] === colSuffix && kp.length === 2;
    });
    const fieldIdx = sameFieldKeys.indexOf(currentKey);

    if (e.key === 'Enter') {
      e.preventDefault();
      const nextKey = sameFieldKeys[fieldIdx + 1];
      if (nextKey) { focusKey2(nextKey); return; }
      const nextInOrder = order[idx + 1];
      if (nextInOrder) {
        const np = nextInOrder.split('-');
        const nextCol = np.length === 3 ? 'morning-returned' : np[1];
        const nextColKeys = order.filter(k => {
          const kp = k.split('-');
          return kp.length === 3 ? nextCol === 'morning-returned' : kp[1] === nextCol && kp.length === 2;
        });
        if (nextColKeys.length > 0) focusKey2(nextColKeys[0]);
      }
    } else if (e.key === 'Tab')        { e.preventDefault(); const n = order[idx + 1]; if (n) focusKey2(n); }
    else if (e.key === 'ArrowDown')    { e.preventDefault(); const n = sameFieldKeys[fieldIdx + 1]; if (n) focusKey2(n); }
    else if (e.key === 'ArrowUp')      { e.preventDefault(); const n = sameFieldKeys[fieldIdx - 1]; if (n) focusKey2(n); }
    else if (e.key === 'ArrowRight')   { e.preventDefault(); const n = order[idx + 1]; if (n) focusKey2(n); }
    else if (e.key === 'ArrowLeft')    { e.preventDefault(); const n = order[idx - 1]; if (n) focusKey2(n); }
  }, [focusKey2]);

  // ── add-row state ───────────────────────────────────────────────────────────
  const [showExtra,  setShowExtra]  = useState(false);
  const [newRow,     setNewRow]     = useState(BLANK);
  const [saving,     setSaving]     = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [editRow,    setEditRow]    = useState<BillRow | null>(null);

  // ── two separate refs, one per input context ──────────────────────────────
  const descRef       = useRef<HTMLInputElement>(null);
  const addAmountRef  = useRef<HTMLInputElement>(null);   // add-row amount
  const editAmountRef = useRef<HTMLInputElement>(null);   // edit-row amount

  const resetNew = () => { setNewRow(BLANK); descRef.current?.focus(); };

  const handleAddRow = async () => {
    if (!newRow.description.trim() || newRow.amount === '' || Number(newRow.amount) === 0) return;

    let sid = sessionId;

    // No session yet → auto-save silently first
    if (!sid) {
      setAutoSaving(true);
      sid = await onAutoSave();
      setAutoSaving(false);
      if (!sid) return; // save failed — onAutoSave shows its own toast
    }

    setSaving(true);
    await onSaveBillRow({
      description: newRow.description.trim(),
      qty: 1,
      amount: Number(newRow.amount),
      sort_order: billRows.length,
    }, sid);
    setSaving(false);
    resetNew();
  };

  const handleUpdateRow = async () => {
    if (!editRow || !editRow.description.trim()) return;
    setSaving(true);
    await onSaveBillRow({ ...editRow, qty: 1 });
    setSaving(false);
    setEditRow(null);
  };

  const gridCols = sessionType === 'full_day' ? COLS : COLS_MRN;

  return (
    <div className="flex flex-col h-full bg-[#0a0f1e] text-white font-mono">

      {/* ── TOP CONTROLS ──────────────────────────────────────────────────── */}
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

      {/* ── GRID HEADER ───────────────────────────────────────────────────── */}
      <div className="bg-[#071020] border-b border-[#1e3a5f] sticky top-0 z-20">
        <div className="grid text-[10px] font-bold uppercase tracking-widest text-[#4a9eff]"
          style={{ gridTemplateColumns: gridCols }}>
          <div className="px-3 py-2 border-r border-[#1e3a5f]">වර්ගය</div>
          <div className="px-3 py-2 border-r border-[#1e3a5f]">භාණ්ඩය</div>
          <div className="px-2 py-2 border-r border-[#1e3a5f] text-center">උදේ ප්‍රමාණ</div>
          <div className="px-2 py-2 border-r border-[#1e3a5f] text-center text-[#f97316]">උදේ ආපසු</div>
          {sessionType === 'full_day' && (
            <div className="px-2 py-2 border-r border-[#1e3a5f] text-center">සවස ප්‍රමාණ</div>
          )}
          <div className="px-2 py-2 border-r border-[#1e3a5f] text-center text-[#f97316]">ආපසු</div>
          <div className="px-2 py-2 border-r border-[#1e3a5f] text-center">පිරිවැය</div>
          <div className="px-2 py-2 border-r border-[#1e3a5f] text-center">විකිණුම</div>
          <div className="px-2 py-2 border-r border-[#1e3a5f] text-center">මුළු පිරිවැය</div>
          <div className="px-2 py-2 text-center">මුළු විකිණුම</div>
        </div>
      </div>

      {/* ── GRID BODY ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {categories.map(cat => {
          let catCost = 0, catSell = 0;
          cat.items.forEach(item => {
            const sold = Math.max(0, (item.morning_qty - item.morning_returned_qty) + item.evening_qty - item.returned_qty);
            catCost += sold * item.effective_cost;
            catSell += sold * item.effective_selling;
          });
          return (
            <div key={cat.id} className="border-b border-[#1e3a5f]">
              {cat.items.map((item, idx) => {
                const sold      = Math.max(0, (item.morning_qty - item.morning_returned_qty) + item.evening_qty - item.returned_qty);
                const totalCost = sold * item.effective_cost;
                const totalSell = sold * item.effective_selling;
                const morningKey         = `${item.id}-morning`;
                const morningReturnedKey = `${item.id}-morning-returned`;
                const eveningKey         = `${item.id}-evening`;
                const returnedKey        = `${item.id}-returned`;
                return (
                  <div key={item.id}
                    className="grid border-b border-[#0d1629] hover:bg-[#0d1a30] transition-colors"
                    style={{ gridTemplateColumns: gridCols }}>
                    <div className={`px-3 py-1.5 border-r border-[#1e3a5f] flex items-center ${idx === 0 ? 'text-[#fbbf24] font-bold text-xs' : ''}`}>
                      {idx === 0 ? cat.name : ''}
                    </div>
                    <div className="px-3 py-1.5 border-r border-[#1e3a5f] text-[#c8d8f0] text-xs flex items-center">{item.name}</div>

                    {/* උදේ ප්‍රමාණ */}
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

                    {/* උදේ ආපසු */}
                    <div className="border-r border-[#1e3a5f] flex items-center justify-center p-0.5">
                      <input ref={el => registerRef(morningReturnedKey, el)} type="number" min={0}
                        value={item.morning_returned_qty || ''}
                        onChange={e => onCategoryChange(cat.id, item.id, 'morning_returned_qty', Number(e.target.value) || 0)}
                        onFocus={e => { e.target.select(); setFocusKey(morningReturnedKey); }}
                        onKeyDown={e => handleKeyDown(e, morningReturnedKey)}
                        className={`w-full h-full bg-transparent text-center text-sm outline-none border rounded px-1 py-0.5
                          ${focusKey === morningReturnedKey ? 'border-[#f97316] bg-[#1a0d00] text-orange-300' : 'border-transparent text-[#f97316] hover:border-[#7a3a1a]'}
                          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      />
                    </div>

                    {/* සවස ප්‍රමාණ */}
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

                    {/* ආපසු */}
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
                <div className="grid bg-[#071420] text-[10px]" style={{ gridTemplateColumns: gridCols }}>
                  <div className="px-3 py-1 text-right text-[#4a9eff] uppercase tracking-widest"
                    style={{ gridColumn: sessionType === 'full_day' ? '1 / 9' : '1 / 8' }}>
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

      {/* ══════════════════════════════════════════════════════════════════════
          ── EXTRA BILL ROWS  (collapsible, distinct amber theme) ──────────
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-[#1a0a0a] border-t-2 border-[#dc2626]">

        {/* ── Collapse / expand header bar ── */}
        <button
          onClick={() => setShowExtra(p => !p)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#220a0a] transition-colors group"
        >
          <div className="flex items-center gap-2">
            <span className={`text-[10px] transition-transform duration-200 text-[#fbbf24] ${showExtra ? 'rotate-90' : ''}`}>▶</span>
            <span className="text-[#f87171] text-[10px] uppercase tracking-widest font-bold">
              අතිරේක ගාස්තු
            </span>
            {billRows.length > 0 && (
              <span className="bg-[#7f1d1d] text-[#fca5a5] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {billRows.length}
              </span>
            )}
            {billRowsTotal !== 0 && (
              <span className="text-[#f87171] text-[10px] font-semibold">· රු. {billRowsTotal.toFixed(2)}</span>
            )}
            {billRowsTotal !== 0 && (
              <span className="text-[#7f9cbf] text-[10px]">
                ({extraSource === 'sale' ? 'විකිණුමෙන් අඩුවේ' : 'පිරිවැයට එකතුවේ'})
              </span>
            )}
          </div>
          {!sessionId && (
            <span className="text-[#991b1b] text-[10px]">(සුරැකීමේදී ස්වයංක්‍රීයව)</span>
          )}
        </button>

        {/* ── Collapsible body ── */}
        {showExtra && (
          <div className="px-4 pb-3 border-t border-[#7f1d1d]">

            {/* Existing rows table */}
            {billRows.length > 0 && (
              <div className="mt-2 mb-2 rounded border border-[#991b1b] overflow-hidden">
                <div className="grid grid-cols-[1fr_110px_64px] bg-[#0f0505] text-[#f87171] text-[10px] uppercase tracking-widest px-3 py-1.5 border-b border-[#7f1d1d] font-bold">
                  <span>විස්තරය</span>
                  <span className="text-right">මුදල (රු.)</span>
                  <span />
                </div>

                {billRows.map((row, i) => (
                  <div key={row.id ?? i}>
                    {editRow && editRow.id === row.id ? (
                      /* ── inline edit ── */
                      <div className="grid grid-cols-[1fr_110px_64px] gap-1.5 px-3 py-1.5 bg-[#220a0a] border-b border-[#7f1d1d] items-center">
                        <input
                          autoFocus
                          type="text"
                          value={editRow!.description}
                          onChange={e => setEditRow(r => r ? { ...r, description: e.target.value } : null)}
                          onKeyDown={e => {
                            if (e.key === 'Tab')    { e.preventDefault(); editAmountRef.current?.focus(); }
                            if (e.key === 'Enter')  { e.preventDefault(); editAmountRef.current?.focus(); }
                            if (e.key === 'Escape') setEditRow(null);
                          }}
                          className="bg-[#0f0900] border border-[#dc2626] text-[#fde68a] px-2 py-1 rounded text-xs outline-none"
                        />
                        {/* use editAmountRef here, NOT addAmountRef */}
                        <input
                          ref={editAmountRef}
                          type="number" min={0} step="0.01"
                          value={editRow!.amount}
                          onChange={e => setEditRow(r => r ? { ...r, amount: Number(e.target.value) || 0 } : null)}
                          onFocus={e => e.target.select()}
                          onKeyDown={e => {
                            if (e.key === 'Enter')  handleUpdateRow();
                            if (e.key === 'Escape') setEditRow(null);
                          }}
                          className="bg-[#0f0900] border border-[#dc2626] text-[#fbbf24] font-bold px-2 py-1 rounded text-xs outline-none text-right
                            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <div className="flex gap-1 justify-end">
                          <button onClick={handleUpdateRow} disabled={saving}
                            className="px-2 py-0.5 bg-[#0d3a1e] hover:bg-[#1a5a2e] text-[#22c55e] border border-[#1a5a2e] rounded text-[10px] transition-colors disabled:opacity-40">
                            {saving ? '…' : '✓'}
                          </button>
                          <button onClick={() => setEditRow(null)}
                            className="px-2 py-0.5 bg-[#3a1e00] hover:bg-[#5a3000] text-[#fbbf24] border border-[#7f1d1d] rounded text-[10px] transition-colors">
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── display row ── */
                      <div className={`grid grid-cols-[1fr_110px_64px] px-3 py-1.5 border-b border-[#2a0a0a] items-center group transition-colors
                        ${i % 2 === 0 ? 'bg-[#130505]' : 'bg-[#1a0a0a]'} hover:bg-[#260e0e]`}>
                        <span className="text-[#fca5a5] text-xs truncate">{row.description}</span>
                        <span className="text-right text-[#fbbf24] text-xs font-semibold">
                          රු. {Number(row.amount).toFixed(2)}
                        </span>
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditRow({ ...row })}
                            className="px-1.5 py-0.5 bg-[#3a2800] hover:bg-[#5a3e00] text-[#fbbf24] border border-[#7f1d1d] rounded text-[10px]">✎</button>
                          <button onClick={() => row.id && onDeleteBillRow(row.id)}
                            className="px-1.5 py-0.5 bg-[#3a1e1e] hover:bg-[#5a2a2a] text-[#ef4444] rounded text-[10px]">✕</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* sub-total */}
                {billRowsTotal !== 0 && (
                  <div className="grid grid-cols-[1fr_110px_64px] px-3 py-1.5 bg-[#0f0900] border-t border-[#7f1d1d]">
                    <span className="text-[#f87171] text-[10px] uppercase tracking-widest font-bold">එකතුව</span>
                    <span className="text-right text-[#f87171] text-xs font-bold">රු. {billRowsTotal.toFixed(2)}</span>
                    <span />
                  </div>
                )}
              </div>
            )}

            {/* ── NEW: source selector — placed right above the add-row form ── */}
            <div className="flex items-center gap-4 mb-2 px-1 py-1.5 bg-[#0f0505] border border-[#7f1d1d] rounded">
              <span className="text-[#f87171] text-[10px] uppercase tracking-widest font-bold whitespace-nowrap">
                අඩු කරන්නේ:
              </span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="extraSource"
                  checked={extraSource === 'commission'}
                  onChange={() => onExtraSourceChange('commission')}
                  className="accent-[#dc2626]"
                />
                <span className="text-[#fca5a5] text-xs">කොමිස් මුදලින්</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="extraSource"
                  checked={extraSource === 'sale'}
                  onChange={() => onExtraSourceChange('sale')}
                  className="accent-[#dc2626]"
                />
                <span className="text-[#fca5a5] text-xs">විකුනුම් මුදලින්</span>
              </label>
            </div>

            {/* ── Add row ── always enabled; auto-saves session if needed */}
            <div className="flex items-center gap-2 mt-1">
              <input
                ref={descRef}
                type="text"
                placeholder="විස්තරය..."
                value={newRow.description}
                onChange={e => setNewRow(r => ({ ...r, description: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Tab')   { e.preventDefault(); addAmountRef.current?.focus(); }
                  if (e.key === 'Enter') { e.preventDefault(); addAmountRef.current?.focus(); }
                }}
                className="flex-1 bg-[#0f0900] border border-[#7f1d1d] focus:border-[#dc2626] text-[#fde68a] px-3 py-1.5 rounded text-xs outline-none placeholder-[#5a1010] transition-colors"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[#f87171] text-[10px] whitespace-nowrap font-semibold">රු.</span>
                {/* use addAmountRef here, NOT editAmountRef */}
                <input
                  ref={addAmountRef}
                  type="number" step="0.01"
                  placeholder="0.00"
                  value={newRow.amount === '' ? '' : newRow.amount}
                  onChange={e => setNewRow(r => ({ ...r, amount: e.target.value }))}
                  onFocus={e => e.target.select()}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddRow(); }}
                  className="w-28 bg-[#0f0900] border border-[#7f1d1d] focus:border-[#dc2626] text-[#fbbf24] font-semibold px-2 py-1.5 rounded text-xs outline-none text-right placeholder-[#5a1010] transition-colors
                    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <button
                onClick={handleAddRow}
                disabled={saving || autoSaving || !newRow.description.trim() || newRow.amount === '' || Number(newRow.amount) === 0}
                className="px-3 py-1.5 bg-[#7f1d1d] hover:bg-[#991b1b] disabled:opacity-40 text-[#fbbf24] border border-[#991b1b] rounded text-xs font-bold transition-colors whitespace-nowrap min-w-[72px] text-center">
                {autoSaving ? '⏳ සුරකිමින්...' : saving ? '…' : '+ එකතු'}
              </button>
            </div>
          </div>
        )}
      </div>
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
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
          </div>

          {/*
            Extras are folded directly into ONE base total — never shown as
            a separate deduction from commission:
              extraSource === 'commission' (default) → extras ADD onto
                මුළු පිරිවැය (cost); මුළු විකිණුම stays as-is
              extraSource === 'sale' → extras are ADDED (signed) onto
                මුළු විකිණුම (selling); මුළු පිරිවැය stays as-is.
                A positive extra increases the sale total, a negative extra
                decreases it. Must mirror BillModal.tsx exactly.

            IMPORTANT — අවසාන ශේෂය (finalBalance) below is a PROP from
            page.tsx and is NOT recomputed here. page.tsx must compute it as
            the raw `grandTotalSelling - grandTotalCost`, ignoring
            billRowsTotal / extraSource, so this number never moves when
            extras are added or removed — only මුළු පිරිවැය / මුළු විකිණුම
            (below) reflect the adjustment. This keeps it consistent with
            BillModal.tsx's අවසාන කොමිස්.
          */}
          <div className="flex items-end gap-5 text-right">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#4a9eff] mb-0.5">
                මුළු පිරිවැය
                {extraSource === 'commission' && billRowsTotal !== 0 && (
                  <span className="text-[#f87171]"> (+අතිරේක)</span>
                )}
              </div>
              <div className="text-lg font-bold text-[#fbbf24] font-mono">
                රු. {(extraSource === 'commission' ? grandTotalCost + billRowsTotal : grandTotalCost).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#4a9eff] mb-0.5">
                මුළු විකිණුම
                {extraSource === 'sale' && billRowsTotal !== 0 && (
                  <span className="text-[#f87171]"> ({billRowsTotal > 0 ? '+' : '−'}අතිරේක)</span>
                )}
              </div>
              <div className="text-lg font-bold text-[#22c55e] font-mono">
                රු. {(extraSource === 'sale' ? grandTotalSelling + billRowsTotal : grandTotalSelling).toFixed(2)}
              </div>
            </div>
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