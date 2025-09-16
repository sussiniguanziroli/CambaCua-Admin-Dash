import React from 'react';
import { FaTimes, FaPrint } from 'react-icons/fa';

const SaleDetailModal = ({ sale, onClose }) => {
    if (!sale) return null;

    return (
        <div className="sale-detail-modal-overlay">
            <div className="sale-detail-modal">
                <button className="close-btn" onClick={onClose}><FaTimes /></button>
                <h3>Detalle de la Venta</h3>
                <div className="summary-row">
                    <span>Cliente:</span>
                    <strong>{sale.tutorInfo?.name || 'N/A'}</strong>
                </div>
                <div className="summary-row">
                    <span>Paciente:</span>
                    <strong>{sale.patientInfo?.name || 'N/A'}</strong>
                </div>
                <div className="summary-row">
                    <span>Método de Pago:</span>
                    <strong>{sale.paymentMethod}</strong>
                </div>
                <div className="summary-row">
                    <span>Fecha:</span>
                    <strong>{sale.createdAt.toDate().toLocaleString('es-AR')}</strong>
                </div>
                
                <h4>Items</h4>
                <ul className="item-list">
                    {sale.items.map(item => (
                        <li key={item.id}>
                            <span>{item.quantity} x {item.name}</span>
                            <strong>${(item.price * item.quantity).toFixed(2)}</strong>
                        </li>
                    ))}
                </ul>

                <div className="summary-total">
                    <span>Total:</span>
                    <strong>${sale.total.toFixed(2)}</strong>
                </div>
                <div className="modal-actions">
                    <button className="btn btn-secondary"><FaPrint /> Imprimir Recibo</button>
                </div>
            </div>
        </div>
    );
};

export default SaleDetailModal;