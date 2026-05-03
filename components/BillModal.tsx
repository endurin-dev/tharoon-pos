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
  onClose: () => void;
}

export default function BillModal({
  categories, employee, vehicle, date, sessionType, paymentStatus,
  billRows = [], onClose,
}: BillModalProps) {
  let grandCost = 0, grandSell = 0;
  const billItems = categories.flatMap(cat =>
    cat.items.filter(i => i.morning_qty > 0 || i.evening_qty > 0).map(item => {
      const sold = item.morning_qty + item.evening_qty - item.returned_qty;
      const cost = sold * item.effective_cost;
      const sell = sold * item.effective_selling;
      grandCost += cost;
      grandSell += sell;
      return { ...item, sold, cost, sell };
    })
  );

  const billRowsTotal = billRows.reduce((s, r) => s + Number(r.qty) * Number(r.amount), 0);
  const finalBalance = grandSell - grandCost + billRowsTotal;
  const handlePrint = () => window.print();

  const colStyle = (align: 'left' | 'center' | 'right' = 'center'): React.CSSProperties => ({
    textAlign: align, padding: '0 2px', fontSize: '13pt',
  });

  return (
    <>
      <style>{`
        @media print {
          @page { size: 96mm auto; margin: 0; }
          body * { visibility: hidden; }
          #bill-content, #bill-content * { visibility: visible; }
          #bill-content {
            position: fixed; top: 0; left: 0;
            width: 90mm; padding: 3mm 4mm;
            border: none !important; box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white text-black rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

          <div id="bill-content" style={{
            width: '90mm', margin: '0 auto',
            fontFamily: "'Courier New', monospace",
            fontSize: '11pt', color: '#000',
            padding: '5mm 4mm', boxSizing: 'border-box',
          }}>

            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '4mm', marginBottom: '4mm' }}>
              <div style={{ fontSize: '20pt', fontWeight: 'bold', letterSpacing: '1px' }}>තරූන් බේකර්ස්</div>
              <div style={{ fontSize: '13pt', marginTop: '2mm' }}>නිකුත් කිරීමේ රිසිට්පත</div>
            </div>

            {/* Session info */}
            {[
              ['දිනය', new Date(date).toLocaleDateString('si-LK', { day: '2-digit', month: 'long', year: 'numeric' })],
              ['සේවකයා', employee?.name || '-'],
              ['වාහනය', vehicle?.vehicle_number || '-'],
              ['සැසිය', sessionType === 'full_day' ? 'සම්පූර්ණ දිනය' : 'උදේ'],
              ['ගෙවීම', paymentStatus === 'paid' ? 'ගෙවා ඇත' : 'ගෙවා නැත'],
            ].map(([label, value]) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '12pt', padding: '4px 0',
                borderBottom: '1px dashed #ccc',
              }}>
                <span style={{ fontWeight: 'bold' }}>{label}:</span>
                <span style={{ fontWeight: label === 'ගෙවීම' ? 'bold' : 'normal' }}>{value}</span>
              </div>
            ))}

            <div style={{ borderTop: '2px solid #000', margin: '4mm 0' }} />

            {/* Items — column header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
              borderTop: '2px solid #000', borderBottom: '1px solid #000',
              padding: '4px 0', marginBottom: '2px',
            }}>
              <span style={{ gridColumn: '1 / span 5', fontSize: '10pt', fontWeight: 'bold', marginBottom: '2px' }}>
                භාණ්ඩය
              </span>
              {['උදේ', 'සවස', 'ආප', 'විකි'].map(h => (
                <span key={h} style={{ fontSize: '10pt', fontWeight: 'bold', textAlign: 'center' }}>{h}</span>
              ))}
              <span style={{ fontSize: '10pt', fontWeight: 'bold', textAlign: 'right' }}>රු.</span>
            </div>

            {/* Items — two-line rows */}
            {billItems.map((item, i) => (
              <div key={i} style={{ borderBottom: '1px dotted #aaa', padding: '5px 0 4px' }}>
                <div style={{ fontSize: '13pt', fontWeight: 'bold', marginBottom: '3px' }}>{item.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', textAlign: 'center' }}>
                  <span style={colStyle()}>{item.morning_qty || '-'}</span>
                  <span style={colStyle()}>{item.evening_qty || '-'}</span>
                  <span style={colStyle()}>{item.returned_qty || '-'}</span>
                  <span style={{ ...colStyle(), fontWeight: 'bold' }}>{item.sold}</span>
                  <span style={{ ...colStyle('right'), fontWeight: 'bold' }}>{item.sell.toFixed(2)}</span>
                </div>
              </div>
            ))}

            {/* Cost / Sell totals */}
            <div style={{ borderTop: '2px solid #000', paddingTop: '4px', marginTop: '4px' }}>
              {[['පිරිවැය', grandCost], ['විකිණුම', grandSell]].map(([label, val]) => (
                <div key={label as string} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: '12pt', fontWeight: 'bold', padding: '3px 0',
                }}>
                  <span>{label as string}:</span>
                  <span>{(val as number).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Extra Bill Rows */}
            {billRows.length > 0 && (
              <>
                <div style={{ borderTop: '2px dashed #000', margin: '4mm 0 3mm' }} />
                <div style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '3mm' }}>අතිරේක:</div>

                {/* Extra rows column header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                  borderTop: '2px solid #000', borderBottom: '1px solid #000',
                  padding: '4px 0', marginBottom: '2px',
                }}>
                  <span style={{ gridColumn: '1 / span 3', fontSize: '10pt', fontWeight: 'bold', marginBottom: '2px' }}>
                    විස්තරය
                  </span>
                  <span style={{ fontSize: '10pt', fontWeight: 'bold', textAlign: 'center' }}>ගණ</span>
                  <span style={{ fontSize: '10pt', fontWeight: 'bold', textAlign: 'right' }}>මිල</span>
                  <span style={{ fontSize: '10pt', fontWeight: 'bold', textAlign: 'right' }}>එකතුව</span>
                </div>

                {billRows.map((row, i) => (
                  <div key={i} style={{ borderBottom: '1px dotted #aaa', padding: '5px 0 4px' }}>
                    <div style={{ fontSize: '13pt', fontWeight: 'bold', marginBottom: '3px' }}>{row.description}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                      <span style={{ ...colStyle(), fontWeight: 'normal' }}>{Number(row.qty)}</span>
                      <span style={colStyle('right')}>{Number(row.amount).toFixed(2)}</span>
                      <span style={{ ...colStyle('right'), fontWeight: 'bold' }}>
                        {(Number(row.qty) * Number(row.amount)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}

                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: '12pt', fontWeight: 'bold',
                  borderTop: '2px solid #000', padding: '4px 0',
                }}>
                  <span>අතිරේක එකතුව:</span>
                  <span>{billRowsTotal.toFixed(2)}</span>
                </div>
              </>
            )}

            {/* Final balance */}
            <div style={{
              borderTop: '3px double #000', borderBottom: '3px double #000',
              margin: '4mm 0', padding: '6px 0',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16pt', fontWeight: 'bold' }}>
                <span>අවසාන ශේෂය (රු.):</span>
                <span>{finalBalance.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: '10pt', color: '#555', paddingTop: '3mm', borderTop: '1px dashed #000' }}>
              <div>ජනනය: {new Date().toLocaleString('si-LK')}</div>
              <div style={{ marginTop: '3px', fontSize: '13pt', fontWeight: 'bold', letterSpacing: '3px' }}>
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