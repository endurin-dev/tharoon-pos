'use client';

import { createPortal } from 'react-dom';
import { CategoryWithItems, Employee, BillRow } from '@/lib/types';

interface BillModalProps {
  categories: CategoryWithItems[];
  employee: Employee | null;
  date: string;
  paymentStatus: string;
  billRows?: BillRow[];
  /** Which total extra charges are folded into — must match page.tsx */
  extraSource: 'sale' | 'commission';
  onClose: () => void;
}

export default function BillModal({
  categories, employee, date, paymentStatus,
  billRows = [], extraSource, onClose,
}: BillModalProps) {
  const billItems = categories.flatMap(cat =>
    cat.items.filter(i => i.morning_qty > 0 || i.evening_qty > 0).map(item => {
      // ── Allow negative sold/cost/sell (e.g. returns exceeding issued qty)
      const sold = (item.morning_qty - item.morning_returned_qty) + item.evening_qty - item.returned_qty;
      const cost = sold * item.effective_cost;
      const sell = sold * item.effective_selling;
      return { ...item, sold, cost, sell };
    })
  );

  const { grandCost, grandSell, morningReturnedCost, eveningReturnedCost } =
    billItems.reduce((totals, item) => ({
      grandCost: totals.grandCost + item.cost,
      grandSell: totals.grandSell + item.sell,
      morningReturnedCost: totals.morningReturnedCost + item.morning_returned_qty * item.effective_cost,
      eveningReturnedCost: totals.eveningReturnedCost + item.returned_qty * item.effective_cost,
    }), {
      grandCost: 0,
      grandSell: 0,
      morningReturnedCost: 0,
      eveningReturnedCost: 0,
    });

  const billRowsTotal = billRows.reduce((s, r) => s + Number(r.qty) * Number(r.amount), 0);

  // ── Extras are folded directly into ONE base line (mirrors page.tsx)
  //   'commission': adjustedCost = cost + extras, sell untouched
  //   'sale':       adjustedSell = sell + extras (signed), cost untouched
  const adjustedCost = extraSource === 'commission' ? grandCost + billRowsTotal : grandCost;
  const adjustedSell = extraSource === 'sale' ? grandSell + billRowsTotal : grandSell;

  // ── අවසාන කොමිස් is intentionally NOT affected by extras.
  // Must mirror IssueGrid.tsx / page.tsx exactly.
  const finalBalance = grandSell - grandCost;

  const handlePrint = () => window.print();

  // 5 qty cols + 2 amount cols (wider so 5-digit amounts never clip)
  const cols = 'minmax(0,0.9fr) minmax(0,0.9fr) minmax(0,0.9fr) minmax(0,0.9fr) minmax(0,0.9fr) minmax(0,1.5fr) minmax(0,1.5fr)';

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
    overflow: 'hidden',
  });

  // ── Compact summary box for පිරිවැය / විකිණුම ───────────────
  const bigTotalBox = (
    label: string,
    value: number,
    accentColor: string,
    note?: string,
    highlightValue = false
  ): React.ReactElement => (
    <div style={{
      flex: 1,
      minWidth: 0,
      border: `1px solid ${value < 0 ? '#c00' : accentColor}`,
      borderRadius: '3px',
      background: '#fff',
      padding: '2.5mm 1.5mm',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '8pt', fontWeight: 'bold', color: '#333',
        letterSpacing: '0.3px', marginBottom: '1mm',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '16pt', fontWeight: 900, lineHeight: 1,
        fontFamily: 'Arial Black, Arial, sans-serif',
        color: value < 0 ? '#c00' : accentColor,
        ...(highlightValue ? {
          display: 'table',
          margin: '0 auto',
          border: '2px solid #000',
          borderRadius: '50%',
          padding: '2mm 4mm',
        } : {}),
      }}>
        {Math.round(value)}
      </div>
      {note && (
        <div style={{ fontSize: '7pt', fontWeight: 'bold', color: '#c00', marginTop: '1mm' }}>
          {note}
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      id="bill-print-root"
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: #fff !important;
          }

          /* Remove the rest of the app from layout (not just hide it) */
          body > *:not(#bill-print-root) { display: none !important; }

          /* Neutralise modal wrappers: no centering, no fixed, no stretching */
          #bill-print-root,
          #bill-print-root .bill-scroll {
            display: block !important;
            position: static !important;
            inset: auto !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            max-width: none !important;
            width: auto !important;
            overflow: visible !important;
            background: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            align-items: flex-start !important;
            justify-content: flex-start !important;
          }

          #bill-content {
            position: static !important;
            width: 100% !important;
            max-width: 72mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            border: none !important;
            box-shadow: none !important;
          }

          /* Thermal = pure black & white */
          #bill-content * {
            color: #000 !important;
            background: transparent !important;
            border-color: #666 !important;
          }

          .no-print { display: none !important; }
        }
      `}</style>

      <div
        className="bill-scroll bg-white text-black rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >

        <div id="bill-content" style={{
          width: '72mm', margin: '0',
          fontFamily: "'Noto Sans Sinhala', 'Courier New', monospace",
          fontSize: '8pt', color: '#000',
          padding: '0', boxSizing: 'border-box',
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
            ['ගෙවීම', paymentStatus === 'paid' ? 'ගෙවා ඇත' : 'ගෙවා නැත'],
          ].map(([label, value]) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', gap: '2mm',
              fontSize: '7.5pt', lineHeight: 1.1, padding: '0',
            }}>
              <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{label}:</span>
              <span style={{ fontWeight: label === 'ගෙවීම' ? 'bold' : 'normal', textAlign: 'right' }}>{value}</span>
            </div>
          ))}

          <div style={{ borderTop: '2px solid #000', margin: '1.5mm 0' }} />

          {/* ── COLUMN HEADER ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: cols,
            background: '#f0f0f0',
            border: '1px solid #ccc',
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
          {categories.map(category => {
            const categoryItems = billItems.filter(item => item.category_id === category.id);
            if (categoryItems.length === 0) return null;

            const morningReturnQty = categoryItems.reduce((sum, item) => sum + item.morning_returned_qty, 0);
            const eveningReturnQty = categoryItems.reduce((sum, item) => sum + item.returned_qty, 0);
            const categoryMorningQty = categoryItems.reduce((sum, item) => sum + item.morning_qty, 0);
            const categoryEveningQty = categoryItems.reduce((sum, item) => sum + item.evening_qty, 0);
            const categorySold = categoryItems.reduce((sum, item) => sum + item.sold, 0);
            const categoryCost = categoryItems.reduce((sum, item) => sum + item.cost, 0);
            const categorySell = categoryItems.reduce((sum, item) => sum + item.sell, 0);

            return (
              <div key={category.id}>
                <div style={{ borderTop: '2px solid #000', margin: '1px 0' }} />
                {categoryItems.map(item => (
                  <div key={item.id} style={{ borderBottom: '1px dotted #999', padding: '1px 0' }}>
                    <div style={{
                      fontSize: '8pt', fontWeight: 'bold', lineHeight: '1.1',
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
                      letterSpacing: '0',
                      fontFamily: 'Helvetica, Arial, sans-serif',
                      fontSize: '8.5pt',
                    }}>
                      <span style={numCell('center', false, true)}>{item.morning_qty || '-'}</span>
                      <span style={numCell('center')} />
                      <span style={numCell()}>{item.evening_qty || '-'}</span>
                      <span style={numCell('center')} />
                      <span style={numCell('center', item.sold < 0)}>{item.sold !== 0 ? item.sold : '-'}</span>
                      <span style={{ ...numCell('right', item.cost < 0), fontWeight: 'bold' }}>{item.cost !== 0 ? Math.round(item.cost) : '-'}</span>
                      <span style={{ ...numCell('right', item.sell < 0), fontWeight: 'bold' }}>{item.sell !== 0 ? Math.round(item.sell) : '-'}</span>
                    </div>
                  </div>
                ))}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: cols,
                  borderLeft: '1px solid #999',
                  borderRight: '1px solid #999',
                  borderTop: '1px solid #777',
                  borderBottom: '2px solid #000',
                  background: '#f5f5f5',
                  fontWeight: 'bold',
                }}>
                  <span style={numCell('center')}>{categoryMorningQty || '-'}</span>
                  <span style={{ ...numCell('center', morningReturnQty > 0), borderRight: '1px solid #ccc' }}>
                    {morningReturnQty || '-'}
                  </span>
                  <span style={numCell('center')}>{categoryEveningQty || '-'}</span>
                  <span style={{ ...numCell('center', eveningReturnQty > 0), borderRight: '1px solid #ccc' }}>
                    {eveningReturnQty || '-'}
                  </span>
                  <span style={numCell('center', categorySold < 0)}>{categorySold || '-'}</span>
                  <span style={{ ...numCell('right', categoryCost < 0), fontWeight: 'bold' }}>
                    {categoryCost !== 0 ? Math.round(categoryCost) : '-'}
                  </span>
                  <span style={{ ...numCell('right', categorySell < 0), fontWeight: 'bold' }}>
                    {categorySell !== 0 ? Math.round(categorySell) : '-'}
                  </span>
                </div>
              </div>
            );
          })}

          {/* ── TOTALS SECTION ── */}
          <div style={{ borderTop: '2px solid #000', marginTop: '1px', paddingTop: '2px' }}>

            <div style={{ border: '2px solid #000', borderRadius: '3px', overflow: 'hidden' }}>
              {/* Totals grid — raw, unadjusted sums straight from items */}
              <div style={{
                display: 'grid', gridTemplateColumns: cols,
                borderBottom: '1px solid #ccc', background: '#fafafa',
              }}>
                <span style={{
                  fontSize: '7pt', lineHeight: 1, color: '#555', padding: '0 3px',
                  borderRight: '1px solid #ccc',
                }}>
                  එකතු
                </span>
                <span style={{
                  fontSize: '9pt', lineHeight: 1, fontWeight: 900, textAlign: 'right',
                  fontFamily: 'Arial Black, Arial, sans-serif',
                  padding: '0 2px', borderRight: '1px solid #ccc',
                  color: morningReturnedCost > 0 ? '#c00' : '#666',
                }}>
                  {morningReturnedCost > 0 ? Math.round(morningReturnedCost) : '-'}
                </span>
                <span style={{ borderRight: '1px solid #ccc' }} />
                <span style={{
                  fontSize: '9pt', lineHeight: 1, fontWeight: 900, textAlign: 'right',
                  fontFamily: 'Arial Black, Arial, sans-serif',
                  padding: '0 2px', borderRight: '1px solid #ccc',
                  color: eveningReturnedCost > 0 ? '#c00' : '#666',
                }}>
                  {eveningReturnedCost > 0 ? Math.round(eveningReturnedCost) : '-'}
                </span>
                <span style={{ borderRight: '1px solid #ccc' }} />
                <span style={{
                  fontSize: '9pt', lineHeight: 1, fontWeight: 900, textAlign: 'right',
                  fontFamily: 'Arial Black, Arial, sans-serif',
                  padding: '0 2px', borderRight: '1px solid #ccc',
                  color: grandCost < 0 ? '#c00' : '#666',
                }}>
                  {Math.round(grandCost)}
                </span>
                <span style={{
                  fontSize: '9pt', lineHeight: 1, fontWeight: 900, textAlign: 'right',
                  fontFamily: 'Arial Black, Arial, sans-serif',
                  padding: '0 2px',
                  color: grandSell < 0 ? '#c00' : undefined,
                }}>
                  {Math.round(grandSell)}
                </span>
              </div>

              {billRows.map((row, i) => {
                const amount = Number(row.qty) * Number(row.amount);
                return (
                  <div key={row.id ?? i} style={{
                    display: 'grid',
                    gridTemplateColumns: cols,
                    borderBottom: '1px dotted #aaa',
                    background: '#fff',
                  }}>
                    <span style={{
                      gridColumn: '1 / span 5',
                      fontSize: '7pt',
                      lineHeight: 1,
                      fontWeight: 'bold',
                      padding: '0 3px',
                      borderRight: '1px solid #ddd',
                    }}>
                      {row.description}
                    </span>
                    <span style={{
                      borderRight: '1px solid #ddd',
                      background: extraSource === 'commission' ? '#fffaf0' : undefined,
                    }}>
                      {extraSource === 'commission' && (
                        <span style={{
                          display: 'block',
                          fontSize: '9pt',
                          lineHeight: 1,
                          fontWeight: 900,
                          fontFamily: 'Arial Black, Arial, sans-serif',
                          textAlign: 'right',
                          padding: '0 2px',
                          color: amount < 0 ? '#c00' : '#b45309',
                        }}>
                          {Math.round(amount)}
                        </span>
                      )}
                    </span>
                    <span style={{
                      background: extraSource === 'sale' ? '#f0fdf4' : undefined,
                    }}>
                      {extraSource === 'sale' && (
                        <span style={{
                          display: 'block',
                          fontSize: '9pt',
                          lineHeight: 1,
                          fontWeight: 900,
                          fontFamily: 'Arial Black, Arial, sans-serif',
                          textAlign: 'right',
                          padding: '0 2px',
                          color: amount < 0 ? '#c00' : '#15803d',
                        }}>
                          {Math.round(amount)}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}

              {billRows.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: cols,
                  borderBottom: '1px solid #ccc',
                  background: '#f5f5f5',
                }}>
                  <span style={{
                    gridColumn: '1 / span 5',
                    fontSize: '7pt',
                    lineHeight: 1,
                    fontWeight: 'bold',
                    padding: '0 3px',
                    borderRight: '1px solid #ccc',
                  }}>
                    අතිරේක මුළු
                  </span>
                  <span style={{
                    borderRight: '1px solid #ccc',
                    fontSize: '9pt',
                    lineHeight: 1,
                    fontWeight: 900,
                    fontFamily: 'Arial Black, Arial, sans-serif',
                    textAlign: 'right',
                    padding: '0 2px',
                    color: extraSource === 'commission' && billRowsTotal < 0 ? '#c00' : '#b45309',
                  }}>
                    {extraSource === 'commission' ? `(${Math.round(billRowsTotal)})` : ''}
                  </span>
                  <span style={{
                    fontSize: '9pt',
                    lineHeight: 1,
                    fontWeight: 900,
                    fontFamily: 'Arial Black, Arial, sans-serif',
                    textAlign: 'right',
                    padding: '0 2px',
                    color: extraSource === 'sale' && billRowsTotal < 0 ? '#c00' : '#15803d',
                  }}>
                    {extraSource === 'sale' ? `(${Math.round(billRowsTotal)})` : ''}
                  </span>
                </div>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: cols,
                background: extraSource === 'sale' ? '#f0fdf4' : '#fffaf0',
              }}>
                <span style={{
                  gridColumn: '1 / span 5',
                  fontSize: '10pt',
                  lineHeight: 1,
                  fontWeight: 900,
                  padding: '0 3px',
                  borderRight: '1px solid #ccc',
                }}>
                  ගෙවිය යුතු මුදල
                </span>
                <span style={{
                  fontSize: '12pt',
                  lineHeight: 1,
                  fontWeight: 900,
                  fontFamily: 'Arial Black, Arial, sans-serif',
                  textAlign: 'right',
                  padding: '0 2px',
                  color: extraSource === 'commission' && adjustedCost < 0 ? '#c00' : '#b45309',
                }}>
                  {extraSource === 'commission' && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '10mm',
                      height: '6mm',
                      padding: '0 1.5mm',
                      boxSizing: 'border-box',
                      border: '2px solid #000',
                      borderRadius: '50%',
                    }}>
                      {Math.round(adjustedCost)}
                    </span>
                  )}
                </span>
                <span style={{
                  fontSize: '12pt',
                  lineHeight: 1,
                  fontWeight: 900,
                  fontFamily: 'Arial Black, Arial, sans-serif',
                  textAlign: 'right',
                  padding: '0 2px',
                  color: extraSource === 'sale' && adjustedSell < 0 ? '#c00' : '#15803d',
                }}>
                  {extraSource === 'sale' && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '10mm',
                      height: '6mm',
                      padding: '0 1.5mm',
                      boxSizing: 'border-box',
                      border: '2px solid #000',
                      borderRadius: '50%',
                    }}>
                      {Math.round(adjustedSell)}
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* ── FINAL BALANCE ── */}
            <div style={{
              border: '2.5px solid #000',
              borderRadius: '3px',
              margin: '0.5mm 0',
              padding: '0.5mm 1mm',
              textAlign: 'center',
              background: '#f5f5f5',
            }}>
              <div style={{
                fontSize: '7pt', fontWeight: 'bold', letterSpacing: '0.3px',
                color: '#333', marginBottom: '0',
              }}>
                අවසාන කොමිස් (රු.)
              </div>
              <div style={{
                fontSize: '16pt', fontWeight: 900, lineHeight: 1,
                fontFamily: 'Arial Black, Arial, sans-serif',
                color: finalBalance >= 0 ? '#000' : '#c00',
              }}>
                {Math.round(finalBalance)}
              </div>
            </div>
          </div>

          {/* ── DETACHABLE TOTALS SLIP ── */}
          <div style={{
            marginTop: '3mm',
            paddingTop: '2mm',
            borderTop: '2px dashed #000',
          }}>
            <div style={{
              textAlign: 'center',
              fontSize: '7pt',
              fontWeight: 'bold',
              letterSpacing: '1px',
              marginBottom: '1mm',
            }}>
              ✂ මෙතැනින් වෙන් කරන්න ✂
            </div>
            <div style={{ display: 'flex', gap: '2mm' }}>
              {bigTotalBox(
                'පිරිවැය (කොමිස්)',
                adjustedCost,
                '#b45309',
                extraSource === 'commission' && billRowsTotal !== 0 ? `+අතිරේක ${Math.round(billRowsTotal)}` : undefined,
                extraSource === 'commission'
              )}
              {bigTotalBox(
                'විකිණුම (පඩි)',
                adjustedSell,
                '#15803d',
                extraSource === 'sale' && billRowsTotal !== 0 ? `${billRowsTotal > 0 ? '+' : '−'}අතිරේක ${Math.round(Math.abs(billRowsTotal))}` : undefined,
                extraSource === 'sale'
              )}
            </div>
            <div style={{ fontSize: '8pt', fontWeight: 'bold', margin: '2mm 0 1mm' }}>
              අතිරේක ({extraSource === 'sale' ? 'විකිණුම (පඩි) වෙතින්' : 'පිරිවැය (කොමිස්) වෙතට'}):
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              border: '1px solid #000',
              background: '#f0f0f0',
            }}>
              <span style={{ fontSize: '7pt', fontWeight: 'bold', padding: '1px 3px', borderRight: '1px solid #000' }}>
                විස්තරය
              </span>
              <span style={{ fontSize: '7pt', fontWeight: 'bold', textAlign: 'right', padding: '1px 3px' }}>
                මුදල
              </span>
            </div>
            {billRows.map((row, i) => {
              const amount = Number(row.qty) * Number(row.amount);
              return (
                <div key={`detachable-${row.id ?? i}`} style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr',
                  borderLeft: '1px solid #ddd',
                  borderRight: '1px solid #ddd',
                  borderBottom: '1px dotted #aaa',
                  padding: '1px 0',
                }}>
                  <span style={{ fontSize: '8pt', fontWeight: 'bold', padding: '0 3px', borderRight: '1px solid #ddd' }}>
                    {row.description}
                  </span>
                  <span style={{ fontSize: '8pt', fontWeight: 'bold', textAlign: 'right', padding: '0 3px', color: amount < 0 ? '#c00' : undefined }}>
                    {Math.round(amount)}
                  </span>
                </div>
              );
            })}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '8pt',
              fontWeight: 'bold',
              borderTop: '2px solid #000',
              padding: '1px 0',
              color: billRowsTotal < 0 ? '#c00' : undefined,
            }}>
              <span>අතිරේක මුළු:</span>
              <span>රු. {Math.round(billRowsTotal)}</span>
            </div>
            <div style={{ borderTop: '2px dashed #000', marginTop: '2mm' }} />
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
    </div>,
    document.body
  );
}