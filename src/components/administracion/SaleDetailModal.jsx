import React, { useRef } from 'react';

const FaTimes = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 352 512" height="1.1em" width="1.1em" xmlns="http://www.w3.org/2000/svg"><path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.19 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.19 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path></svg>
);

const SaleDetailModal = ({ sale, onClose }) => {
  const printableRef = useRef(null);
  if (!sale) return null;

  const isDebtPayment = sale.type === 'Cobro Deuda';
  
  const paymentsArray = sale.payments || [];
  const debtPaymentsArray = sale.debtPayments || [];
  const legacyPayments = sale.salePayments || [];
  
  const totalPaid = paymentsArray.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const totalDebtPaid = debtPaymentsArray.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const downloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 40;
      let y = 60;

      doc.setFontSize(22);
      doc.text('CambaCuaVet', margin, y);
      y += 25;
      doc.setFontSize(16);
      doc.text('Recibo', margin, y);
      y += 30;

      doc.setFontSize(12);
      const meta = [
        [`ID Transacción:`, sale.id || 'N/A'],
        [`Tipo:`, sale.type],
        [`Cliente:`, sale.tutorInfo?.name || sale.tutorName || 'N/A'],
      ];
      if (sale.patientInfo?.name) meta.push(['Paciente:', sale.patientInfo.name]);
      meta.push(['Fecha:', sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleString('es-AR') : 'N/A']);
      
      meta.forEach(([k, v]) => { doc.text(`${k} ${v}`, margin, y); y += 18; });
      y += 10;

      if (isDebtPayment) {
        doc.setFontSize(14);
        doc.text(`Pago Recibido:`, margin, y); y += 20;
        doc.setFontSize(12);
        doc.text(`${sale.paymentMethod} — $${(sale.amount || 0).toFixed(2)}`, margin + 10, y); y += 22;
        doc.setFontSize(14);
        doc.text(`Monto Cobrado: $${(sale.amount || 0).toFixed(2)}`, margin, y);
      } else {
        const items = (sale.items || []).map(it => {
            const quantity = it.isDoseable ? `${it.quantity} ${it.unit}` : String(it.quantity ?? 1);
            let name = it.name;
            if (it.discountAmount > 0) {
                name += ` (Dto: -$${it.discountAmount.toFixed(2)})`;
            }
            const price = `$${it.price.toFixed(2)}`;
            return [quantity, name, price];
        });

        if (items.length > 0) {
          autoTable(doc, { startY: y, head: [['Cant.', 'Item', 'Subtotal']], body: items, margin: { left: margin, right: margin } });
          y = doc.lastAutoTable.finalY + 15;
        }
        
        if (paymentsArray.length > 0) {
          doc.setFontSize(14);
          doc.text('Pagos Iniciales:', margin, y); y += 20;
          doc.setFontSize(12);
          
          const initialPayments = paymentsArray.map(p => {
              const paymentDate = p.date?.toDate ? p.date.toDate().toLocaleDateString('es-AR') : '-';
              return [p.method || '-', paymentDate, `$${parseFloat(p.amount ?? 0).toFixed(2)}`];
          });
          
          autoTable(doc, { startY: y, head: [['Método', 'Fecha', 'Monto']], body: initialPayments, margin: { left: margin, right: margin } });
          y = doc.lastAutoTable.finalY + 15;
        }
        
        if (debtPaymentsArray.length > 0) {
          doc.setFontSize(14);
          doc.text('Cobros Posteriores:', margin, y); y += 20;
          doc.setFontSize(12);
          
          const debtPayments = debtPaymentsArray.map(p => {
              const paymentDate = p.date?.toDate ? p.date.toDate().toLocaleDateString('es-AR') : '-';
              return [p.method || '-', paymentDate, `$${parseFloat(p.amount ?? 0).toFixed(2)}`];
          });
          
          autoTable(doc, { startY: y, head: [['Método', 'Fecha', 'Monto']], body: debtPayments, margin: { left: margin, right: margin } });
          y = doc.lastAutoTable.finalY + 15;
        }

        doc.setFontSize(12);
        if (sale.subtotal) {
            doc.text(`Subtotal: $${(sale.subtotal || 0).toFixed(2)}`, margin, y); y += 20;
            if ((sale.discount || 0) > 0) {
                doc.text(`Descuentos: -$${(sale.discount || 0).toFixed(2)}`, margin, y); y += 20;
            }
        }
        
        doc.text(`Total Venta: $${(sale.total ?? 0).toFixed(2)}`, margin, y); y += 20;
        doc.text(`Pagado Inicialmente: $${totalPaid.toFixed(2)}`, margin, y); y += 20;
        if (totalDebtPaid > 0) {
            doc.text(`Cobrado Posteriormente: $${totalDebtPaid.toFixed(2)}`, margin, y); y += 20;
        }
        
        if ((sale.debt || 0) > 0) { 
            doc.text(`Deuda Restante: $${sale.debt.toFixed(2)}`, margin, y); y += 20; 
        }
        
        doc.setFontSize(14);
      }
      
      doc.save(`Recibo_CambaCuaVet_${sale.id}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      const printable = buildPrintableHtml();
      const w = window.open('', '_blank', 'noopener,noreferrer');
      if (!w) return alert('No se pudo abrir la ventana de impresión (bloqueador de popups).');
      w.document.write(printable);
      w.document.close();
      setTimeout(() => { w.print(); }, 500);
    }
  };

  const buildPrintableHtml = () => {
    const style = `<style>body{font-family:Arial,sans-serif;padding:20px;color:#111}h1{font-size:24px;margin:0}h2{font-size:18px;margin-top:2rem;border-bottom:1px solid #ccc;padding-bottom:5px}h3{margin-top:1.5rem}h4{margin-top:1rem;color:#666}table{width:100%;border-collapse:collapse;margin-bottom:12px}th,td{text-align:left;padding:6px;border-bottom:1px solid #ddd}.total-summary p{margin:4px 0;text-align:right}.total-summary .total{font-weight:700;font-size:1.2rem;margin-top:1.5rem}</style>`;
    
    let content;
    if (isDebtPayment) {
        content = `
            <h3>Pago Recibido</h3>
            <table><thead><tr><th>Método</th><th>Monto</th></tr></thead><tbody>
                <tr><td>${sale.paymentMethod}</td><td>$${(sale.amount || 0).toFixed(2)}</td></tr>
            </tbody></table>
            <div class="total-summary"><p class="total">Monto Cobrado: $${(sale.amount || 0).toFixed(2)}</p></div>
        `;
    } else {
        const itemsHtml = (sale.items || []).map(it => {
            const quantity = it.isDoseable ? `${it.quantity} ${it.unit}` : String(it.quantity ?? 1);
            let name = it.name;
            if (it.discountAmount > 0) {
                name += `<br><small>(Orig: $${it.priceBeforeDiscount.toFixed(2)}, Dto: -$${it.discountAmount.toFixed(2)})</small>`;
            }
            return `<tr><td>${quantity}</td><td>${name}</td><td>$${(it.price ?? 0).toFixed(2)}</td></tr>`;
        }).join('') || '<tr><td colspan="3">No hay items</td></tr>';

        const initialPaymentsHtml = paymentsArray.length > 0 
          ? paymentsArray.map(p => {
              const paymentDate = p.date?.toDate ? p.date.toDate().toLocaleDateString('es-AR') : '-';
              return `<tr><td>${p.method}</td><td>${paymentDate}</td><td>$${parseFloat(p.amount ?? 0).toFixed(2)}</td></tr>`;
            }).join('')
          : '<tr><td colspan="3">No se registraron pagos iniciales.</td></tr>';
        
        const debtPaymentsHtml = debtPaymentsArray.length > 0
          ? debtPaymentsArray.map(p => {
              const paymentDate = p.date?.toDate ? p.date.toDate().toLocaleDateString('es-AR') : '-';
              return `<tr><td>${p.method}</td><td>${paymentDate}</td><td>$${parseFloat(p.amount ?? 0).toFixed(2)}</td></tr>`;
            }).join('')
          : '';
        
        content = `
            <h3>Items</h3>
            <table><thead><tr><th>Cant.</th><th>Item</th><th>Subtotal</th></tr></thead><tbody>${itemsHtml}</tbody></table>
            
            <h4>Pagos Iniciales</h4>
            <table><thead><tr><th>Método</th><th>Fecha</th><th>Monto</th></tr></thead><tbody>${initialPaymentsHtml}</tbody></table>
            
            ${debtPaymentsHtml ? `
              <h4>Cobros Posteriores</h4>
              <table><thead><tr><th>Método</th><th>Fecha</th><th>Monto</th></tr></thead><tbody>${debtPaymentsHtml}</tbody></table>
            ` : ''}
            
            <div class="total-summary">
                ${sale.subtotal ? `<p>Subtotal: $${(sale.subtotal || 0).toFixed(2)}</p>` : ''}
                ${(sale.discount || 0) > 0 ? `<p>Descuentos: -$${(sale.discount || 0).toFixed(2)}</p>` : ''}
                <p class="total">Total Venta: $${(sale.total ?? 0).toFixed(2)}</p>
                <p>Pagado Inicialmente: $${totalPaid.toFixed(2)}</p>
                ${totalDebtPaid > 0 ? `<p>Cobrado Posteriormente: $${totalDebtPaid.toFixed(2)}</p>` : ''}
                ${(sale.debt || 0) > 0 ? `<p style="color:#e74c3c;font-weight:600">Deuda Restante: $${sale.debt.toFixed(2)}</p>` : ''}
            </div>
        `;
    }
    
    return `<!doctype html><html><head><meta charset="utf-8"><title>Recibo - CambaCuaVet</title>${style}</head><body>
      <h1>CambaCuaVet</h1>
      <h2>Recibo</h2>
      <p><strong>ID Transacción:</strong> ${sale.id || 'N/A'}</p>
      <p><strong>Tipo:</strong> ${sale.type}</p>
      <p><strong>Cliente:</strong> ${sale.tutorInfo?.name || sale.tutorName || 'N/A'}</p>
      ${sale.patientInfo?.name ? `<p><strong>Paciente:</strong> ${sale.patientInfo.name}</p>` : ''}
      <p><strong>Fecha:</strong> ${sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleString('es-AR') : 'N/A'}</p>
      ${content}
    </body></html>`;
  };

  const subtotal = sale.subtotal || sale.total;
  const totalDiscount = sale.discount || 0;

  return (
    <div className="sale-detail-modal-overlay">
      <div className="sale-detail-modal" ref={printableRef} role="dialog" aria-modal="true">
        <button className="sale-detail-close-btn" onClick={onClose} aria-label="Cerrar"><FaTimes /></button>
        <h3>{isDebtPayment ? 'Detalle de Cobranza' : 'Detalle de la Transacción'}</h3>

        <div className="sale-detail-body">
          <div className="sale-detail-section">
            <p><span>Cliente:</span> <strong>{sale.tutorInfo?.name || sale.tutorName || 'N/A'}</strong></p>
            {sale.patientInfo?.name && <p><span>Paciente:</span> <strong>{sale.patientInfo.name}</strong></p>}
            <p><span>Fecha:</span> <strong>{sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleString('es-AR') : 'N/A'}</strong></p>
          </div>
          {!isDebtPayment && (sale.items || []).length > 0 && (
            <div className="sale-detail-section">
              <h4>Items</h4>
              <ul className="sale-detail-item-list">
                {(sale.items || []).map((item, index) => (
                  <li key={item.id || index}>
                      <div className="item-name-details">
                          {item.isDoseable ? (
                              <span className="item-name">{item.name} ({item.quantity} {item.unit})</span>
                          ) : (
                              <span className="item-name">{item.quantity ?? 1} x {item.name}</span>
                          )}
                          {item.discountAmount > 0 && (
                              <div className="item-discount-info">
                                  <span>Orig: ${item.priceBeforeDiscount.toFixed(2)}</span>
                                  <span>Dto: -${item.discountAmount.toFixed(2)}</span>
                              </div>
                          )}
                      </div>
                      <strong className={`item-price ${item.discountAmount > 0 ? 'is-discounted' : ''}`}>
                          ${(item.price ?? 0).toFixed(2)}
                      </strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="sale-detail-section">
            <h4>{isDebtPayment ? 'Pago Recibido' : 'Pagos'}</h4>
            {isDebtPayment ? (
              <ul className="sale-detail-item-list sale-detail-payments-list">
                <li>
                  <div className="payment-info">
                    <span>{sale.paymentMethod}</span>
                    <span className="payment-date">{sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleDateString('es-AR') : '-'}</span>
                  </div>
                  <strong>${(sale.amount || 0).toFixed(2)}</strong>
                </li>
              </ul>
            ) : (
              <>
                {paymentsArray.length > 0 && (
                  <>
                    <h5 style={{fontSize: '0.9rem', color: '#666', marginTop: '0.5rem'}}>Pagos Iniciales</h5>
                    <ul className="sale-detail-item-list sale-detail-payments-list">
                      {paymentsArray.map((p, index) => (
                        <li key={p.id || index}>
                          <div className="payment-info">
                            <span>{p.method}</span>
                            <span className="payment-date">{p.date?.toDate ? p.date.toDate().toLocaleDateString('es-AR') : '-'}</span>
                          </div>
                          <strong>${parseFloat(p.amount ?? 0).toFixed(2)}</strong>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                
                {debtPaymentsArray.length > 0 && (
                  <>
                    <h5 style={{fontSize: '0.9rem', color: '#666', marginTop: '1rem'}}>Cobros Posteriores</h5>
                    <ul className="sale-detail-item-list sale-detail-payments-list">
                      {debtPaymentsArray.map((p, index) => (
                        <li key={p.id || index}>
                          <div className="payment-info">
                            <span>{p.method}</span>
                            <span className="payment-date">{p.date?.toDate ? p.date.toDate().toLocaleDateString('es-AR') : '-'}</span>
                          </div>
                          <strong>${parseFloat(p.amount ?? 0).toFixed(2)}</strong>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                
                {paymentsArray.length === 0 && debtPaymentsArray.length === 0 && legacyPayments.length === 0 && (
                  <p>No se registraron pagos.</p>
                )}
                
                {paymentsArray.length === 0 && debtPaymentsArray.length === 0 && legacyPayments.length > 0 && (
                  <ul className="sale-detail-item-list sale-detail-payments-list">
                    {legacyPayments.map((p, index) => (
                      <li key={p.id || index}>
                        <div className="payment-info">
                          <span>{p.method}</span>
                          <span className="payment-date">{p.date?.toDate ? p.date.toDate().toLocaleDateString('es-AR') : '-'}</span>
                        </div>
                        <strong>${parseFloat(p.amount ?? 0).toFixed(2)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="sale-detail-footer">
          {isDebtPayment ? (
            <p className="sale-detail-total"><span>Monto Cobrado:</span> <strong>${(sale.amount || 0).toFixed(2)}</strong></p>
          ) : (
            <>
              {subtotal && (
                <>
                  <p className="sale-detail-row"><span>Subtotal:</span> <strong>${subtotal.toFixed(2)}</strong></p>
                  {totalDiscount > 0 && (
                    <p className="sale-detail-row discount"><span>Descuentos:</span> <strong>-${totalDiscount.toFixed(2)}</strong></p>
                  )}
                </>
              )}
              <p className="sale-detail-total"><span>Total Venta:</span> <strong>${(sale.total ?? 0).toFixed(2)}</strong></p>
              <p className="sale-detail-row"><span>Pagado Inicialmente:</span> <strong>${totalPaid.toFixed(2)}</strong></p>
              {totalDebtPaid > 0 && (
                <p className="sale-detail-row"><span>Cobrado Posteriormente:</span> <strong>${totalDebtPaid.toFixed(2)}</strong></p>
              )}
              {(sale.debt || 0) > 0 && <p className="sale-detail-row debt"><span>Deuda Restante:</span> <strong>${sale.debt.toFixed(2)}</strong></p>}
            </>
          )}
        </div>
        <div className="sale-detail-actions">
          <button onClick={downloadPDF} className="btn btn-primary">Descargar PDF</button>
          <button onClick={() => { const printable = buildPrintableHtml(); const w = window.open('', '_blank'); w.document.write(printable); w.document.close(); setTimeout(() => w.print(), 250); }} className="btn">Abrir vista imprimible</button>
        </div>
      </div>
    </div>
  );
};

export default SaleDetailModal;