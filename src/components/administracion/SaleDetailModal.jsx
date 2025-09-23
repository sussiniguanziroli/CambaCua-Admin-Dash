import React, { useRef } from 'react';

const FaTimes = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 352 512" height="1.1em" width="1.1em" xmlns="http://www.w3.org/2000/svg"><path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.19 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.19 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path></svg>
);

// Responsive, versatile modal that can generate and download a PDF summary.
// It tries to dynamically import `jspdf` (and autotable) if available. If not,
// it falls back to opening a printable HTML window so the user can print/save as PDF.

const SaleDetailModal = ({ sale, onClose }) => {
  const printableRef = useRef(null);
  if (!sale) return null;

  const buildPlainText = () => {
    const lines = [];
    lines.push('--- Resumen de Transacción ---');
    lines.push(`Tipo: ${sale.type || 'Venta'}`);
    lines.push(`Cliente: ${sale.tutorInfo?.name || sale.tutorName || 'N/A'}`);
    if (sale.patientInfo?.name) lines.push(`Paciente: ${sale.patientInfo.name}`);
    lines.push(`Fecha: ${sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleString('es-AR') : (sale.createdAt || 'N/A')}`);
    lines.push('\nItems:');
    (sale.items || []).forEach((it, i) => {
      const qty = it.quantity ?? 1;
      const price = (it.price ?? 0) * qty;
      lines.push(`${i + 1}. ${qty} x ${it.name} — $${price.toFixed(2)}`);
    });
    lines.push('\nPagos:');
    (sale.payments || []).forEach((p, i) => lines.push(`${i + 1}. ${p.method} — $${parseFloat(p.amount).toFixed(2)}`));
    if ((sale.payments || []).length === 0) lines.push('No se registraron pagos.');
    lines.push('\nTotales:');
    if ((sale.debt || 0) > 0) lines.push(`Deuda Generada: $${sale.debt.toFixed(2)}`);
    lines.push(`Total Venta: $${(sale.total ?? 0).toFixed(2)}`);
    return lines.join('\n');
  };

  const downloadPDF = async () => {
    // Try to use jsPDF for a nicer PDF. If not installed, fallback.
    try {
      const { jsPDF } = await import('jspdf'); // dynamic import - requires jspdf installed in the project
      // try to import autotable if available
      let autoTable = null;
      try { autoTable = (await import('jspdf-autotable')).default; } catch (e) { /* optional */ }

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 40;
      let y = 40;

      doc.setFontSize(14);
      doc.text('Resumen de Transacción', margin, y);
      doc.setFontSize(11);
      y += 20;

      const meta = [
        [`Tipo:`, sale.type || 'Venta'],
        [`Cliente:`, sale.tutorInfo?.name || sale.tutorName || 'N/A'],
      ];
      if (sale.patientInfo?.name) meta.push(['Paciente:', sale.patientInfo.name]);
      meta.push(['Fecha:', sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleString('es-AR') : (sale.createdAt || 'N/A')]);

      meta.forEach(([k, v]) => { doc.text(`${k} ${v}`, margin, y); y += 16; });

      y += 6;
      // Items table (if any)
      const items = (sale.items || []).map(it => [String(it.quantity ?? 1), it.name, `$${((it.price ?? 0) * (it.quantity ?? 1)).toFixed(2)}`]);
      if (items.length > 0 && autoTable) {
        doc.autoTable({ startY: y, head: [['Cant.', 'Item', 'Subtotal']], body: items, margin: { left: margin, right: margin } });
        y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : y + 80;
      } else if (items.length > 0) {
        doc.text('Items:', margin, y); y += 14;
        items.forEach(row => { doc.text(`${row[0]} x ${row[1]} — ${row[2]}`, margin, y); y += 14; });
        y += 6;
      }

      // Payments
      const payments = (sale.payments || []).map(p => [p.method || '-', `$${parseFloat(p.amount ?? 0).toFixed(2)}`]);
      if (payments.length > 0 && autoTable) {
        doc.autoTable({ startY: y, head: [['Método', 'Monto']], body: payments, margin: { left: margin, right: margin } });
        y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : y + 80;
      } else if (payments.length > 0) {
        doc.text('Pagos:', margin, y); y += 14;
        payments.forEach(row => { doc.text(`${row[0]} — ${row[1]}`, margin, y); y += 14; });
        y += 6;
      } else {
        doc.text('No se registraron pagos.', margin, y); y += 16;
      }

      if ((sale.debt || 0) > 0) { doc.text(`Deuda Generada: $${sale.debt.toFixed(2)}`, margin, y); y += 16; }
      doc.text(`Total Venta: $${(sale.total ?? 0).toFixed(2)}`, margin, y);

      // Save the PDF
      const filename = `Resumen_Transaccion_${(sale.id || 'venta')}.pdf`;
      doc.save(filename);
    } catch (err) {
      // Fallback: open printable window with plain HTML (user can Save as PDF)
      console.warn('jspdf no disponible o falló la generación avanzada. Usando fallback de impresión.', err);
      const printable = buildPrintableHtml();
      const w = window.open('', '_blank', 'noopener,noreferrer');
      if (!w) return alert('No se pudo abrir la ventana de impresión (bloqueador de popups).');
      w.document.write(printable);
      w.document.close();
      // Delay needed for some browsers to render before calling print
      setTimeout(() => { w.print(); }, 500);
    }
  };

  const buildPrintableHtml = () => {
    const style = `
      <style>
        body { font-family: Arial, Helvetica, sans-serif; padding: 20px; color: #111 }
        h2 { margin-top: 0 }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px }
        th, td { text-align: left; padding: 6px; border-bottom: 1px solid #ddd }
        .total { font-weight: 700; font-size: 1.1rem }
      </style>
    `;

    const itemsHtml = (sale.items || []).map(it => `<tr><td>${it.quantity ?? 1}</td><td>${it.name}</td><td>$${(((it.price ?? 0) * (it.quantity ?? 1))).toFixed(2)}</td></tr>`).join('') || '<tr><td colspan="3">No hay items</td></tr>';
    const paymentsHtml = (sale.payments || []).map(p => `<tr><td>${p.method}</td><td>$${parseFloat(p.amount ?? 0).toFixed(2)}</td></tr>`).join('') || '<tr><td colspan="2">No hay pagos</td></tr>';

    return `<!doctype html><html><head><meta charset="utf-8"><title>Resumen Transacción</title>${style}</head><body>
      <h2>Resumen de Transacción</h2>
      <p><strong>Tipo:</strong> ${sale.type || 'Venta'}</p>
      <p><strong>Cliente:</strong> ${sale.tutorInfo?.name || sale.tutorName || 'N/A'}</p>
      ${sale.patientInfo?.name ? `<p><strong>Paciente:</strong> ${sale.patientInfo.name}</p>` : ''}
      <p><strong>Fecha:</strong> ${sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleString('es-AR') : (sale.createdAt || 'N/A')}</p>

      <h3>Items</h3>
      <table><thead><tr><th>Cant.</th><th>Item</th><th>Subtotal</th></tr></thead><tbody>${itemsHtml}</tbody></table>

      <h3>Pagos</h3>
      <table><thead><tr><th>Método</th><th>Monto</th></tr></thead><tbody>${paymentsHtml}</tbody></table>

      ${ (sale.debt || 0) > 0 ? `<p class="total">Deuda Generada: $${sale.debt.toFixed(2)}</p>` : '' }
      <p class="total">Total Venta: $${(sale.total ?? 0).toFixed(2)}</p>

    </body></html>`;
  };

  return (
    <div className="sale-detail-modal-overlay">
      <div className="sale-detail-modal" ref={printableRef} role="dialog" aria-modal="true">
        <button className="sale-detail-close-btn" onClick={onClose} aria-label="Cerrar"><FaTimes /></button>
        <h3>Detalle de la Transacción</h3>

        <div className="sale-detail-section">
          <p><span>Cliente:</span> <strong>{sale.tutorInfo?.name || 'N/A'}</strong></p>
          {sale.patientInfo?.name && <p><span>Paciente:</span> <strong>{sale.patientInfo.name}</strong></p>}
          <p><span>Fecha:</span> <strong>{sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleString('es-AR') : (sale.createdAt || 'N/A')}</strong></p>
        </div>

        { (sale.items || []).length > 0 && (
          <div className="sale-detail-section">
            <h4>Items</h4>
            <ul className="sale-detail-item-list">
              {(sale.items || []).map((item, index) => (
                <li key={item.id || index}><span>{item.quantity ?? 1} x {item.name}</span><strong>${((item.price ?? 0) * (item.quantity ?? 1)).toFixed(2)}</strong></li>
              ))}
            </ul>
          </div>
        )}

        <div className="sale-detail-section">
          <h4>Pagos</h4>
          <ul className="sale-detail-item-list">
            {(sale.payments || []).map((p, index) => (
              <li key={index}><span>{p.method}</span><strong>${parseFloat(p.amount ?? 0).toFixed(2)}</strong></li>
            ))}
            {(sale.payments || []).length === 0 && <li>No se registraron pagos.</li>}
          </ul>
        </div>

        <div className="sale-detail-footer">
          {(sale.debt || 0) > 0 && <p className="sale-detail-debt"><span>Deuda Generada:</span> <strong>${sale.debt.toFixed(2)}</strong></p>}
          <p className="sale-detail-total"><span>Total Venta:</span> <strong>${(sale.total ?? 0).toFixed(2)}</strong></p>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button onClick={downloadPDF} className="btn btn-primary">Descargar PDF</button>
          <button onClick={() => { const printable = buildPrintableHtml(); const w = window.open('', '_blank'); w.document.write(printable); w.document.close(); }} className="btn">Abrir vista imprimible</button>
        </div>
      </div>
    </div>
  );
};

export default SaleDetailModal;
