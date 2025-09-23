import React from 'react';

const FaTimes = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 352 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.19 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.19 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path></svg>;

const SaleDetailModal = ({ sale, onClose }) => {
    if (!sale) return null;

    return (
        <div className="sale-detail-modal-overlay">
            <div className="sale-detail-modal">
                <button className="sale-detail-close-btn" onClick={onClose}><FaTimes /></button>
                <h3>Detalle de la Transacción</h3>
                
                <div className="sale-detail-section">
                    <p><span>Cliente:</span> <strong>{sale.tutorInfo?.name || 'N/A'}</strong></p>
                    {sale.patientInfo?.name && <p><span>Paciente:</span> <strong>{sale.patientInfo.name}</strong></p>}
                    <p><span>Fecha:</span> <strong>{sale.createdAt.toDate().toLocaleString('es-AR')}</strong></p>
                </div>
                
                <div className="sale-detail-section">
                    <h4>Items</h4>
                    <ul className="sale-detail-item-list">
                        {(sale.items || []).map((item, index) => (
                            <li key={item.id + index}>
                                <span>{item.quantity} x {item.name}</span>
                                <strong>${(item.price * item.quantity).toFixed(2)}</strong>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="sale-detail-section">
                    <h4>Pagos</h4>
                    <ul className="sale-detail-item-list">
                        {(sale.payments || []).map((p, index) => (
                            <li key={index}><span>{p.method}</span><strong>${parseFloat(p.amount).toFixed(2)}</strong></li>
                        ))}
                         {(sale.payments || []).length === 0 && <li>No se registraron pagos.</li>}
                    </ul>
                </div>

                <div className="sale-detail-footer">
                     {(sale.debt || 0) > 0 && <p className="sale-detail-debt"><span>Deuda Generada:</span> <strong>${sale.debt.toFixed(2)}</strong></p>}
                    <p className="sale-detail-total"><span>Total Venta:</span> <strong>${sale.total.toFixed(2)}</strong></p>
                </div>
            </div>
        </div>
    );
};

export default SaleDetailModal;

