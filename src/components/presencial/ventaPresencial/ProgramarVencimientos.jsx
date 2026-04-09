// ProgramarVencimientos.jsx - solo cambia la parte donde muestra la dosis
import React, { useState, useEffect } from 'react';
import { FaSyringe, FaDog, FaCat } from 'react-icons/fa';
import { db } from '../../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

const ProgramarVencimientos = ({ saleData, onConfirmAndSchedule, prevStep, isSubmitting }) => {
    const [scheduleByPatient, setScheduleByPatient] = useState({});
    const [linksByPatient, setLinksByPatient] = useState({});
    const [pendingByPatient, setPendingByPatient] = useState({});
    const [isLoadingPending, setIsLoadingPending] = useState(true);

    const patientsWithItems = saleData.patients.filter(p =>
        (saleData.clinicalHistoryItems[p.id] || []).length > 0
    );

    const getDistributedQty = (patientId, itemId, fallback) => {
        const val = saleData.distributionByPatient?.[patientId]?.[itemId];
        return (val !== undefined && val !== null) ? val : fallback;
    };

    useEffect(() => {
        const fetchAllPending = async () => {
            setIsLoadingPending(true);
            try {
                const results = await Promise.all(
                    patientsWithItems.map(async patient => {
                        const q = query(collection(db, `pacientes/${patient.id}/vencimientos`), where('status', '==', 'pendiente'));
                        const snap = await getDocs(q);
                        const pending = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                        const autoLinks = {};
                        const itemIds = saleData.clinicalHistoryItems[patient.id] || [];
                        saleData.cart.filter(item => itemIds.includes(item.id)).forEach(item => {
                            const firestoreId = item.originalProductId || item.id;
                            const match = pending.find(v => v.productId === firestoreId);
                            if (match) autoLinks[item.id] = match.id;
                        });
                        return { patientId: patient.id, pending, autoLinks };
                    })
                );
                const pendingMap = {}, linksMap = {};
                results.forEach(({ patientId, pending, autoLinks }) => {
                    pendingMap[patientId] = pending;
                    linksMap[patientId] = autoLinks;
                });
                setPendingByPatient(pendingMap);
                setLinksByPatient(linksMap);
            } catch (e) { console.error(e); }
            finally { setIsLoadingPending(false); }
        };
        if (patientsWithItems.length > 0) fetchAllPending();
        else setIsLoadingPending(false);
    }, []);

    const handleDaysChange = (patientId, itemId, days) => {
        setScheduleByPatient(prev => ({
            ...prev,
            [patientId]: { ...(prev[patientId] || {}), [itemId]: parseInt(days, 10) || 0 },
        }));
    };

    const handleLinkChange = (patientId, itemId, vencimientoId) => {
        setLinksByPatient(prev => ({
            ...prev,
            [patientId]: { ...(prev[patientId] || {}), [itemId]: vencimientoId },
        }));
    };

    if (patientsWithItems.length === 0) {
        return (
            <div className="programar-vencimientos-container">
                <h2>Paso 7: Programar Vencimientos</h2>
                <p className="no-items-message">No se seleccionaron items para programar vencimientos.</p>
                <div className="navigator-buttons">
                    <button onClick={prevStep} disabled={isSubmitting} className="btn btn-secondary">Anterior</button>
                    <button onClick={() => onConfirmAndSchedule({}, {})} disabled={isSubmitting} className="btn btn-primary">
                        {isSubmitting ? 'Finalizando...' : 'Finalizar Venta'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="programar-vencimientos-container">
            <h2>Paso 7: Programar Vencimientos</h2>
            <p className="step-subtitle">Ingresá en cuántos días vence la próxima aplicación para cada paciente.</p>

            {isLoadingPending ? <p>Cargando vencimientos pendientes...</p> : (
                <div className="vencimientos-list">
                    {patientsWithItems.map(patient => {
                        const itemIds = saleData.clinicalHistoryItems[patient.id] || [];
                        const itemsToSchedule = saleData.cart.filter(item => itemIds.includes(item.id));
                        const patientPending = pendingByPatient[patient.id] || [];
                        const patientLinks = linksByPatient[patient.id] || {};
                        const patientSchedule = scheduleByPatient[patient.id] || {};
                        const patientSumItems = saleData.suministroItems[patient.id] || [];

                        return (
                            <div key={patient.id} className="pv-patient-block">
                                <div className="pv-patient-header">
                                    <span className="pv-patient-icon">
                                        {patient.species === 'Canino' ? <FaDog /> : <FaCat />}
                                    </span>
                                    <span className="pv-patient-name">{patient.name}</span>
                                    <span className="pv-patient-count">{itemsToSchedule.length} item{itemsToSchedule.length !== 1 ? 's' : ''}</span>
                                </div>

                                {itemsToSchedule.map(item => {
                                    const distributedQty = getDistributedQty(patient.id, item.id, item.quantity);
                                    return (
                                        <div key={item.id} className="vencimiento-item">
                                            <div className="vencimiento-item-header">
                                                <div className="item-info">
                                                    <span className="item-name">
                                                        {patientSumItems.includes(item.id) && (
                                                            <span title="Creará Suministro Base" className="suministro-indicator"><FaSyringe /></span>
                                                        )}
                                                        {item.name}
                                                    </span>
                                                    {item.isDoseable && (
                                                        <span className="item-desc">Dosis: {distributedQty} {item.unit}</span>
                                                    )}
                                                    {!item.isDoseable && distributedQty !== item.quantity && (
                                                        <span className="item-desc">{distributedQty} u. para este paciente</span>
                                                    )}
                                                </div>
                                                <div className="item-schedule-input">
                                                    <input
                                                        type="number"
                                                        placeholder="Días"
                                                        min="0"
                                                        value={patientSchedule[item.id] || ''}
                                                        onChange={e => handleDaysChange(patient.id, item.id, e.target.value)}
                                                    />
                                                    <label>días para el vencimiento</label>
                                                </div>
                                            </div>
                                            {patientPending.length > 0 && (
                                                <div className="item-link-selector">
                                                    <select
                                                        value={patientLinks[item.id] || ''}
                                                        onChange={e => handleLinkChange(patient.id, item.id, e.target.value)}
                                                    >
                                                        <option value="">-- No saldar ningún vencimiento previo --</option>
                                                        {patientPending.map(v => (
                                                            <option key={v.id} value={v.id}>
                                                                Saldar: {v.productName} (Vencía: {v.dueDate.toDate().toLocaleDateString('es-AR')})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="navigator-buttons">
                <button onClick={prevStep} disabled={isSubmitting} className="btn btn-secondary">Anterior</button>
                <button onClick={() => onConfirmAndSchedule(scheduleByPatient, linksByPatient)} disabled={isSubmitting} className="btn btn-primary">
                    {isSubmitting ? 'Finalizando...' : 'Finalizar Venta'}
                </button>
            </div>
        </div>
    );
};

export default ProgramarVencimientos;