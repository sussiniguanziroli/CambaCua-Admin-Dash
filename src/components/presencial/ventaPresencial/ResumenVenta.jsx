import React from 'react';

const ResumenVenta = ({ saleData, onReset }) => {
    return (
        <div className="venta-step-container venta-resumen-container">
            <div className="success-icon">✓</div>
            <h2>¡Venta Realizada con Éxito!</h2>
             <div className="sale-summary-box venta-summary-box">
                <h4>Detalles de la Venta</h4>
                <ul>
                    {saleData.cart.map(item => (
                       <li key={item.id}>
                            <span>{item.quantity} x {item.name || item.nombre}</span>
                            <strong>${(item.price * item.quantity).toFixed(2)}</strong>
                        </li>
                    ))}
                </ul>
                <div className="summary-row"><span>Tutor:</span><strong>{saleData.tutor?.name || 'N/A'}</strong></div>
                <div className="summary-row"><span>Paciente:</span><strong>{saleData.patient?.name || 'N/A'}</strong></div>
                <div className="summary-row"><span>Método de Pago:</span><strong>{saleData.paymentMethod}</strong></div>
                <div className="summary-total"><span>Total Cobrado:</span><strong>${saleData.total.toFixed(2)}</strong></div>
            </div>
            <div className="venta-navigator-buttons" style={{justifyContent: 'center'}}>
                <button onClick={onReset} className="btn btn-primary">Realizar Nueva Venta</button>
            </div>
        </div>
    );
};

export default ResumenVenta;
