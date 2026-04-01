import React, { useState, useEffect } from 'react';
import { FaSyringe } from 'react-icons/fa';
import { db } from '../../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

const ProgramarVencimientos = ({ saleData, onConfirmAndSchedule, prevStep, isSubmitting }) => {
    const itemsToSchedule = saleData.cart.filter(item => saleData.clinicalHistoryItems.includes(item.id));
    const [schedule, setSchedule] = useState({});
    const [pendingVencimientos, setPendingVencimientos] = useState([]);
    const [links, setLinks] = useState({});

    useEffect(() => {
        const fetchPending = async () => {
            if (!saleData.patient?.id) return;
            try {
                const q = query(
                    collection(db, `pacientes/${saleData.patient.id}/vencimientos`),
                    where("status", "==", "pendiente")
                );
                const snap = await getDocs(q);
                const pending = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setPendingVencimientos(pending);

                const autoLinks = {};
                itemsToSchedule.forEach(item => {
                    const firestoreId = item.originalProductId || item.id;
                    const match = pending.find(v => v.productId === firestoreId);
                    if (match) autoLinks[item.id] = match.id;
                });
                setLinks(autoLinks);
            } catch (err) {
                console.error(err);
            }
        };
        fetchPending();
    }, [saleData.patient, itemsToSchedule]);

    const handleDaysChange = (itemId, days) => {
        setSchedule(prev => ({ ...prev, [itemId]: parseInt(days, 10) || 0 }));
    };

    const handleLinkChange = (itemId, vencimientoId) => {
        setLinks(prev => ({ ...prev, [itemId]: vencimientoId }));
    };

    return (
        <div className="programar-vencimientos-container">
            <h2>Paso 6: Programar Vencimientos</h2>
            <p className="step-subtitle">Ingrese en cuántos días vence la próxima aplicación para los items seleccionados.</p>
            <div className="vencimientos-list">
                {itemsToSchedule.map(item => (
                    <div key={item.id} className="vencimiento-item">
                        <div className="vencimiento-item-header">
                            <div className="item-info">
                                <span className="item-name">
                                    {saleData.suministroItems.includes(item.id) && (
                                        <span title="Creará Suministro Base" className="suministro-indicator"><FaSyringe /></span>
                                    )}
                                    {item.name}
                                </span>
                                {item.isDoseable && <span className="item-desc">Dosis Actual: {item.quantity} {item.unit}</span>}
                            </div>
                            <div className="item-schedule-input">
                                <input type="number" placeholder="Días" min="0" onChange={(e) => handleDaysChange(item.id, e.target.value)} />
                                <label>días para el vencimiento</label>
                            </div>
                        </div>
                        {pendingVencimientos.length > 0 && (
                            <div className="item-link-selector">
                                <select value={links[item.id] || ""} onChange={(e) => handleLinkChange(item.id, e.target.value)}>
                                    <option value="">-- No saldar ningún vencimiento previo --</option>
                                    {pendingVencimientos.map(v => (
                                        <option key={v.id} value={v.id}>
                                            Saldar: {v.productName} (Vencía: {v.dueDate.toDate().toLocaleDateString('es-AR')})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                ))}
                {itemsToSchedule.length === 0 && <p className="no-items-message">No se seleccionaron items para programar un vencimiento.</p>}
            </div>
            <div className="navigator-buttons">
                <button onClick={prevStep} className="btn btn-secondary" disabled={isSubmitting}>Anterior</button>
                <button onClick={() => onConfirmAndSchedule(schedule, links)} className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Finalizando...' : 'Finalizar Venta'}
                </button>
            </div>
        </div>
    );
};

export default ProgramarVencimientos;