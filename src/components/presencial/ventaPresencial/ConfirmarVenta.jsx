import React from 'react';

const ConfirmarVenta = ({ saleData, onConfirm, prevStep, isSubmitting }) => {
    return (
        <div className="confirmar-venta">
            <h2>Paso 5: Confirmar Venta</h2>
            <div className="sale-summary-box">
                <h4>Resumen del Pedido</h4>
                <ul>
                    {saleData.products.map(p => <li key={p.cartId}><span>{p.name || p.nombre}</span> <strong>${(p.price || p.precio).toFixed(2)}</strong></li>)}
                </ul>
                <div className="summary-row">
                    <span>Tutor:</span>
                    <strong>{saleData.tutor?.name || 'No seleccionado'}</strong>
                </div>
                 <div className="summary-row">
                    <span>Paciente:</span>
                    <strong>{saleData.patient?.name || 'No seleccionado'}</strong>
                </div>
                 <div className="summary-row">
                    <span>Método de Pago:</span>
                    <strong>{saleData.paymentMethod || 'No seleccionado'}</strong>
                </div>
                <div className="summary-total">
                    <span>Total:</span>
                    <strong>${saleData.total.toFixed(2)}</strong>
                </div>
            </div>
            <div className="navigator-buttons">
                <button onClick={prevStep} className="btn-secondary">Anterior</button>
                <button onClick={onConfirm} className="btn-confirm" disabled={isSubmitting}>
                    {isSubmitting ? 'Procesando...' : 'Confirmar y Vender'}
                </button>
            </div>
        </div>
    );
};

export default ConfirmarVenta;

