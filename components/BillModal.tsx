'use client';

import { CategoryWithItems, Employee, Vehicle } from '@/lib/types';
import { BillRow } from '@/app/page';

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

  return (
    <>
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body * { visibility: hidden; }
          #bill-content, #bill-content * { visibility: visible; }
          #bill-content {
            position: fixed; top: 0; left: 0;
            width: 72mm; padding: 2mm 3mm;
            border: none !important; box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white text-black rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

          <div id="bill-content" style={{
            width: '72mm', margin: '0 auto',
            fontFamily: "'Courier New', monospace",
            fontSize: '9pt', color: '#000',
            padding: '4mm 3mm', boxSizing: 'border-box' as const,
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px solid #000', paddingBottom: '3mm', marginBottom: '3mm' }}>
              <div style={{ fontSize: '13pt', fontWeight: 'bold', letterSpacing: '1px' }}>තරූන් බේකර්ස්</div>
              <div style={{ fontSize: '9pt' }}>නිකුත් කිරීමේ රිසිට්පත</div>
            </div>

            {/* Session info */}
            {[
              ['දිනය', new Date(date).toLocaleDateString('si-LK', { day: '2-digit', month: 'long', year: 'numeric' })],
              ['සේවකයා', employee?.name || '-'],
              ['වාහනය', vehicle?.vehicle_number || '-'],
              ['සැසිය', sessionType === 'full_day' ? 'සම්පූර්ණ දිනය' : 'උදේ'],
              ['ගෙවීම', paymentStatus === 'paid' ? 'ගෙවා ඇත' : 'ගෙවා නැත'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', marginBottom: '1px' }}>
                <span style={{ fontWeight: 'bold' }}>{label}:</span>
                <span style={{ fontWeight: label === 'ගෙවීම' ? 'bold' : 'normal' }}>{value}</span>
              </div>
            ))}

            <div style={{ borderTop: '1px dashed #000', margin: '3mm 0' }} />

            {/* Items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5pt' }}>
              <thead>
                <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                  <th style={{ textAlign: 'left', padding: '1px', width: '28mm', fontSize: '7pt' }}>භාණ්ඩය</th>
                  <th style={{ textAlign: 'center', padding: '1px', width: '6mm', fontSize: '7pt' }}>උදේ</th>
                  <th style={{ textAlign: 'center', padding: '1px', width: '6mm', fontSize: '7pt' }}>සවස</th>
                  <th style={{ textAlign: 'center', padding: '1px', width: '6mm', fontSize: '7pt' }}>ආප</th>
                  <th style={{ textAlign: 'center', padding: '1px', width: '6mm', fontSize: '7pt' }}>විකි</th>
                  <th style={{ textAlign: 'right', padding: '1px', width: '10mm', fontSize: '7pt' }}>විකිණුම</th>
                </tr>
              </thead>
              <tbody>
                {billItems.map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: '1px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '28mm' }}>
                      {item.name}
                    </td>
                    <td style={{ textAlign: 'center', padding: '1px' }}>{item.morning_qty || '-'}</td>
                    <td style={{ textAlign: 'center', padding: '1px' }}>{item.evening_qty || '-'}</td>
                    <td style={{ textAlign: 'center', padding: '1px' }}>{item.returned_qty || '-'}</td>
                    <td style={{ textAlign: 'center', padding: '1px', fontWeight: 'bold' }}>{item.sold}</td>
                    <td style={{ textAlign: 'right', padding: '1px' }}>{item.sell.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '1px solid #000', fontWeight: 'bold' }}>
                  <td colSpan={4} style={{ textAlign: 'right', padding: '2px 1px' }}>පිරිවැය:</td>
                  <td colSpan={2} style={{ textAlign: 'right', padding: '2px 1px' }}>{grandCost.toFixed(2)}</td>
                </tr>
                <tr style={{ fontWeight: 'bold' }}>
                  <td colSpan={4} style={{ textAlign: 'right', padding: '1px' }}>විකිණුම:</td>
                  <td colSpan={2} style={{ textAlign: 'right', padding: '1px' }}>{grandSell.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Extra Bill Rows */}
            {billRows.length > 0 && (
              <>
                <div style={{ borderTop: '1px dashed #000', margin: '3mm 0 2mm' }} />
                <div style={{ fontSize: '7pt', fontWeight: 'bold', marginBottom: '1mm', letterSpacing: '0.5px' }}>
                  අතිරේක:
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5pt' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #ccc' }}>
                      <th style={{ textAlign: 'left', padding: '1px', fontSize: '7pt' }}>විස්තරය</th>
                      <th style={{ textAlign: 'center', padding: '1px', width: '8mm', fontSize: '7pt' }}>ගණ</th>
                      <th style={{ textAlign: 'right', padding: '1px', width: '10mm', fontSize: '7pt' }}>මිල</th>
                      <th style={{ textAlign: 'right', padding: '1px', width: '12mm', fontSize: '7pt' }}>එකතුව</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billRows.map((row, i) => (
                      <tr key={i}>
                        <td style={{ padding: '1px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {row.description}
                        </td>
                        <td style={{ textAlign: 'center', padding: '1px' }}>{Number(row.qty)}</td>
                        <td style={{ textAlign: 'right', padding: '1px' }}>{Number(row.amount).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', padding: '1px', fontWeight: 'bold' }}>
                          {(Number(row.qty) * Number(row.amount)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '1px solid #000', fontWeight: 'bold' }}>
                      <td colSpan={3} style={{ textAlign: 'right', padding: '1px' }}>අතිරේක එකතුව:</td>
                      <td style={{ textAlign: 'right', padding: '1px' }}>{billRowsTotal.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </>
            )}

            {/* Final balance */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5pt', marginTop: '2mm' }}>
              <tbody>
                <tr style={{ fontWeight: 'bold', borderTop: '1px dashed #000', fontSize: '10pt' }}>
                  <td style={{ textAlign: 'right', padding: '3px 1px' }}>අවසාන ශේෂය (රු.):</td>
                  <td style={{ textAlign: 'right', padding: '3px 1px', width: '16mm' }}>{finalBalance.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* Footer */}
            <div style={{ borderTop: '1px dashed #000', marginTop: '3mm', paddingTop: '2mm', textAlign: 'center', fontSize: '7pt', color: '#555' }}>
              <div>ජනනය: {new Date().toLocaleString('si-LK')}</div>
              <div style={{ marginTop: '2px' }}>* * * ස්තුතියි * * *</div>
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