import React from 'react';

const ResumenVenta = ({ saleData, onReset }) => {
    const totalPaid = saleData.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    return (
        <div className="venta-resumen-container">
            <div className="success-icon">✓</div>
            <h2>¡Venta Finalizada con Éxito!</h2>
             <div className="sale-summary-box">
                <h4>Detalles de la Venta</h4>
                <ul className="summary-item-list">
                    {saleData.cart.map(item => (
                       <li key={item.id} className="summary-item">
                            <div className="item-info">
                               {item.isDoseable ? (
                                    <>
                                        <span className="item-name">{item.name} ({item.quantity} {item.unit})</span>
                                        <span className="item-price">${item.price.toFixed(2)}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="item-quantity">{item.quantity}x</span>
                                        <span className="item-name">{item.name}</span>
                                        <span className="item-price">${item.price.toFixed(2)}</span>
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
                <div className="summary-details">
                    <div className="summary-row"><span>Tutor:</span><strong>{saleData.tutor?.name || 'Cliente Genérico'}</strong></div>
                    <div className="summary-row"><span>Paciente:</span><strong>{saleData.patient?.name || 'N/A'}</strong></div>
                    <div className="summary-row"><span>Pagos Registrados:</span><div className="payment-details">{saleData.payments.map(p => (<strong key={p.id}>{p.method}: ${parseFloat(p.amount).toFixed(2)}</strong>))}</div></div>
                    {saleData.debt > 0 && (<div className="summary-row debt"><span>Deuda Generada:</span><strong>-${saleData.debt.toFixed(2)}</strong></div>)}
                    <div className="summary-total"><span>Total Pagado:</span><strong>${totalPaid.toFixed(2)}</strong></div>
                </div>
            </div>
            <div className="navigator-buttons" style={{justifyContent: 'center'}}>
                <button onClick={onReset} className="btn btn-primary">Realizar Nueva Venta</button>
            </div>
        </div>
    );
};

export default ResumenVenta;