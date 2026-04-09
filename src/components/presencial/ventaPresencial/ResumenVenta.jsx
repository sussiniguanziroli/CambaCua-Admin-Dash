// ResumenVenta.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const ResumenVenta = ({ saleData, onReset }) => {
    const totalPaid = saleData.payments.filter(p => !p.isVuelto).reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const vuelto = saleData.payments.filter(p => p.isVuelto).reduce((sum, p) => sum + Math.abs(parseFloat(p.amount)), 0);
    const totalSurcharges = saleData.payments.reduce((acc, p) => acc + (p.surchargeAmount || 0), 0);
    const subtotal = saleData.subtotal || 0;
    const totalDiscount = saleData.discount || 0;

    const downloadPDF = async () => {
        try {
            const { jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF({ unit: 'pt', format: 'a4' });
            const margin = 40;
            let y = 60;
            doc.setFontSize(22); doc.text('CambaCuaVet', margin, y); y += 25;
            doc.setFontSize(16); doc.text('Recibo de Venta', margin, y); y += 30;
            doc.setFontSize(12);
            const meta = [
                ['ID Venta:', saleData.id || 'N/A'],
                ['Cliente:', saleData.tutor?.name || 'Cliente Genérico'],
            ];
            if (saleData.patients?.length > 0) meta.push(['Pacientes:', saleData.patients.map(p => p.name).join(', ')]);
            meta.push(['Fecha:', saleData.createdAt?.toDate ? saleData.createdAt.toDate().toLocaleString('es-AR') : new Date().toLocaleString('es-AR')]);
            meta.forEach(([k, v]) => { doc.text(`${k} ${v}`, margin, y); y += 18; }); y += 10;
            const items = (saleData.cart || []).map(it => {
                const quantity = it.isDoseable ? `${it.quantity} ${it.unit}` : String(it.quantity ?? 1);
                let name = it.name;
                if (it.discountAmount > 0) name += ` (Dto: -$${it.discountAmount.toFixed(2)})`;
                return [quantity, name, `$${it.price.toFixed(2)}`];
            });
            if (items.length > 0) { autoTable(doc, { startY: y, head: [['Cant.', 'Item', 'Subtotal']], body: items, margin: { left: margin, right: margin } }); y = doc.lastAutoTable.finalY + 15; }
            doc.setFontSize(12);
            doc.text(`Subtotal: $${subtotal.toFixed(2)}`, margin, y); y += 20;
            if (totalDiscount > 0) { doc.text(`Descuentos: -$${totalDiscount.toFixed(2)}`, margin, y); y += 20; }
            const paymentsRows = (saleData.payments || []).map(p => [p.method || '-', `$${parseFloat(p.amount ?? 0).toFixed(2)}`]);
            if (paymentsRows.length > 0) { autoTable(doc, { startY: y, head: [['Método', 'Monto Pagado']], body: paymentsRows, margin: { left: margin, right: margin } }); y = doc.lastAutoTable.finalY + 15; }
            if ((saleData.debt || 0) > 0) { doc.text(`Deuda Generada: $${saleData.debt.toFixed(2)}`, margin, y); y += 20; }
            doc.setFontSize(14); doc.text(`Total Venta: $${saleData.total.toFixed(2)}`, margin, y);
            doc.save(`Recibo_CambaCuaVet_${saleData.id}.pdf`);
        } catch (err) { console.error(err); alert('No se pudo generar el PDF.'); }
    };

    return (
        <div className="resumen-venta-container">
            <div className="resumen-header">
                <div className="success-icon">✓</div>
                <h2>¡Venta Finalizada con Éxito!</h2>
            </div>

            <div className="resumen-box">
                <h4 className="resumen-title">Detalles de la Venta</h4>

                <div className="resumen-section">
                    <ul className="resumen-item-list">
                        {saleData.cart.map(item => (
                            <li key={item.id} className="resumen-item">
                                <div className="item-info">
                                    <div className="item-name-details">
                                        {item.isDoseable ? (
                                            <span className="item-name">{item.name} ({item.quantity} {item.unit})</span>
                                        ) : (
                                            <><span className="item-quantity">{item.quantity}x</span><span className="item-name">{item.name}</span></>
                                        )}
                                        {item.discountAmount > 0 && (
                                            <div className="item-discount-info">
                                                <span>Orig: ${item.priceBeforeDiscount.toFixed(2)}</span>
                                                <span>Dto: -${item.discountAmount.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <span className={`item-price ${item.discountAmount > 0 ? 'is-discounted' : ''}`}>
                                        ${item.price.toFixed(2)}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="resumen-section">
                    <div className="summary-row">
                        <span>Tutor:</span>
                        <strong>
                            {saleData.tutor?.id ? (
                                <Link to={`/admin/tutor-profile/${saleData.tutor.id}`} target="_blank" rel="noopener noreferrer" className="resumen-link">
                                    {saleData.tutor.name}
                                </Link>
                            ) : (saleData.tutor?.name || 'Cliente Genérico')}
                        </strong>
                    </div>
                    {saleData.patients?.length > 0 && (
                        <div className="summary-row">
                            <span>Paciente{saleData.patients.length !== 1 ? 's' : ''}:</span>
                            <div className="resumen-patients-list">
                                {saleData.patients.map(p => (
                                    <Link key={p.id} to={`/admin/paciente-profile/${p.id}`} target="_blank" rel="noopener noreferrer" className="resumen-patient-chip">
                                        {p.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="resumen-section">
                    <div className="summary-row"><span>Subtotal:</span><strong>${subtotal.toFixed(2)}</strong></div>
                    {totalDiscount > 0 && <div className="summary-row discount"><span>Descuentos:</span><strong>-${totalDiscount.toFixed(2)}</strong></div>}
                    {totalSurcharges > 0 && <div className="summary-row surcharge"><span>Recargos:</span><strong>+${totalSurcharges.toFixed(2)}</strong></div>}
                    <div className="summary-row">
                        <span>Pagos Registrados:</span>
                        <div className="payment-details">
                            {saleData.payments.filter(p => !p.isVuelto).map(p => (
                                <strong key={p.id}>{p.method}{p.cardType ? ` (${p.cardType})` : ''}: ${parseFloat(p.amount).toFixed(2)}</strong>
                            ))}
                        </div>
                    </div>
                    {vuelto > 0 && <div className="summary-row"><span>Vuelto:</span><strong>${vuelto.toFixed(2)}</strong></div>}
                    {saleData.debt > 0 && <div className="summary-row debt"><span>Deuda Generada:</span><strong>-${saleData.debt.toFixed(2)}</strong></div>}
                </div>

                <div className="resumen-total-section">
                    <div className="summary-total"><span>Total Abonado:</span><strong>${totalPaid.toFixed(2)}</strong></div>
                </div>
            </div>

            <div className="resumen-actions">
                <button onClick={downloadPDF} className="btn btn-secondary">Descargar PDF</button>
                <button onClick={onReset} className="btn btn-primary">Realizar Nueva Venta</button>
            </div>
        </div>
    );
};

export default ResumenVenta;