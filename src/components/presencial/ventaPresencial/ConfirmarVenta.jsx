import React from 'react';

const ConfirmarVenta = ({ saleData, onConfirm, prevStep, isSubmitting }) => {
    return (
        <div className="confirmar-venta">
            <h2>Paso 5: Confirmar Venta</h2>
            <div className="sale-summary-box">
                <h4>Resumen del Pedido</h4>
                <ul>
                    {saleData.cart.map(item => (
                        <li key={item.id}>
                            <span>{item.quantity} x {item.name || item.nombre}</span>
                            <strong>${(item.price * item.quantity).toFixed(2)}</strong>
                        </li>
                    ))}
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