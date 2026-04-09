// ConfirmarVenta.jsx
import React, { useState } from 'react';
import { FaSyringe, FaDog, FaCat } from 'react-icons/fa';
import { db } from '../../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';

const ConfirmarVenta = ({ saleData, onConfirm, prevStep, isSubmitting, onToggleClinicalHistory, onToggleSuministro, onSaleReset }) => {
    const [isSaving, setIsSaving] = useState(false);

    const subtotal = saleData.cart.reduce((sum, item) => sum + (item.priceBeforeDiscount || item.price), 0);
    const totalDiscount = saleData.cart.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
    const hasPatients = saleData.patients && saleData.patients.length > 0;

    const handleSaveSale = async () => {
        setIsSaving(true);
        try {
            await addDoc(collection(db, 'ventas_guardadas'), {
                createdAt: saleData.saleTimestamp,
                cart: saleData.cart.map(item => ({
                    id: item.id, originalProductId: item.originalProductId || null,
                    name: item.name || item.displayName, quantity: item.quantity || 1,
                    source: item.source || 'presential', tipo: item.tipo || null,
                    isDoseable: item.isDoseable || false, unit: item.unit || null,
                    originalPrice: item.originalPrice || 0, priceBeforeDiscount: item.priceBeforeDiscount || 0,
                    discountType: item.discountType || null, discountValue: item.discountValue || 0,
                    discountAmount: item.discountAmount || 0, price: item.price || 0,
                })),
                tutor: saleData.tutor || null,
                patients: saleData.patients || [],
                total: saleData.total || 0,
                clinicalHistoryItems: saleData.clinicalHistoryItems || {},
                suministroItems: saleData.suministroItems || {},
                saleTimestamp: saleData.saleTimestamp,
            });
            const result = await Swal.fire({
                title: 'Venta guardada con éxito', text: '¿Realizar otra venta?', icon: 'success',
                showCancelButton: true, confirmButtonText: 'Sí', cancelButtonText: 'Ir a Caja Diaria',
                confirmButtonColor: '#3085d6', cancelButtonColor: '#6c757d',
            });
            if (result.isConfirmed) onSaleReset();
            else window.location.href = '/admin/caja-diaria';
        } catch (e) { console.error(e); Swal.fire('Error', 'No se pudo guardar la venta', 'error'); }
        finally { setIsSaving(false); }
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
                                        <><span className="item-quantity">{item.quantity}x</span><span className="item-name">{item.name}</span></>
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
                        </li>
                    ))}
                </ul>

                {hasPatients && (
                    <div className="cv-patients-section">
                        <p className="clinical-history-info">Seleccioná los items a registrar en la historia clínica de cada paciente.</p>
                        {saleData.patients.map(patient => {
                            const patientCHItems = saleData.clinicalHistoryItems[patient.id] || [];
                            const patientSumItems = saleData.suministroItems[patient.id] || [];
                            return (
                                <div key={patient.id} className="cv-patient-block">
                                    <div className="cv-patient-header">
                                        <span className="cv-patient-icon">
                                            {patient.species === 'Canino' ? <FaDog /> : <FaCat />}
                                        </span>
                                        <span className="cv-patient-name">{patient.name}</span>
                                        {patientCHItems.length > 0 && (
                                            <span className="cv-patient-count">{patientCHItems.length} en HC</span>
                                        )}
                                    </div>
                                    <ul className="cv-patient-items">
                                        {saleData.cart.map(item => {
                                            const isInCH = patientCHItems.includes(item.id);
                                            const isInSum = patientSumItems.includes(item.id);
                                            return (
                                                <li key={item.id} className="cv-patient-item">
                                                    <span className="cv-item-name">
                                                        {item.isDoseable
                                                            ? `${item.name} (${item.quantity} ${item.unit})`
                                                            : `${item.quantity}x ${item.name}`}
                                                    </span>
                                                    <div className="clinical-history-toggle">
                                                        <input
                                                            type="checkbox"
                                                            id={`ch-${patient.id}-${item.id}`}
                                                            checked={isInCH}
                                                            onChange={() => onToggleClinicalHistory(patient.id, item.id)}
                                                        />
                                                        <label htmlFor={`ch-${patient.id}-${item.id}`}>Añadir a H.C.</label>
                                                        {isInCH && (
                                                            <button
                                                                type="button"
                                                                title="Crear Suministro Base"
                                                                className={`btn-suministro-toggle ${isInSum ? 'active' : ''}`}
                                                                onClick={() => onToggleSuministro(patient.id, item.id)}
                                                            >
                                                                <FaSyringe />
                                                            </button>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="summary-details">
                    <div className="summary-row"><span>Tutor:</span><strong>{saleData.tutor?.name || 'Cliente Genérico'}</strong></div>
                    {hasPatients && (
                        <div className="summary-row">
                            <span>Pacientes:</span>
                            <strong>{saleData.patients.map(p => p.name).join(', ')}</strong>
                        </div>
                    )}
                    <div className="summary-row"><span>Subtotal:</span><strong>${subtotal.toFixed(2)}</strong></div>
                    {totalDiscount > 0 && <div className="summary-row discount"><span>Descuentos:</span><strong>-${totalDiscount.toFixed(2)}</strong></div>}
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