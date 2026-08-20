'use client';

import { CategoryWithItems, Employee, Vehicle, BillRow } from '@/lib/types';

interface BillModalProps {
  categories: CategoryWithItems[];
  employee: Employee | null;
  vehicle: Vehicle | null;
  date: string;
  sessionType: string;
  paymentStatus: string;
  billRows?: BillRow[];
  /** Which total extra charges are folded into — must match page.tsx */
  extraSource: 'sale' | 'commission';
  onClose: () => void;
}

export default function BillModal({
  categories, employee, vehicle, date, sessionType, paymentStatus,
  billRows = [], extraSource, onClose,
}: BillModalProps) {
  let grandCost = 0, grandSell = 0;
  let morningReturnedQty = 0, morningReturnedCost = 0;
  let eveningReturnedQty = 0, eveningReturnedCost = 0;
  const billItems = categories.flatMap(cat =>
    cat.items.filter(i => i.morning_qty > 0 || i.evening_qty > 0).map(item => {
      // ── Allow negative sold/cost/sell (e.g. returns exceeding issued qty)
      const sold = (item.morning_qty - item.morning_returned_qty) + item.evening_qty - item.returned_qty;
      const cost = sold * item.effective_cost;
      const sell = sold * item.effective_selling;
      grandCost += cost;
      grandSell += sell;
      // ── track return quantities and their cost value ────────────────────
      morningReturnedQty += item.morning_returned_qty;
      morningReturnedCost += item.morning_returned_qty * item.effective_cost;
      eveningReturnedQty += item.returned_qty;
      eveningReturnedCost += item.returned_qty * item.effective_cost;
      return { ...item, sold, cost, sell };
    })
  );

  const billRowsTotal = billRows.reduce((s, r) => s + Number(r.qty) * Number(r.amount), 0);

  // ── Extras are folded directly into ONE base line, not shown as a
  // separate deduction from commission. This must mirror page.tsx exactly.
  //
  // extraSource === 'commission' (DEFAULT):
  //   extras add on top of පිරිවැය (කොමිස්) — i.e. adjustedCost = cost + extras
  //   විකිණුම (පඩි) stays untouched
  //
  // extraSource === 'sale':
  //   extras are ADDED (signed) onto විකිණුම (පඩි) — i.e.
  //   adjustedSell = sell + extras. A positive extra amount increases the
  //   sale total; a negative extra amount decreases it, since adding a
  //   negative number already subtracts its magnitude — no separate "minus"
  //   branch needed. පිරිවැය (කොමිස්) stays untouched.
  const adjustedCost = extraSource === 'commission' ? grandCost + billRowsTotal : grandCost;
  const adjustedSell = extraSource === 'sale' ? grandSell + billRowsTotal : grandSell;

  // ── අවසාන කොමිස් (final balance) is intentionally NOT affected by extras,
  // in either direction. It always equals the raw grandSell − grandCost,
  // regardless of billRowsTotal or extraSource. Only the two boxes above
  // (පිරිවැය / විකිණුම) show the extras-adjusted figures + note — the
  // headline number at the bottom stays fixed no matter what extras are
  // added or removed. Must mirror IssueGrid.tsx / page.tsx exactly.
  const finalBalance = grandSell - grandCost;

  const handlePrint = () => window.print();

  // 7 qty cols + 2 amount cols (cost + sell)
  const cols = '1fr 1fr 1fr 1fr 1fr 1.3fr 1.3fr';

  const hdrCell = (first = false): React.CSSProperties => ({
    fontSize: '7pt',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: '1.25',
    borderLeft: first ? 'none' : '1px solid #000',
    padding: '1px 2px',
  });

  const numCell = (align: 'center' | 'right' = 'center', red = false, first = false): React.CSSProperties => ({
    textAlign: align,
    fontSize: '9pt',
    fontWeight: 'bold',
    color: red ? '#c00' : undefined,
    padding: '0 2px',
    lineHeight: '1.1',
    borderLeft: first ? 'none' : '1px solid #ccc',
  });

  // ── Clear, large-number summary box for පිරිවැය / විකිණුම ──────────────────
  const bigTotalBox = (
    label: string,
    value: number,
    accentColor: string,
    note?: string
  ): React.ReactElement => (
    <div style={{
      flex: 1,
      border: `1.5px solid ${value < 0 ? '#c00' : accentColor}`,
      borderRadius: '3px',
      background: '#fff',
      padding: '2mm 1mm',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '7.5pt', fontWeight: 'bold', color: '#333',
        letterSpacing: '0.3px', marginBottom: '1mm',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '15pt', fontWeight: 900, lineHeight: 1,
        fontFamily: 'Arial Black, Arial, sans-serif',
        color: value < 0 ? '#c00' : accentColor,
      }}>
        {Math.round(value)}
      </div>
      {note && (
        <div style={{ fontSize: '6.5pt', fontWeight: 'bold', color: '#c00', marginTop: '1mm' }}>
          {note}
        </div>
      )}
    </div>
  );

  // ── Box for a return total: quantity + its cost value, two lines ─────────
  const returnBox = (
    label: string,
    qty: number,
    costValue: number
  ): React.ReactElement => (
    <div style={{
      flex: 1,
      border: '1.5px solid #dc2626',
      borderRadius: '3px',
      background: '#fff5f5',
      padding: '2mm 1mm',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '7.5pt', fontWeight: 'bold', color: '#7f1d1d',
        letterSpacing: '0.3px', marginBottom: '1mm',
      }}>
        {label} <span style={{ fontWeight: 'normal' }}>(ප්‍රමාණය)</span>
      </div>
      <div style={{
        fontSize: '13pt', fontWeight: 900, lineHeight: 1,
        fontFamily: 'Arial Black, Arial, sans-serif',
        color: '#b91c1c',
      }}>
        {qty}
      </div>
      <div style={{
        borderTop: '1px dashed #dc2626', margin: '1.5mm 2mm 1mm',
      }} />
      <div style={{
        fontSize: '13pt', fontWeight: 900, lineHeight: 1,
        fontFamily: 'Arial Black, Arial, sans-serif',
        color: '#b91c1c',
      }}>
        රු. {Math.round(costValue)}
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body * { visibility: hidden; }
          #bill-content, #bill-content * { visibility: visible; }
          #bill-content {
            position: fixed; top: 0; left: 0;
            width: 76mm; padding: 2mm 3mm;
            border: none !important; box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white text-black rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

          <div id="bill-content" style={{
            width: '76mm', margin: '0 auto',
            fontFamily: "'Courier New', monospace",
            fontSize: '8pt', color: '#000',
            padding: '3mm 3mm', boxSizing: 'border-box',
          }}>

            {/* ── HEADER ── */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '1.5mm', marginBottom: '1.5mm' }}>
              <div style={{ fontSize: '14pt', fontWeight: 'bold', letterSpacing: '1px' }}>තරූන් බේකර්ස්</div>
              <div style={{ fontSize: '8.5pt', marginTop: '0.5mm' }}>නිකුත් කිරීමේ රිසිට්පත</div>
            </div>

            {/* ── SESSION INFO ── */}
            {[
              ['දිනය', new Date(date).toLocaleDateString('si-LK', { day: '2-digit', month: 'long', year: 'numeric' })],
              ['සේවකයා', employee?.name || '-'],
              ['වාහනය', vehicle?.vehicle_number || '-'],
              ['සැසිය', sessionType === 'full_day' ? 'සම්පූර්ණ දිනය' : 'උදේ'],
              ['ගෙවීම', paymentStatus === 'paid' ? 'ගෙවා ඇත' : 'ගෙවා නැත'],
            ].map(([label, value]) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '8.5pt', padding: '0.5px 0',
                borderBottom: '1px dashed #ccc',
              }}>
                <span style={{ fontWeight: 'bold' }}>{label}:</span>
                <span style={{ fontWeight: label === 'ගෙවීම' ? 'bold' : 'normal' }}>{value}</span>
              </div>
            ))}

            <div style={{ borderTop: '2px solid #000', margin: '1.5mm 0' }} />

            {/* ── COLUMN HEADER ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: cols,
              border: '1px solid #e0e0e0',
              borderTop: 'none',
              background: '#f0f0f0',
              borderLeft: '1px solid #ccc',
              borderRight: '1px solid #ccc',
              borderBottom: '1px solid #ccc',
              paddingBottom: '10px',
            }}>
              <span style={hdrCell(true)}>උදේ<br/>ප්‍රමාණ</span>
              <span style={hdrCell()}>උදේ<br/>ආපසු</span>
              <span style={hdrCell()}>සවස<br/>ප්‍රමාණ</span>
              <span style={hdrCell()}>සවස<br/>ආපසු</span>
              <span style={hdrCell()}>විකි<br/>නුම</span>
              <span style={hdrCell()}>පිරි<br/>වැය</span>
              <span style={hdrCell()}>විකි<br/>මිල</span>
            </div>

            {/* ── ITEM ROWS ── */}
            {billItems.map((item, i) => (
              <div key={i} style={{ borderBottom: '1px dotted #999', padding: '1px 0' }}>
                <div style={{
                  fontSize: '8.5pt', fontWeight: 'bold', lineHeight: '1.15',
                  borderLeft: '1px solid #ddd', borderRight: '1px solid #ddd',
                  padding: '0 3px',
                }}>
                  {item.name}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: cols,
                  borderLeft: '1px solid #ddd',
                  borderRight: '1px solid #ddd',
                  fontWeight: 700,
                  letterSpacing: '0.3px',
                  fontFamily: 'Helvetica, sans-serif',
                }}>
                  <span style={numCell('center', false, true)}>{item.morning_qty || '-'}</span>
                  <span style={numCell('center', item.morning_returned_qty > 0)}>{item.morning_returned_qty || '-'}</span>
                  <span style={numCell()}>{item.evening_qty || '-'}</span>
                  <span style={numCell('center', item.returned_qty > 0)}>{item.returned_qty || '-'}</span>
                  <span style={numCell('center', item.sold < 0)}>{item.sold !== 0 ? item.sold : '-'}</span>
                  <span style={{ ...numCell('right', item.cost < 0), fontWeight: 'bold' }}>{item.cost !== 0 ? Math.round(item.cost) : '-'}</span>
                  <span style={{ ...numCell('right', item.sell < 0), fontWeight: 'bold' }}>{item.sell !== 0 ? Math.round(item.sell) : '-'}</span>
                </div>
              </div>
            ))}

            {/* ── TOTALS SECTION ── */}
            <div style={{ borderTop: '2px solid #000', marginTop: '1px', paddingTop: '2px' }}>

              {/* Qty totals grid — raw, unadjusted sums straight from items */}
              <div style={{
                display: 'grid', gridTemplateColumns: cols,
                borderLeft: '1px solid #ccc', borderRight: '1px solid #ccc',
                borderBottom: '1px solid #ccc', background: '#fafafa',
              }}>
                <span style={{
                  gridColumn: '1 / span 5',
                  fontSize: '7pt', color: '#555', padding: '1px 3px',
                  borderRight: '1px solid #ccc',
                }}>
                  එකතු
                </span>
                <span style={{
                  fontSize: '9pt', fontWeight: 'bold', textAlign: 'right',
                  padding: '1px 2px', borderRight: '1px solid #ccc',
                  color: grandCost < 0 ? '#c00' : '#666',
                }}>
                  {Math.round(grandCost)}
                </span>
                <span style={{
                  fontSize: '9pt', fontWeight: 'bold', textAlign: 'right',
                  padding: '1px 2px',
                  color: grandSell < 0 ? '#c00' : undefined,
                }}>
                  {Math.round(grandSell)}
                </span>
              </div>

              {/* Return totals — quantity + cost value, only shown if any
                  returns exist for this session */}
              {(morningReturnedQty > 0 || eveningReturnedQty > 0) && (
                <div style={{ display: 'flex', gap: '2mm', marginTop: '2mm' }}>
                  {morningReturnedQty > 0 && returnBox('උදේ ආපසු', morningReturnedQty, morningReturnedCost)}
                  {eveningReturnedQty > 0 && returnBox('සවස ආපසු', eveningReturnedQty, eveningReturnedCost)}
                </div>
              )}

              {/* Individual total boxes — large, clearly readable numbers.
                  These carry the extras adjustment (see note under each). */}
              <div style={{ display: 'flex', gap: '2mm', marginTop: '2mm' }}>
                {bigTotalBox(
                  'පිරිවැය (කොමිස්)',
                  adjustedCost,
                  '#b45309',
                  extraSource === 'commission' && billRowsTotal !== 0 ? `+අතිරේක ${Math.round(billRowsTotal)}` : undefined
                )}
                {bigTotalBox(
                  'විකිණුම (පඩි)',
                  adjustedSell,
                  '#15803d',
                  extraSource === 'sale' && billRowsTotal !== 0 ? `${billRowsTotal > 0 ? '+' : '−'}අතිරේක ${Math.round(Math.abs(billRowsTotal))}` : undefined
                )}
              </div>
            </div>

            {/* ── EXTRA BILL ROWS ── */}
            {billRows.length > 0 && (
              <>
                <div style={{ borderTop: '2px dashed #000', margin: '1.5mm 0 1mm' }} />
                <div style={{ fontSize: '9pt', fontWeight: 'bold', marginBottom: '1mm' }}>
                  අතිරේක ({extraSource === 'sale' ? 'විකිණුම (පඩි) වෙතින්' : 'පිරිවැය (කොමිස්) වෙතට'}):
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
                  border: '1px solid #000',
                  background: '#f0f0f0',
                }}>
                  <span style={{ fontSize: '7.5pt', fontWeight: 'bold', padding: '1px 3px', borderRight: '1px solid #000' }}>
                    විස්තරය
                  </span>
                  <span style={{ fontSize: '7.5pt', fontWeight: 'bold', textAlign: 'right', padding: '1px 3px' }}>
                    මුදල
                  </span>
                </div>

                {billRows.map((row, i) => {
                  const amt = Number(row.qty) * Number(row.amount);
                  return (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
                      borderLeft: '1px solid #ddd', borderRight: '1px solid #ddd',
                      borderBottom: '1px dotted #aaa',
                      padding: '1px 0',
                    }}>
                      <span style={{ fontSize: '8.5pt', fontWeight: 'bold', padding: '0 3px', borderRight: '1px solid #ddd' }}>
                        {row.description}
                      </span>
                      <span style={{ fontSize: '9pt', fontWeight: 'bold', textAlign: 'right', padding: '0 3px', color: amt < 0 ? '#c00' : undefined }}>
                        {Math.round(amt)}
                      </span>
                    </div>
                  );
                })}

                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: '8pt', fontWeight: 'bold',
                  borderTop: '2px solid #000', padding: '1px 0',
                  color: billRowsTotal < 0 ? '#c00' : undefined,
                }}>
                  <span>අතිරේක මුළු:</span>
                  <span>රු. {Math.round(billRowsTotal)}</span>
                </div>
              </>
            )}

            {/* ── FINAL BALANCE ──────────────────────────────────────────────
                අවසාන කොමිස් is intentionally the raw grandSell − grandCost.
                It does NOT reflect adjustedCost/adjustedSell, so adding or
                removing extra charges never changes this number — extras
                only ever show up in the two boxes above.
                This is the headline number on the receipt: biggest, boldest. */}
            <div style={{
              border: '2.5px solid #000',
              borderRadius: '3px',
              margin: '2mm 0',
              padding: '2mm',
              textAlign: 'center',
              background: '#f5f5f5',
            }}>
              <div style={{
                fontSize: '8.5pt', fontWeight: 'bold', letterSpacing: '0.5px',
                color: '#333', marginBottom: '1mm',
              }}>
                අවසාන කොමිස් (රු.)
              </div>
              <div style={{
                fontSize: '22pt', fontWeight: 900, lineHeight: 1,
                fontFamily: 'Arial Black, Arial, sans-serif',
                color: finalBalance >= 0 ? '#000' : '#c00',
              }}>
                {Math.round(finalBalance)}
              </div>
            </div>

            {/* ── FOOTER ── */}
            <div style={{ textAlign: 'center', fontSize: '7.5pt', color: '#555', paddingTop: '1mm', borderTop: '1px dashed #000' }}>
              <div>ජනනය: {new Date().toLocaleString('si-LK')}</div>
              <div style={{ marginTop: '1px', fontSize: '9pt', fontWeight: 'bold', letterSpacing: '2px' }}>
                * * * ස්තුතියි * * *
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="no-print flex gap-3 justify-end p-4 border-t bg-gray-50">
            <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-all">
              🖨️ මුද්‍රණය කරන්න
            </button>
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-semibold transition-all">
              වසන්න
            </button>
          </div>
        </div>
      </div>
    </>
  );
}