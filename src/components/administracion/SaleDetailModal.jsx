import React, { useRef } from 'react';

const FaTimes = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 352 512" height="1.1em" width="1.1em" xmlns="http://www.w3.org/2000/svg"><path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.19 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.19 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path></svg>
);

const SaleDetailModal = ({ sale, onClose }) => {
  const printableRef = useRef(null);
  if (!sale) return null;

  const isDebtPayment = sale.type === 'Cobro Deuda';

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
        const items = (sale.items || []).map(it => [String(it.quantity ?? 1), it.name, `$${((it.price ?? 0) * (it.quantity ?? 1)).toFixed(2)}`]);
        if (items.length > 0) {
          autoTable(doc, { startY: y, head: [['Cant.', 'Item', 'Subtotal']], body: items, margin: { left: margin, right: margin } });
          y = doc.lastAutoTable.finalY + 15;
        }
        
        const payments = (sale.payments || []).map(p => [p.method || '-', `$${parseFloat(p.amount ?? 0).toFixed(2)}`]);
        if (payments.length > 0) {
          autoTable(doc, { startY: y, head: [['Método', 'Monto']], body: payments, margin: { left: margin, right: margin } });
          y = doc.lastAutoTable.finalY + 15;
        }

        if ((sale.debt || 0) > 0) { doc.text(`Deuda Generada: $${sale.debt.toFixed(2)}`, margin, y); y += 20; }
        doc.setFontSize(14);
        doc.text(`Total Venta: $${(sale.total ?? 0).toFixed(2)}`, margin, y);
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
    const style = `<style>body{font-family:Arial,sans-serif;padding:20px;color:#111}h1{font-size:24px;margin:0}h2{font-size:18px;margin-top:2rem;border-bottom:1px solid #ccc;padding-bottom:5px}h3{margin-top:1.5rem}table{width:100%;border-collapse:collapse;margin-bottom:12px}th,td{text-align:left;padding:6px;border-bottom:1px solid #ddd}.total{font-weight:700;font-size:1.2rem;margin-top:1.5rem}</style>`;
    
    let content;
    if (isDebtPayment) {
        content = `
            <h3>Pago Recibido</h3>
            <table><thead><tr><th>Método</th><th>Monto</th></tr></thead><tbody>
                <tr><td>${sale.paymentMethod}</td><td>$${(sale.amount || 0).toFixed(2)}</td></tr>
            </tbody></table>
            <p class="total">Monto Cobrado: $${(sale.amount || 0).toFixed(2)}</p>
        `;
    } else {
        const itemsHtml = (sale.items || []).map(it => `<tr><td>${it.quantity ?? 1}</td><td>${it.name}</td><td>$${((it.price ?? 0) * (it.quantity ?? 1)).toFixed(2)}</td></tr>`).join('') || '<tr><td colspan="3">No hay items</td></tr>';
        const paymentsHtml = (sale.payments || []).map(p => `<tr><td>${p.method}</td><td>$${parseFloat(p.amount ?? 0).toFixed(2)}</td></tr>`).join('') || '<tr><td colspan="2">No hay pagos</td></tr>';
        content = `
            <h3>Items</h3>
            <table><thead><tr><th>Cant.</th><th>Item</th><th>Subtotal</th></tr></thead><tbody>${itemsHtml}</tbody></table>
            <h3>Pagos</h3>
            <table><thead><tr><th>Método</th><th>Monto</th></tr></thead><tbody>${paymentsHtml}</tbody></table>
            ${(sale.debt || 0) > 0 ? `<p class="total">Deuda Generada: $${sale.debt.toFixed(2)}</p>` : ''}
            <p class="total">Total Venta: $${(sale.total ?? 0).toFixed(2)}</p>
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

  return (
    <div className="sale-detail-modal-overlay">
      <div className="sale-detail-modal" ref={printableRef} role="dialog" aria-modal="true">
        <button className="sale-detail-close-btn" onClick={onClose} aria-label="Cerrar"><FaTimes /></button>
        <h3>{isDebtPayment ? 'Detalle de Cobranza' : 'Detalle de la Transacción'}</h3>
        <div className="sale-detail-section">
          <p><span>Cliente:</span> <strong>{sale.tutorInfo?.name || sale.tutorName || 'N/A'}</strong></p>
          {sale.patientInfo?.name && <p><span>Paciente:</span> <strong>{sale.patientInfo.name}</strong></p>}
          <p><span>Fecha:</span> <strong>{sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleString('es-AR') : 'N/A'}</strong></p>
        </div>
        {!isDebtPayment && (sale.items || []).length > 0 && (
          <div className="sale-detail-section">
            <h4>Items</h4>
            <ul className="sale-detail-item-list">
              {(sale.items || []).map((item, index) => (<li key={item.id || index}><span>{item.quantity ?? 1} x {item.name}</span><strong>${((item.price ?? 0) * (item.quantity ?? 1)).toFixed(2)}</strong></li>))}
            </ul>
          </div>
        )}
        <div className="sale-detail-section">
          <h4>{isDebtPayment ? 'Pago Recibido' : 'Pagos'}</h4>
          <ul className="sale-detail-item-list">
            {isDebtPayment ? (
                <li><span>{sale.paymentMethod}</span><strong>${(sale.amount || 0).toFixed(2)}</strong></li>
            ) : (
                (sale.payments || []).length > 0 
                ? sale.payments.map((p, index) => (<li key={p.id || index}><span>{p.method}</span><strong>${parseFloat(p.amount ?? 0).toFixed(2)}</strong></li>))
                : <li>No se registraron pagos.</li>
            )}
          </ul>
        </div>
        <div className="sale-detail-footer">
          {isDebtPayment ? (
            <p className="sale-detail-total"><span>Monto Cobrado:</span> <strong>${(sale.amount || 0).toFixed(2)}</strong></p>
          ) : (
            <>
              {(sale.debt || 0) > 0 && <p className="sale-detail-debt"><span>Deuda Generada:</span> <strong>${sale.debt.toFixed(2)}</strong></p>}
              <p className="sale-detail-total"><span>Total Venta:</span> <strong>${(sale.total ?? 0).toFixed(2)}</strong></p>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button onClick={downloadPDF} className="btn btn-primary">Descargar PDF</button>
          <button onClick={() => { const printable = buildPrintableHtml(); const w = window.open('', '_blank'); w.document.write(printable); w.document.close(); setTimeout(() => w.print(), 250); }} className="btn">Abrir vista imprimible</button>
        </div>
      </div>
    </div>
  );
};

export default SaleDetailModal;