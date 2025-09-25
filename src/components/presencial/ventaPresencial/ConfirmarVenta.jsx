import React from 'react';

const ConfirmarVenta = ({ saleData, onConfirm, prevStep, isSubmitting, onToggleClinicalHistory }) => {
    const hasClinicallyRelevantItems = saleData.cart.some(item => item.source === 'presential');

    return (
        <div className="confirmar-venta-container">
            <h2>Paso 5: Confirmar Venta</h2>
            <div className="sale-summary-box">
                <h4>Resumen del Pedido</h4>
                <ul className="summary-item-list">
                    {saleData.cart.map(item => (
                        <li key={item.id} className="summary-item">
                            <div className="item-info">
                                <span className="item-quantity">{item.quantity}x</span>
                                <span className="item-name">{item.name || item.nombre}</span>
                                <span className="item-price">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                            {item.source === 'presential' && saleData.patient && (
                                <div className="clinical-history-toggle">
                                    <input type="checkbox" id={`ch-${item.id}`} checked={saleData.clinicalHistoryItems.includes(item.id)} onChange={() => onToggleClinicalHistory(item.id)}/>
                                    <label htmlFor={`ch-${item.id}`}>Añadir a H.C.</label>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
                {hasClinicallyRelevantItems && saleData.patient && (<p className="clinical-history-info">Seleccione los items a registrar en la historia clínica.</p>)}
                <div className="summary-details">
                    <div className="summary-row"><span>Tutor:</span><strong>{saleData.tutor?.name || 'Cliente Genérico'}</strong></div>
                    <div className="summary-row"><span>Paciente:</span><strong>{saleData.patient?.name || 'N/A'}</strong></div>
                    <div className="summary-row">
                        <span>Pagos:</span>
                        <div className="payment-details">
                            {saleData.payments.map(p => (<strong key={p.id}>{p.method}: ${parseFloat(p.amount).toFixed(2)}</strong>))}
                        </div>
                    </div>
                    {saleData.debt > 0 && (<div className="summary-row debt"><span>Deuda Generada:</span><strong>-${saleData.debt.toFixed(2)}</strong></div>)}
                    <div className="summary-total"><span>Total Venta:</span><strong>${saleData.total.toFixed(2)}</strong></div>
                </div>
            </div>
            <div className="navigator-buttons">
                <button onClick={prevStep} className="btn btn-secondary">Anterior</button>
                <button onClick={onConfirm} className="btn btn-confirm" disabled={isSubmitting}>
                    {isSubmitting ? 'Procesando...' : 'Siguiente'}
                </button>
            </div>
        </div>
    );
};

export default ConfirmarVenta;