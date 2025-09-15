import React from 'react';

const ResumenVenta = ({ saleData, onReset }) => {
    return (
        <div className="resumen-venta">
            <div className="success-icon">✓</div>
            <h2>¡Venta Realizada con Éxito!</h2>
             <div className="sale-summary-box">
                <h4>Detalles de la Venta</h4>
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
                    <span>Total Cobrado:</span>
                    <strong>${saleData.total.toFixed(2)}</strong>
                </div>
            </div>
            <div className="navigator-buttons">
                <button onClick={onReset} className="btn-confirm">Realizar Nueva Venta</button>
            </div>
        </div>
    );
};

export default ResumenVenta;

