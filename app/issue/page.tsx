'use client';

import { useEffect, useState, useCallback } from 'react';
import IssueGrid from '@/components/IssueGrid';
import BillModal from '@/components/BillModal';
import SummaryModal from '@/components/SummaryModal';
import { CategoryWithItems, Employee, Vehicle } from '@/lib/types';

export interface BillRow {
  id?: number;
  session_id?: number;
  description: string;
  qty: number;
  amount: number;
  sort_order: number;
}

export default function HomePage() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [sessionType, setSessionType] = useState<'morning' | 'full_day'>('full_day');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('unpaid');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<CategoryWithItems[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [sessionExists, setSessionExists] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [showBill, setShowBill] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [billRows, setBillRows] = useState<BillRow[]>([]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch('/api/employees').then(r => r.json()).then(setEmployees);
    fetch('/api/vehicles').then(r => r.json()).then(setVehicles);
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      const itemRows = await fetch('/api/items?with_categories=1').then(r => r.json());

      const priceMap = new Map<number, { cost: number; sell: number }>();
      if (selectedEmployee) {
        const empPrices = await fetch(
          `/api/employee-prices?employee_id=${selectedEmployee.id}`
        ).then(r => r.json());
        for (const p of empPrices) {
          priceMap.set(p.item_id, { cost: Number(p.cost_price), sell: Number(p.selling_price) });
        }
      }

      let savedItems: any[] = [];
      let existingSession: any = null;
      if (selectedEmployee && selectedDate) {
        const sessionRes = await fetch(
          `/api/issues?date=${selectedDate}&employee_id=${selectedEmployee.id}`
        ).then(r => r.json());
        existingSession = sessionRes.session ?? null;
        savedItems = sessionRes.items ?? [];
      }

      setSessionExists(!!existingSession);

      if (existingSession) {
        setSessionId(existingSession.id);
        setSessionType(existingSession.session_type);
        setPaymentStatus(existingSession.payment_status);
        const rows = await fetch(`/api/bill-rows?session_id=${existingSession.id}`).then(r => r.json());
        setBillRows(Array.isArray(rows) ? rows : []);
      } else {
        setSessionId(null);
        setBillRows([]);
      }

      const savedMap = new Map<number, {
        morning_qty: number; evening_qty: number; returned_qty: number;
        cost_price: number; selling_price: number;
      }>();
      for (const si of savedItems) {
        savedMap.set(si.item_id, {
          morning_qty: si.morning_qty, evening_qty: si.evening_qty,
          returned_qty: si.returned_qty, cost_price: Number(si.cost_price),
          selling_price: Number(si.selling_price),
        });
      }

      const catMap = new Map<number, CategoryWithItems>();
      for (const row of itemRows) {
        if (!row.id) continue;
        if (!catMap.has(row.category_id)) {
          catMap.set(row.category_id, {
            id: row.category_id, name: row.category_name,
            sort_order: row.category_sort, items: [],
          });
        }
        const saved = savedMap.get(row.id);
        const empPrice = priceMap.get(row.id);
        const effectiveCost = saved ? saved.cost_price : empPrice ? empPrice.cost : Number(row.cost_price);
        const effectiveSell = saved ? saved.selling_price : empPrice ? empPrice.sell : Number(row.selling_price);
        catMap.get(row.category_id)!.items.push({
          id: row.id, category_id: row.category_id, name: row.name,
          cost_price: Number(row.cost_price), selling_price: Number(row.selling_price),
          is_active: row.is_active, sort_order: row.sort_order,
          morning_qty: saved?.morning_qty ?? 0,
          evening_qty: saved?.evening_qty ?? 0,
          returned_qty: saved?.returned_qty ?? 0,
          effective_cost: effectiveCost, effective_selling: effectiveSell,
        });
      }
      setCategories(Array.from(catMap.values()).sort((a, b) => a.sort_order - b.sort_order));
    };
    loadAll();
  }, [selectedEmployee?.id, selectedDate]);

  const handleCategoryChange = useCallback(
    (catId: number, itemId: number, field: 'morning_qty' | 'evening_qty' | 'returned_qty', val: number) => {
      setCategories(prev => prev.map(cat =>
        cat.id !== catId ? cat : {
          ...cat,
          items: cat.items.map(item => item.id !== itemId ? item : { ...item, [field]: val }),
        }
      ));
    }, []
  );

  const handleSaveBillRow = async (row: BillRow) => {
    if (!sessionId) return showToast('පළමුව සැසිය සුරකින්න', 'error');
    const res = await fetch('/api/bill-rows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...row, session_id: sessionId }),
    });
    if (res.ok) {
      const saved = await res.json();
      setBillRows(prev => {
        const idx = prev.findIndex(r => r.id === saved.id);
        if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
        return [...prev, saved];
      });
    } else {
      const d = await res.json();
      showToast(d.error || 'දෝෂයකි', 'error');
    }
  };

  const handleDeleteBillRow = async (id: number) => {
    const res = await fetch('/api/bill-rows', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setBillRows(prev => prev.filter(r => r.id !== id));
  };

  const grandTotalCost = categories.reduce((sum, cat) =>
    sum + cat.items.reduce((s, item) => {
      const sold = Math.max(0, item.morning_qty + item.evening_qty - item.returned_qty);
      return s + sold * item.effective_cost;
    }, 0), 0);

  const grandTotalSelling = categories.reduce((sum, cat) =>
    sum + cat.items.reduce((s, item) => {
      const sold = Math.max(0, item.morning_qty + item.evening_qty - item.returned_qty);
      return s + sold * item.effective_selling;
    }, 0), 0);

  const billRowsTotal = billRows.reduce((s, r) => s + Number(r.qty) * Number(r.amount), 0);
  const finalBalance = grandTotalSelling - grandTotalCost + billRowsTotal;

  const buildPayload = () => ({
    session: {
      session_date: selectedDate,
      employee_id: selectedEmployee!.id,
      vehicle_id: selectedVehicle?.id || null,
      session_type: sessionType,
      payment_status: paymentStatus,
    },
    items: categories.flatMap(cat =>
      cat.items.map(item => ({
        item_id: item.id,
        morning_qty: item.morning_qty, evening_qty: item.evening_qty,
        returned_qty: item.returned_qty,
        cost_price: item.effective_cost, selling_price: item.effective_selling,
      }))
    ),
  });

  const handleSave = async () => {
    if (!selectedEmployee) return showToast('සේවකයෙකු තෝරන්න', 'error');
    setIsSaving(true);
    const res = await fetch('/api/issues', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload()),
    });
    const data = await res.json();
    setIsSaving(false);
    if (data.success) {
      setSessionExists(true);
      if (data.session_id) setSessionId(data.session_id);
      showToast('සැසිය සාර්ථකව සුරකිණි!');
    } else showToast(data.error || 'සුරැකීම අසාර්ථකයි', 'error');
  };

  const handleUpdate = async () => {
    if (!selectedEmployee) return showToast('සේවකයෙකු තෝරන්න', 'error');
    setIsSaving(true);
    const res = await fetch('/api/issues', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload()),
    });
    const data = await res.json();
    setIsSaving(false);
    if (data.success) showToast('සැසිය යාවත්කාලීන විය!');
    else showToast(data.error || 'යාවත්කාලීන කිරීම අසාර්ථකයි', 'error');
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="bg-[#0a1628] border-b border-[#1e3a5f] px-4 py-2 flex items-center justify-between">
        <h1 className="text-[#4a9eff] font-bold text-sm uppercase tracking-widest">
          භාණ්ඩ නිකුත් කිරීම
        </h1>
        <div className="text-[#94a3b8] text-xs">
          {sessionExists && <span className="text-[#22c55e] mr-3">● සැසිය ක්‍රියාත්මකයි</span>}
          ⌨️ Enter → පහළ · Tab → දකුණ · ↑↓ එකම තීරය · ←→ එකම පේළිය
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <IssueGrid
          categories={categories}
          employees={employees}
          vehicles={vehicles}
          sessionType={sessionType}
          selectedDate={selectedDate}
          selectedEmployee={selectedEmployee}
          selectedVehicle={selectedVehicle}
          onSessionTypeChange={setSessionType}
          onDateChange={setSelectedDate}
          onEmployeeChange={setSelectedEmployee}
          onVehicleChange={setSelectedVehicle}
          onCategoryChange={handleCategoryChange}
          onSave={handleSave}
          onUpdate={handleUpdate}
          onGetBill={() => setShowBill(true)}
          onSummary={() => setShowSummary(true)}
          isSaving={isSaving}
          paymentStatus={paymentStatus}
          onPaymentStatusChange={setPaymentStatus}
          sessionExists={sessionExists}
          sessionId={sessionId}
          finalBalance={finalBalance}
          grandTotalCost={grandTotalCost}
          grandTotalSelling={grandTotalSelling}
          billRows={billRows}
          billRowsTotal={billRowsTotal}
          onSaveBillRow={handleSaveBillRow}
          onDeleteBillRow={handleDeleteBillRow}
        />
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-xl font-semibold text-sm z-50 ${
          toast.type === 'success' ? 'bg-[#22c55e] text-white' : 'bg-[#ef4444] text-white'
        }`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {showBill && (
        <BillModal
          categories={categories}
          employee={selectedEmployee}
          vehicle={selectedVehicle}
          date={selectedDate}
          sessionType={sessionType}
          paymentStatus={paymentStatus}
          billRows={billRows}
          onClose={() => setShowBill(false)}
        />
      )}

      {showSummary && (
        <SummaryModal date={selectedDate} onClose={() => setShowSummary(false)} />
      )}
    </div>
  );
}