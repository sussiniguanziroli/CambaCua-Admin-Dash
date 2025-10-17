import React from 'react';

const ResumenVenta = ({ saleData, onReset }) => {
    const totalPaid = saleData.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalSurcharges = saleData.payments.reduce((acc, p) => acc + (p.surchargeAmount || 0), 0);

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
            doc.text('Recibo de Venta', margin, y);
            y += 30;

            doc.setFontSize(12);
            const meta = [
                [`ID Venta:`, saleData.id || 'N/A'],
                [`Cliente:`, saleData.tutor?.name || 'Cliente Genérico'],
            ];
            if (saleData.patient?.name) meta.push(['Paciente:', saleData.patient.name]);
            meta.push(['Fecha:', saleData.createdAt?.toDate ? saleData.createdAt.toDate().toLocaleString('es-AR') : new Date().toLocaleString('es-AR')]);
            
            meta.forEach(([k, v]) => { doc.text(`${k} ${v}`, margin, y); y += 18; });
            y += 10;
            
            const items = (saleData.cart || []).map(it => [
                String(it.quantity ?? 1), 
                it.name, 
                `$${(it.price * (it.isDoseable ? 1 : it.quantity)).toFixed(2)}`
            ]);
            if (items.length > 0) {
                autoTable(doc, { startY: y, head: [['Cant.', 'Item', 'Subtotal']], body: items, margin: { left: margin, right: margin } });
                y = doc.lastAutoTable.finalY + 15;
            }
            
            const payments = (saleData.payments || []).map(p => [p.method || '-', `$${parseFloat(p.amount ?? 0).toFixed(2)}`]);
            if (payments.length > 0) {
                autoTable(doc, { startY: y, head: [['Método', 'Monto Pagado']], body: payments, margin: { left: margin, right: margin } });
                y = doc.lastAutoTable.finalY + 15;
            }

            if ((saleData.debt || 0) > 0) { doc.text(`Deuda Generada: $${saleData.debt.toFixed(2)}`, margin, y); y += 20; }
            doc.setFontSize(14);
            doc.text(`Total Venta: $${(totalPaid + (saleData.debt || 0)).toFixed(2)}`, margin, y);
            
            doc.save(`Recibo_CambaCuaVet_${saleData.id}.pdf`);

        } catch (err) {
            console.error("Error generating PDF:", err);
            alert("No se pudo generar el PDF. Revise la consola para más detalles.");
        }
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
                                {item.isDoseable ? (
                                    <>
                                        <span className="item-name">{item.name} ({item.quantity} {item.unit})</span>
                                        <span className="item-price">${item.price.toFixed(2)}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="item-quantity">{item.quantity}x</span>
                                        <span className="item-name">{item.name}</span>
                                        <span className="item-price">${(item.price * item.quantity).toFixed(2)}</span>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="resumen-section">
                    <div className="summary-row"><span>Tutor:</span><strong>{saleData.tutor?.name || 'Cliente Genérico'}</strong></div>
                    <div className="summary-row"><span>Paciente:</span><strong>{saleData.patient?.name || 'N/A'}</strong></div>
                </div>

                <div className="resumen-section">
                    <div className="summary-row">
                        <span>Pagos Registrados:</span>
                        <div className="payment-details">
                            {saleData.payments.map(p => (<strong key={p.id}>{p.method}{p.cardType ? ` (${p.cardType})` : ''}: ${parseFloat(p.amount).toFixed(2)}</strong>))}
                        </div>
                    </div>
                    {totalSurcharges > 0 && <div className="summary-row surcharge"><span>Recargos:</span><strong>+${totalSurcharges.toFixed(2)}</strong></div>}
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