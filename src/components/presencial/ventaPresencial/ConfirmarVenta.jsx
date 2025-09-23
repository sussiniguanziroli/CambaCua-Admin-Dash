import React from 'react';

// --- SVG Icon ---
const FaNotesMedical = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M488.7,143.4l-112-112c-12.5-12.5-32.8-12.5-45.3,0l-32,32c-12.5,12.5-12.5,32.8,0,45.3l112,112c12.5,12.5,32.8,12.5,45.3,0l32-32C501.2,176.2,501.2,155.9,488.7,143.4z M32,464h224v-48H32V464z M32,368h288v-48H32V368z M32,272h288v-48H32V272z M400,32l-48,48l-32-32l48-48L400,32z M224,224c0,17.7-14.3,32-32,32s-32-14.3-32-32s14.3-32,32-32S224,206.3,224,224z"></path></svg>;


const ConfirmarVenta = ({ saleData, onConfirm, prevStep, isSubmitting, onToggleClinicalHistory }) => {
    
    // Check if there is at least one item that can be added to history
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
                                <span className="item-quantity">{item.quantity} x</span>
                                <span className="item-name">{item.name || item.nombre}</span>
                                <strong className="item-price">${(item.price * item.quantity).toFixed(2)}</strong>
                            </div>
                            
                            {/* --- New Feature: Clinical History Toggle --- */}
                            {item.source === 'presential' && saleData.patient && (
                                <div className="clinical-history-toggle">
                                    <input 
                                        type="checkbox" 
                                        id={`ch-${item.id}`}
                                        checked={saleData.clinicalHistoryItems.includes(item.id)}
                                        onChange={() => onToggleClinicalHistory(item.id)}
                                    />
                                    <label htmlFor={`ch-${item.id}`}>
                                        <FaNotesMedical />
                                        Añadir a H.C.
                                    </label>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
                
                {hasClinicallyRelevantItems && saleData.patient &&
                    <p className="clinical-history-info">
                        Seleccione los productos y servicios que desea registrar en la historia clínica del paciente.
                    </p>
                }

                <div className="summary-details">
                    <div className="summary-row"><span>Tutor:</span><strong>{saleData.tutor?.name || 'N/A'}</strong></div>
                    <div className="summary-row"><span>Paciente:</span><strong>{saleData.patient?.name || 'N/A'}</strong></div>
                    <div className="summary-row"><span>Método de Pago:</span><strong>{saleData.paymentMethod || 'N/A'}</strong></div>
                    <div className="summary-total"><span>Total:</span><strong>${saleData.total.toFixed(2)}</strong></div>
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
