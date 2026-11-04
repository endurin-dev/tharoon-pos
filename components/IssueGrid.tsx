// ─────────────────────────────────────────────────────────────────────────────
// IssueGrid.tsx  –  FIXED + RESTYLED EXTRA CHARGES + SOURCE SELECTOR
//                   + NEGATIVE-SOLD SUPPORT (returns can exceed issues)
//                   + THICK DARK-RED CATEGORY DIVIDER
//
// PREVIOUS FIXES:
//  1. Split single `amountRef` into `addAmountRef` + `editAmountRef` so the
//     add-row and edit-row inputs never fight over the same ref.
//  2. All Tab/Enter handlers in add-row now point to `addAmountRef`.
//  3. All Tab/Enter handlers in edit-row now point to `editAmountRef`.
//  4. Add-button disabled guard uses `newRow.amount === ''` instead of
//     relying on a falsy check so "0" doesn't accidentally enable it wrong.
//  5. Extra charges section uses a distinct light rose theme so it
//     visually separates from the grid above it.
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
//  9. `finalBalance` shown in the footer (අවසාන ශේෂය) is a PROP passed down
//     from page.tsx — this component does not compute it. page.tsx computes
//     it as the raw `grandTotalSelling - grandTotalCost`, ignoring
//     billRowsTotal / extraSource, so it never moves when extras are added
//     or removed — only "මුළු පිරිවැය" / "මුළු විකිණුම" below reflect the
//     adjustment. Matches BillModal.tsx's අවසාන කොමිස්.
//
// REVERTED:
// 10. සේවකයා (employee) picker is back to a plain <select> — the searchable
//     English→Sinhala transliteration combobox has been removed.
//
// 11. `sold` is no longer clamped with Math.max(0, ...) — in both the
//     per-item calc and the category subtotal loop. Returned quantities can
//     legitimately exceed issued quantities (e.g. a return from a previous
//     day's stock), which should flow through as a NEGATIVE sold figure and
//     negative cost/selling totals, not get floored to zero and silently
//     dropped. page.tsx's grandTotalCost / grandTotalSelling must use the
//     same unclamped formula or the grid and the footer will disagree.
// 12. Display conditions that gated on `> 0` (per-item totals) now use
//     `!== 0` so negative figures actually render instead of being hidden.
//
// NEW:
// 13. Category divider is a SINGLE thick dark-red line. The category
//     wrapper owns the line; the last item row in each category has no
//     bottom border of its own, so the line never doubles up.
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { CategoryWithItems, BillRow } from '@/lib/types';

interface IssueGridProps {
  categories: CategoryWithItems[];
  sessionType: 'morning' | 'full_day';
  onCategoryChange: (catId: number, itemId: number, field: 'morning_qty' | 'morning_returned_qty' | 'evening_qty' | 'returned_qty', val: number) => void;
  onSave: () => void;
  onUpdate: () => void;
  onGetBill: () => void;
  onSummary: () => void;
  isSaving: boolean;
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
  /** which total extra charges are deducted from */
  extraSource: 'sale' | 'commission';
  onExtraSourceChange: (s: 'sale' | 'commission') => void;
}

const COLS     = '160px 140px 80px 80px 80px 80px 90px 90px 90px 90px 145px';
const COLS_MRN = '160px 140px 80px 80px 80px 90px 90px 90px 90px 145px';

// ── Blank add-row state ───────────────────────────────────────────────────────
const BLANK = { description: '', amount: '' as string | number };

export default function IssueGrid({
  categories, sessionType,
  onCategoryChange, onSave, onUpdate, onGetBill, onSummary, isSaving,
  sessionExists, sessionId,
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
  const commissionChargePending = useRef(false);

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

  const handleCommissionSourceChange = async () => {
    onExtraSourceChange('commission');

    const chargeExists = billRows.some(
      row => row.description === 'අමතර ගාස්තු' && Number(row.qty) === 1 && Number(row.amount) === 100,
    );
    if (chargeExists || commissionChargePending.current) return;

    commissionChargePending.current = true;
    try {
      let sid = sessionId;

      if (!sid) {
        setAutoSaving(true);
        sid = await onAutoSave();
        if (!sid) return;
      }

      setSaving(true);
      await onSaveBillRow({
        description: 'අමතර ගාස්තු',
        qty: 1,
        amount: 100,
        sort_order: billRows.length,
      }, sid);
    } finally {
      commissionChargePending.current = false;
      setAutoSaving(false);
      setSaving(false);
    }
  };

  const handleUpdateRow = async () => {
    if (!editRow || !editRow.description.trim()) return;
    setSaving(true);
    await onSaveBillRow({ ...editRow, qty: 1 });
    setSaving(false);
    setEditRow(null);
  };

  const gridCols = sessionType === 'full_day' ? COLS : COLS_MRN;
  const quantityTotals = categories.reduce((totals, category) => {
    category.items.forEach(item => {
      totals.morning += item.morning_qty;
      totals.morningReturned += item.morning_returned_qty;
      totals.evening += item.evening_qty;
      totals.returned += item.returned_qty;
      totals.qts += (item.morning_qty - item.morning_returned_qty) + item.evening_qty - item.returned_qty;
      totals.morningCost += item.morning_qty * item.effective_cost;
      totals.morningReturnedCost -= item.morning_returned_qty * item.effective_cost;
      totals.eveningCost += item.evening_qty * item.effective_cost;
      totals.returnedCost -= item.returned_qty * item.effective_cost;
      totals.morningSelling += item.morning_qty * item.effective_selling;
      totals.morningReturnedSelling -= item.morning_returned_qty * item.effective_selling;
      totals.eveningSelling += item.evening_qty * item.effective_selling;
      totals.returnedSelling -= item.returned_qty * item.effective_selling;
    });
    return totals;
  }, {
    morning: 0, morningReturned: 0, evening: 0, returned: 0, qts: 0,
    morningCost: 0, morningReturnedCost: 0, eveningCost: 0, returnedCost: 0,
    morningSelling: 0, morningReturnedSelling: 0, eveningSelling: 0, returnedSelling: 0,
  });

  return (
    <div className="issue-theme flex flex-col h-full min-h-0 bg-[#f8fafc] text-[#1e293b] font-mono">

      {/* ── GRID HEADER ───────────────────────────────────────────────────── */}
      <div className="bg-[#e2e8f0] border-y border-[#cbd5e1] sticky top-0 z-20">
        <div className="grid text-[9px] leading-tight font-bold uppercase tracking-wide text-[#1d4ed8]"
          style={{ gridTemplateColumns: gridCols }}>
          <div className="px-2 py-1 border-r border-[#cbd5e1]">වර්ගය</div>
          <div className="px-2 py-1 border-r border-[#cbd5e1]">භාණ්ඩය</div>
          <div className="px-1 py-1 border-r border-[#cbd5e1] text-center">උදේ ප්‍රමාණ</div>
          <div className="px-1 py-1 border-r border-[#cbd5e1] text-center text-[#c2410c]">උදේ ආපසු</div>
          {sessionType === 'full_day' && (
            <div className="px-1 py-1 border-r border-[#cbd5e1] text-center">සවස ප්‍රමාණ</div>
          )}
          <div className="px-1 py-1 border-r border-[#cbd5e1] text-center text-[#c2410c]">සවස ආපසු</div>
          <div className="px-1 py-1 border-r border-[#cbd5e1] text-center">පිරිවැය</div>
          <div className="px-1 py-1 border-r border-[#cbd5e1] text-center">විකිණුම</div>
          <div className="px-1 py-1 border-r border-[#cbd5e1] text-center">මුළු පිරිවැය</div>
          <div className="px-1 py-1 border-r border-[#cbd5e1] text-center">මුළු විකිණුම</div>
          <div className="px-1 py-1 text-center" title="පිරිවැය / විකිණුම">උප එකතුව</div>
        </div>
      </div>

      {/* ── GRID BODY ─────────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {categories.map(cat => {
          let catCost = 0, catSell = 0;
          cat.items.forEach(item => {
            // no Math.max clamp — returns can exceed issues, producing a
            // negative "sold" figure that should flow through as-is
            const sold = (item.morning_qty - item.morning_returned_qty) + item.evening_qty - item.returned_qty;
            catCost += sold * item.effective_cost;
            catSell += sold * item.effective_selling;
          });
          return (
            // ── CATEGORY BLOCK: one thick dark-red line under the whole category
            <div key={cat.id} className="border-b-4 border-[#7f1d1d]">
              {cat.items.map((item, idx) => {
                // no Math.max clamp — see note above
                const sold      = (item.morning_qty - item.morning_returned_qty) + item.evening_qty - item.returned_qty;
                const totalCost = sold * item.effective_cost;
                const totalSell = sold * item.effective_selling;
                const isLast    = idx === cat.items.length - 1;
                const morningKey         = `${item.id}-morning`;
                const morningReturnedKey = `${item.id}-morning-returned`;
                const eveningKey         = `${item.id}-evening`;
                const returnedKey        = `${item.id}-returned`;
                return (
                  <div key={item.id}
                    // last row has no border of its own — the category
                    // wrapper draws the single divider line instead
                    className={`grid hover:bg-[#f8fafc] transition-colors ${isLast ? '' : 'border-b border-[#cbd5e1]'}`}
                    style={{ gridTemplateColumns: gridCols }}>
                    <div className={`px-2 py-0 border-r border-[#cbd5e1] flex items-center ${idx === 0 ? 'text-[#b45309] font-bold text-xs' : ''}`}>
                      {idx === 0 ? cat.name : ''}
                    </div>
                    <div className="px-2 py-0 border-r border-[#cbd5e1] text-[#1e293b] text-xs flex items-center">{item.name}</div>

                    {/* උදේ ප්‍රමාණ */}
                    <div className="border-r border-[#cbd5e1] flex items-center justify-center leading-none p-0">
                      <input ref={el => registerRef(morningKey, el)} type="number" min={0}
                        value={item.morning_qty || ''}
                        onChange={e => onCategoryChange(cat.id, item.id, 'morning_qty', Number(e.target.value) || 0)}
                        onFocus={e => { e.target.select(); setFocusKey(morningKey); }}
                        onKeyDown={e => handleKeyDown(e, morningKey)}
                        className={`w-full h-4 bg-transparent text-center text-sm font-bold leading-none outline-none border rounded px-1 py-0
                          ${focusKey === morningKey ? 'border-[#2563eb] bg-[#eff6ff] text-slate-900' : 'border-transparent text-[#2563eb] hover:border-[#cbd5e1]'}
                          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      />
                    </div>

                    {/* උදේ ආපසු */}
                    <div className="border-r border-[#cbd5e1] flex items-center justify-center leading-none p-0">
                      <input ref={el => registerRef(morningReturnedKey, el)} type="number" min={0}
                        value={item.morning_returned_qty || ''}
                        onChange={e => onCategoryChange(cat.id, item.id, 'morning_returned_qty', Number(e.target.value) || 0)}
                        onFocus={e => { e.target.select(); setFocusKey(morningReturnedKey); }}
                        onKeyDown={e => handleKeyDown(e, morningReturnedKey)}
                        className={`w-full h-4 bg-transparent text-center text-sm font-bold leading-none outline-none border rounded px-1 py-0
                          ${focusKey === morningReturnedKey ? 'border-[#f97316] bg-[#fff7ed] text-orange-700' : 'border-transparent text-[#f97316] hover:border-[#fed7aa]'}
                          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      />
                    </div>

                    {/* සවස ප්‍රමාණ */}
                    {sessionType === 'full_day' && (
                      <div className="border-r border-[#cbd5e1] flex items-center justify-center leading-none p-0">
                        <input ref={el => registerRef(eveningKey, el)} type="number" min={0}
                          value={item.evening_qty || ''}
                          onChange={e => onCategoryChange(cat.id, item.id, 'evening_qty', Number(e.target.value) || 0)}
                          onFocus={e => { e.target.select(); setFocusKey(eveningKey); }}
                          onKeyDown={e => handleKeyDown(e, eveningKey)}
                          className={`w-full h-4 bg-transparent text-center text-sm font-bold leading-none outline-none border rounded px-1 py-0
                            ${focusKey === eveningKey ? 'border-[#2563eb] bg-[#eff6ff] text-slate-900' : 'border-transparent text-[#2563eb] hover:border-[#cbd5e1]'}
                            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                        />
                      </div>
                    )}

                    {/* ආපසු */}
                    <div className="border-r border-[#cbd5e1] flex items-center justify-center leading-none p-0">
                      <input ref={el => registerRef(returnedKey, el)} type="number" min={0}
                        value={item.returned_qty || ''}
                        onChange={e => onCategoryChange(cat.id, item.id, 'returned_qty', Number(e.target.value) || 0)}
                        onFocus={e => { e.target.select(); setFocusKey(returnedKey); }}
                        onKeyDown={e => handleKeyDown(e, returnedKey)}
                        className={`w-full h-4 bg-transparent text-center text-sm font-bold leading-none outline-none border rounded px-1 py-0
                          ${focusKey === returnedKey ? 'border-[#f97316] bg-[#fff7ed] text-orange-700' : 'border-transparent text-[#f97316] hover:border-[#fed7aa]'}
                          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      />
                    </div>

                    <div className="border-r border-[#cbd5e1] flex items-center justify-end px-2 text-sm leading-none font-semibold text-[#64748b]">
                      {item.effective_cost > 0 ? item.effective_cost.toFixed(2) : '-'}
                    </div>
                    <div className="border-r border-[#cbd5e1] flex items-center justify-end px-2 text-sm leading-none font-semibold text-[#64748b]">
                      {item.effective_selling > 0 ? item.effective_selling.toFixed(2) : '-'}
                    </div>
                    <div className={`border-r border-[#cbd5e1] flex items-center justify-end px-2 text-sm leading-none font-bold ${totalCost < 0 ? 'text-[#dc2626]' : 'text-[#b45309]'}`}>
                      {totalCost !== 0 ? totalCost.toFixed(2) : '-'}
                    </div>
                    <div className={`flex items-center justify-end px-2 text-sm leading-none font-bold ${totalSell < 0 ? 'text-[#dc2626]' : 'text-[#15803d]'}`}>
                      {totalSell !== 0 ? totalSell.toFixed(2) : '-'}
                    </div>
                    <div
                      className="flex items-center justify-center gap-1 border-l border-[#cbd5e1] px-1 text-[10px] font-bold leading-none whitespace-nowrap"
                      title={`${cat.name} උප එකතුව — පිරිවැය / විකිණුම`}
                      aria-label={idx === 0 ? `${cat.name} උප එකතුව: පිරිවැය ${catCost.toFixed(2)}, විකිණුම ${catSell.toFixed(2)}` : undefined}
                    >
                      {idx === 0 && (
                        <>
                          <span className={catCost < 0 ? 'text-[#dc2626]' : 'text-[#b45309]'}>{catCost.toFixed(2)}</span>
                          <span className="text-[#94a3b8]">/</span>
                          <span className={catSell < 0 ? 'text-[#dc2626]' : 'text-[#15803d]'}>{catSell.toFixed(2)}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        <div
          className="grid items-stretch border-t-2 border-[#1e293b] bg-[#dbeafe] text-lg font-extrabold"
          style={{ gridTemplateColumns: gridCols }}
          aria-label="මුළු ප්‍රමාණ සහ එකතු"
        >
          <div className="col-span-2 flex items-center border-r border-[#94a3b8] px-2 py-2 text-[#1e293b]">
            එකතුව
          </div>
          <div className="flex flex-col items-center justify-center border-r border-[#94a3b8] px-1 py-1 text-2xl font-black text-black">
            <span className="text-[10px] leading-tight text-center">උදේ ප්‍රමාණ</span>
            <span>{quantityTotals.morning}</span>
          </div>
          <div className="flex flex-col items-center justify-center border-r border-[#94a3b8] px-1 py-1 text-2xl font-black text-[#c2410c]">
            <span className="text-[10px] leading-tight text-center">උදේ ආපසු</span>
            <span>{quantityTotals.morningReturned}</span>
          </div>
          {sessionType === 'full_day' && (
            <div className="flex flex-col items-center justify-center border-r border-[#94a3b8] px-1 py-1 text-2xl font-black text-black">
              <span className="text-[10px] leading-tight text-center">සවස ප්‍රමාණ</span>
              <span>{quantityTotals.evening}</span>
            </div>
          )}
          <div className="flex flex-col items-center justify-center border-r border-[#94a3b8] px-1 py-1 text-2xl font-black text-[#c2410c]">
            <span className="text-[10px] leading-tight text-center">සවස ආපසු</span>
            <span>{quantityTotals.returned}</span>
          </div>
          <div className="border-r border-[#94a3b8]" />
          <div className="border-r border-[#94a3b8]" />
          <div className="flex items-center justify-end border-r border-[#94a3b8] px-2 py-2 text-[#b45309]">
            {grandTotalCost.toFixed(2)}
          </div>
          <div className="flex items-center justify-end border-r border-[#94a3b8] px-2 py-2 text-[#15803d]">
            {grandTotalSelling.toFixed(2)}
          </div>
          <div
            className="flex items-center justify-center gap-1 px-1 py-2 text-sm whitespace-nowrap"
            title="මුළු පිරිවැය / මුළු විකිණුම"
          >
            <span className="text-[#b45309]">{grandTotalCost.toFixed(2)}</span>
            <span className="text-[#64748b]">/</span>
            <span className="text-[#15803d]">{grandTotalSelling.toFixed(2)}</span>
          </div>
        </div>
        <div
          className="grid items-center border-t border-[#94a3b8] bg-white text-lg font-bold"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div className="col-span-2 px-2 py-1 text-[#b45309]">කොමිස් මුදලට</div>
          <div className="border-r border-[#cbd5e1] px-1 py-1 text-center text-[#b45309]">{quantityTotals.morningCost.toFixed(2)}</div>
          <div className="border-r border-[#cbd5e1] px-1 py-1 text-center text-[#b45309]">{Math.abs(quantityTotals.morningReturnedCost).toFixed(2)}</div>
          {sessionType === 'full_day' && (
            <div className="border-r border-[#cbd5e1] px-1 py-1 text-center text-[#b45309]">{quantityTotals.eveningCost.toFixed(2)}</div>
          )}
          <div className="border-r border-[#cbd5e1] px-1 py-1 text-center text-[#b45309]">{Math.abs(quantityTotals.returnedCost).toFixed(2)}</div>
          <div className="border-r border-[#cbd5e1]" />
          <div className="border-r border-[#cbd5e1]" />
          <div className="border-r border-[#cbd5e1]" />
          <div className="border-r border-[#cbd5e1]" />
          <div />
        </div>
        <div
          className="grid items-center border-t border-[#94a3b8] bg-white text-lg font-bold"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div className="col-span-2 px-2 py-1 text-[#15803d]">විකුණුම් මුදලට</div>
          <div className="border-r border-[#cbd5e1] px-1 py-1 text-center text-[#15803d]">{quantityTotals.morningSelling.toFixed(2)}</div>
          <div className="border-r border-[#cbd5e1] px-1 py-1 text-center text-[#15803d]">{Math.abs(quantityTotals.morningReturnedSelling).toFixed(2)}</div>
          {sessionType === 'full_day' && (
            <div className="border-r border-[#cbd5e1] px-1 py-1 text-center text-[#15803d]">{quantityTotals.eveningSelling.toFixed(2)}</div>
          )}
          <div className="border-r border-[#cbd5e1] px-1 py-1 text-center text-[#15803d]">{Math.abs(quantityTotals.returnedSelling).toFixed(2)}</div>
          <div className="border-r border-[#cbd5e1]" />
          <div className="border-r border-[#cbd5e1]" />
          <div className="border-r border-[#cbd5e1]" />
          <div className="border-r border-[#cbd5e1]" />
          <div />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ── EXTRA BILL ROWS  (collapsible, distinct slate theme) ──────────
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-[#f1f5f9] border-2 border-black rounded-md shadow-sm overflow-hidden">

        {/* ── Collapse / expand header bar ── */}
        <button
          onClick={() => setShowExtra(p => !p)}
          className="w-full flex items-center justify-between px-4 py-1.5 bg-black hover:bg-[#1f2937] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white transition-colors group"
        >
          <div className="flex items-center gap-2">
            <span className={`text-xs transition-transform duration-200 text-white ${showExtra ? 'rotate-90' : ''}`}>▶</span>
            <span className="text-white text-sm uppercase tracking-widest font-extrabold">
              අතිරේක ගාස්තු
            </span>
            {billRows.length > 0 && (
              <span className="bg-white text-black border border-white text-xs font-extrabold px-2 py-0.5 rounded-full">
                {billRows.length}
              </span>
            )}
            {billRowsTotal !== 0 && (
              <span className="text-white text-xs font-bold">· රු. {billRowsTotal.toFixed(2)}</span>
            )}
            {billRowsTotal !== 0 && (
              <span className="text-white/80 text-[10px]">
                ({extraSource === 'sale' ? 'විකිණුමෙන් අඩුවේ' : 'පිරිවැයට එකතුවේ'})
              </span>
            )}
          </div>
          {!sessionId && (
            <span className="text-white text-[10px] font-semibold">(සුරැකීමේදී ස්වයංක්‍රීයව)</span>
          )}
        </button>

        {/* ── Collapsible body ── */}
        {showExtra && (
          <div className="px-4 pb-3 border-t-2 border-black">

            {/* Existing rows table */}
            {billRows.length > 0 && (
              <div className="mt-2 mb-2 rounded border border-[#cbd5e1] overflow-hidden">
                <div className="grid grid-cols-[1fr_110px_64px] bg-[#e2e8f0] text-[#475569] text-[10px] uppercase tracking-widest px-3 py-1.5 border-b border-[#cbd5e1] font-bold">
                  <span>විස්තරය</span>
                  <span className="text-right">මුදල (රු.)</span>
                  <span />
                </div>

                {billRows.map((row, i) => (
                  <div key={row.id ?? i}>
                    {editRow && editRow.id === row.id ? (
                      /* ── inline edit ── */
                      <div className="grid grid-cols-[1fr_110px_64px] gap-1.5 px-3 py-1.5 bg-[#e2e8f0] border-b border-[#cbd5e1] items-center">
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
                          className="bg-[#ffffff] border border-[#94a3b8] focus:border-[#475569] text-[#334155] px-2 py-1 rounded text-xs outline-none"
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
                          className="bg-[#ffffff] border border-[#94a3b8] focus:border-[#475569] text-[#334155] font-bold px-2 py-1 rounded text-xs outline-none text-right
                            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <div className="flex gap-1 justify-end">
                          <button onClick={handleUpdateRow} disabled={saving}
                            className="px-2 py-0.5 bg-[#f0fdf4] hover:bg-[#bbf7d0] text-[#15803d] border border-[#bbf7d0] rounded text-[10px] transition-colors disabled:opacity-40">
                            {saving ? '…' : '✓'}
                          </button>
                          <button onClick={() => setEditRow(null)}
                            className="px-2 py-0.5 bg-[#f8fafc] hover:bg-[#e2e8f0] text-[#475569] border border-[#cbd5e1] rounded text-[10px] transition-colors">
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── display row ── */
                      <div className={`grid grid-cols-[1fr_110px_64px] px-3 py-1.5 border-b border-[#cbd5e1] items-center group transition-colors
                        ${i % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#f8fafc]'} hover:bg-[#e2e8f0]`}>
                        <span className="text-[#b91c1c] text-xs truncate">{row.description}</span>
                        <span className="text-right text-[#b45309] text-xs font-semibold">
                          රු. {Number(row.amount).toFixed(2)}
                        </span>
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditRow({ ...row })}
                            className="px-1.5 py-0.5 bg-[#ffedd5] hover:bg-[#fed7aa] text-[#b45309] border border-[#fecaca] rounded text-[10px]">✎</button>
                          <button onClick={() => row.id && onDeleteBillRow(row.id)}
                            className="px-1.5 py-0.5 bg-[#f8fafc] hover:bg-[#e2e8f0] text-[#dc2626] border border-[#cbd5e1] rounded text-[10px]">✕</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* sub-total */}
                {billRowsTotal !== 0 && (
                  <div className="grid grid-cols-[1fr_110px_64px] px-3 py-1.5 bg-[#e2e8f0] border-t border-[#cbd5e1]">
                    <span className="text-[#475569] text-[10px] uppercase tracking-widest font-bold">එකතුව</span>
                    <span className="text-right text-[#475569] text-xs font-bold">රු. {billRowsTotal.toFixed(2)}</span>
                    <span />
                  </div>
                )}
              </div>
            )}

            {/* ── source selector — placed right above the add-row form ── */}
            <div className="flex items-center gap-4 mb-2 px-2 py-1.5 bg-[#e2e8f0] border-2 border-black rounded">
              <span className="text-black text-xs uppercase tracking-widest font-extrabold whitespace-nowrap">
                අඩු කරන්නේ:
              </span>
              <label className="flex items-center gap-1 cursor-pointer bg-white border-2 border-black rounded px-2 py-1">
                <input
                  type="radio"
                  name="extraSource"
                  checked={extraSource === 'commission'}
                  onChange={handleCommissionSourceChange}
                  className="accent-black"
                />
                <span className="text-black text-xs font-semibold">කොමිස් මුදලින්</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer bg-white border-2 border-black rounded px-2 py-1">
                <input
                  type="radio"
                  name="extraSource"
                  checked={extraSource === 'sale'}
                  onChange={() => onExtraSourceChange('sale')}
                  className="accent-black"
                />
                <span className="text-black text-xs font-semibold">විකුනුම් මුදලින්</span>
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
                className="flex-1 bg-[#ffffff] border-2 border-black focus:border-black text-black px-3 py-1.5 rounded text-xs outline-none placeholder-[#64748b] transition-colors"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-black text-[10px] whitespace-nowrap font-bold">රු.</span>
                {/* use addAmountRef here, NOT editAmountRef */}
                <input
                  ref={addAmountRef}
                  type="number" step="0.01"
                  placeholder="0.00"
                  value={newRow.amount === '' ? '' : newRow.amount}
                  onChange={e => setNewRow(r => ({ ...r, amount: e.target.value }))}
                  onFocus={e => e.target.select()}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddRow(); }}
                  className="w-28 bg-[#ffffff] border-2 border-black focus:border-black text-black font-bold px-2 py-1.5 rounded text-xs outline-none text-right placeholder-[#64748b] transition-colors
                    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <button
                onClick={handleAddRow}
                disabled={saving || autoSaving || !newRow.description.trim() || newRow.amount === '' || Number(newRow.amount) === 0}
                className="px-3 py-1.5 bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-40 text-white border border-[#dc2626] rounded text-xs font-bold transition-colors whitespace-nowrap min-w-[72px] text-center">
                {autoSaving ? '⏳ සුරකිමින්...' : saving ? '…' : '+ එකතු'}
              </button>
            </div>
          </div>
        )}
      </div>
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <div className="bg-[#f8fafc] border-t-2 border-[#e2e8f0] px-3 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2 flex-wrap">
            {!sessionExists ? (
              <button onClick={onSave} disabled={isSaving}
                className="px-4 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-bold rounded border border-[#1d4ed8] transition-all disabled:opacity-50 uppercase tracking-wider">
                {isSaving ? 'සුරකිමින්...' : '💾 සුරකින්න'}
              </button>
            ) : (
              <button onClick={onUpdate} disabled={isSaving}
                className="px-4 py-1.5 bg-[#fff7ed] hover:bg-[#ffedd5] text-[#b45309] text-sm font-bold rounded border border-[#ffedd5] transition-all disabled:opacity-50 uppercase tracking-wider">
                {isSaving ? 'යාවත්කාලීන...' : '✏️ යාවත්කාලීන'}
              </button>
            )}
            <button onClick={onGetBill}
              className="px-4 py-1.5 bg-[#f0fdf4] hover:bg-[#bbf7d0] text-[#15803d] text-sm font-bold rounded border border-[#bbf7d0] transition-all uppercase tracking-wider">
              🧾 බිල
            </button>
            <button onClick={onSummary}
              className="px-4 py-1.5 bg-[#f5f3ff] hover:bg-[#ddd6fe] text-[#6d28d9] text-sm font-bold rounded border border-[#ddd6fe] transition-all uppercase tracking-wider">
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
            page.tsx and is NOT recomputed here. page.tsx computes it as
            the raw `grandTotalSelling - grandTotalCost`, ignoring
            billRowsTotal / extraSource, so this number never moves when
            extras are added or removed — only මුළු පිරිවැය / මුළු විකිණුම
            (below) reflect the adjustment. Matches BillModal.tsx's
            අවසාන කොමිස්.

            grandTotalCost / grandTotalSelling (props from page.tsx) must be
            summed from the SAME unclamped `sold` formula used above, or
            these totals will disagree with the per-item / per-category
            figures shown in the grid whenever returns exceed issues.
          */}
          <div className="flex items-end gap-5 text-right">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#2563eb] mb-0.5">
                මුළු පිරිවැය
                {extraSource === 'commission' && billRowsTotal !== 0 && (
                  <span className="text-[#dc2626]"> (+අතිරේක)</span>
                )}
              </div>
              <div className={`text-lg font-bold font-mono ${(extraSource === 'commission' ? grandTotalCost + billRowsTotal : grandTotalCost) < 0 ? 'text-[#dc2626]' : 'text-[#b45309]'}`}>
                රු. {(extraSource === 'commission' ? grandTotalCost + billRowsTotal : grandTotalCost).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#2563eb] mb-0.5">
                මුළු විකිණුම
                {extraSource === 'sale' && billRowsTotal !== 0 && (
                  <span className="text-[#dc2626]"> ({billRowsTotal > 0 ? '+' : '−'}අතිරේක)</span>
                )}
              </div>
              <div className={`text-lg font-bold font-mono ${(extraSource === 'sale' ? grandTotalSelling + billRowsTotal : grandTotalSelling) < 0 ? 'text-[#dc2626]' : 'text-[#15803d]'}`}>
                රු. {(extraSource === 'sale' ? grandTotalSelling + billRowsTotal : grandTotalSelling).toFixed(2)}
              </div>
            </div>
            <div className="border-l border-[#e2e8f0] pl-5">
              <div className="text-[12px] uppercase tracking-widest text-[#fffff] mb-0.5">කොමිස් මුදල</div>
              <div className={`text-2xl font-bold font-mono ${finalBalance >= 0 ? 'text-[#0284c7]' : 'text-[#dc2626]'}`}>
                රු. {finalBalance.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}