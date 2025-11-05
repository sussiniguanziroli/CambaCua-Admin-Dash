import React, { useState } from 'react';
import { FaSyringe } from 'react-icons/fa';
import { db } from '../../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';

const ConfirmarVenta = ({ saleData, onConfirm, prevStep, isSubmitting, onToggleClinicalHistory, onToggleSuministro, onSaleReset }) => {
    const [isSaving, setIsSaving] = useState(false);
    
    const subtotal = saleData.cart.reduce((sum, item) => sum + (item.priceBeforeDiscount || item.price), 0);
    const totalDiscount = saleData.cart.reduce((sum, item) => sum + (item.discountAmount || 0), 0);

    const handleSaveSale = async () => {
        setIsSaving(true);
        try {
            const ventaGuardadaData = {
                createdAt: saleData.saleTimestamp,
                cart: saleData.cart,
                tutor: saleData.tutor,
                patient: saleData.patient,
                total: saleData.total,
                clinicalHistoryItems: saleData.clinicalHistoryItems,
                suministroItems: saleData.suministroItems,
                saleTimestamp: saleData.saleTimestamp
            };

            await addDoc(collection(db, 'ventas_guardadas'), ventaGuardadaData);

            const result = await Swal.fire({
                title: 'Venta guardada con éxito',
                text: '¿Realizar otra venta?',
                icon: 'success',
                showCancelButton: true,
                confirmButtonText: 'Sí',
                cancelButtonText: 'Ir a Caja Diaria',
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#6c757d'
            });

            if (result.isConfirmed) {
                onSaleReset();
            } else {
                window.location.href = '/admin/caja-diaria';
            }
        } catch (error) {
            console.error('Error saving sale:', error);
            Swal.fire('Error', 'No se pudo guardar la venta', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="confirmar-venta-container">
            <h2>Paso 5: Confirmar Venta</h2>
            <div className="sale-summary-box">
                <h4>Resumen del Pedido</h4>
                <ul className="summary-item-list">
                    {saleData.cart.map(item => (
                        <li key={item.id} className="summary-item">
                            <div className="item-info">
                                <div className="item-name-details">
                                    {item.isDoseable ? (
                                        <span className="item-name">{item.name} ({item.quantity} {item.unit})</span>
                                    ) : (
                                        <>
                                            <span className="item-quantity">{item.quantity}x</span>
                                            <span className="item-name">{item.name}</span>
                                        </>
                                    )}
                                    {item.discountAmount > 0 && (
                                        <div className="item-discount-info">
                                            <span>Orig: ${item.priceBeforeDiscount.toFixed(2)}</span>
                                            <span>Dto: -${item.discountAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                                <span className={`item-price ${item.discountAmount > 0 ? 'is-discounted' : ''}`}>
                                    ${item.price.toFixed(2)}
                                </span>
                            </div>
                            {saleData.patient && (
                                <div className="clinical-history-toggle">
                                    <input type="checkbox" id={`ch-${item.id}`} checked={saleData.clinicalHistoryItems.includes(item.id)} onChange={() => onToggleClinicalHistory(item.id)}/>
                                    <label htmlFor={`ch-${item.id}`}>Añadir a H.C.</label>

                                    {saleData.clinicalHistoryItems.includes(item.id) && (
                                        <button 
                                            type="button"
                                            title="Crear Suministro Base"
                                            className={`btn-suministro-toggle ${saleData.suministroItems.includes(item.id) ? 'active' : ''}`}
                                            onClick={() => onToggleSuministro(item.id)}
                                        >
                                            <FaSyringe />
                                        </button>
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
                {saleData.patient && (<p className="clinical-history-info">Seleccione los items a registrar en la historia clínica.</p>)}
                <div className="summary-details">
                    <div className="summary-row"><span>Tutor:</span><strong>{saleData.tutor?.name || 'Cliente Genérico'}</strong></div>
                    <div className="summary-row"><span>Paciente:</span><strong>{saleData.patient?.name || 'N/A'}</strong></div>
                    <div className="summary-row"><span>Subtotal:</span><strong>${subtotal.toFixed(2)}</strong></div>
                    {totalDiscount > 0 && (<div className="summary-row discount"><span>Descuentos:</span><strong>-${totalDiscount.toFixed(2)}</strong></div>)}
                    <div className="summary-total"><span>Total Venta:</span><strong>${saleData.total.toFixed(2)}</strong></div>
                </div>
            </div>
            <div className="navigator-buttons">
                <button onClick={prevStep} className="btn btn-secondary" disabled={isSubmitting || isSaving}>Anterior</button>
                <button onClick={handleSaveSale} className="btn btn-outline" disabled={isSubmitting || isSaving}>
                    {isSaving ? 'Generando...' : 'Generar Presupuesto'}
                </button>
                <button onClick={onConfirm} className="btn btn-confirm" disabled={isSubmitting || isSaving}>
                    {isSubmitting ? 'Procesando...' : 'Siguiente'}
                </button>
            </div>
        </div>
    );
};

export default ConfirmarVenta;