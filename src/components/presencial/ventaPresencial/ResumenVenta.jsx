import React from 'react';

const ResumenVenta = ({ saleData, onReset }) => {
    const totalPaid = saleData.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalSurcharges = saleData.payments.reduce((acc, p) => acc + (p.surchargeAmount || 0), 0);

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
                <button onClick={onReset} className="btn btn-primary">Realizar Nueva Venta</button>
            </div>
        </div>
    );
};

export default ResumenVenta;