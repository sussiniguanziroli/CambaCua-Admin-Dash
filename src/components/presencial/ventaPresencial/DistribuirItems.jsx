// DistribuirItems.jsx
import React, { useState } from 'react';
import { FaDog, FaCat } from 'react-icons/fa';

const DistribuirItems = ({ saleData, onDistributionConfirmed, prevStep }) => {
    const numPatients = saleData.patients.length;

    const initDistribution = () => {
        const dist = {};
        saleData.patients.forEach(patient => {
            dist[patient.id] = {};
            saleData.cart.forEach(item => {
                if (item.isDoseable) {
                    dist[patient.id][item.id] = parseFloat((item.quantity / numPatients).toFixed(2));
                } else {
                    dist[patient.id][item.id] = Math.max(1, Math.floor(item.quantity / numPatients));
                }
            });
        });
        return dist;
    };

    const [distribution, setDistribution] = useState(() => {
        const existing = saleData.distributionByPatient;
        if (existing && Object.keys(existing).length > 0) return existing;
        return initDistribution();
    });

    const setQty = (patientId, itemId, value, isDoseable) => {
        const parsed = isDoseable ? parseFloat(value) || 0 : parseInt(value) || 0;
        setDistribution(prev => ({
            ...prev,
            [patientId]: { ...prev[patientId], [itemId]: Math.max(0, parsed) },
        }));
    };

    const increment = (patientId, itemId, isDoseable) => {
        const current = distribution[patientId]?.[itemId] ?? 0;
        const next = isDoseable
            ? parseFloat((current + 0.1).toFixed(2))
            : parseInt(current) + 1;
        setDistribution(prev => ({ ...prev, [patientId]: { ...prev[patientId], [itemId]: next } }));
    };

    const decrement = (patientId, itemId, isDoseable) => {
        const current = distribution[patientId]?.[itemId] ?? 0;
        const next = isDoseable
            ? parseFloat(Math.max(0, current - 0.1).toFixed(2))
            : Math.max(0, parseInt(current) - 1);
        setDistribution(prev => ({ ...prev, [patientId]: { ...prev[patientId], [itemId]: next } }));
    };

    const getTotalDistributed = (itemId) =>
        saleData.patients.reduce((sum, p) => sum + (parseFloat(distribution[p.id]?.[itemId]) || 0), 0);

    const handleConfirm = () => {
        const clinicalHistoryItems = {};
        const suministroItems = {};
        saleData.patients.forEach(patient => {
            clinicalHistoryItems[patient.id] = saleData.cart
                .filter(item => (parseFloat(distribution[patient.id]?.[item.id]) || 0) > 0)
                .map(item => item.id);
            const existingSuministro = saleData.suministroItems[patient.id] || [];
            suministroItems[patient.id] = existingSuministro.filter(
                itemId => (parseFloat(distribution[patient.id]?.[itemId]) || 0) > 0
            );
        });
        onDistributionConfirmed(distribution, clinicalHistoryItems, suministroItems);
    };

    return (
        <div className="distribuir-items-container">
            <h2>Paso 4: Distribuir Items por Paciente</h2>
            <p className="step-subtitle">
                Indicá cuánto recibe cada paciente. La distribución se usa para la historia clínica y los vencimientos.
            </p>

            <div className="di-items-list">
                {saleData.cart.map(item => {
                    const totalDist = getTotalDistributed(item.id);
                    const isOver = totalDist > item.quantity + 0.001;

                    return (
                        <div key={item.id} className={`di-item-block ${isOver ? 'is-over' : ''}`}>
                            <div className="di-item-header">
                                <div className="di-item-name-group">
                                    <span className="di-item-name">{item.name}</span>
                                    {item.isDoseable && <span className="doseable-badge">ML</span>}
                                </div>
                                <div className="di-item-totals">
                                    <span className="di-cart-total">
                                        Comprado: {item.isDoseable ? `${item.quantity} ${item.unit}` : `${item.quantity} u.`}
                                    </span>
                                    <span className={`di-distributed-total ${isOver ? 'over' : ''}`}>
                                        Distribuido: {item.isDoseable ? `${totalDist.toFixed(2)} ${item.unit}` : `${totalDist} u.`}
                                    </span>
                                </div>
                            </div>

                            <div className="di-patients-grid">
                                {saleData.patients.map(patient => {
                                    const val = distribution[patient.id]?.[item.id] ?? 0;
                                    return (
                                        <div key={patient.id} className="di-patient-row">
                                            <div className="di-patient-label">
                                                <span className={`di-species-icon ${patient.species === 'Canino' ? 'canino' : 'felino'}`}>
                                                    {patient.species === 'Canino' ? <FaDog /> : <FaCat />}
                                                </span>
                                                <span className="di-patient-name">{patient.name}</span>
                                            </div>
                                            <div className="di-qty-stepper">
                                                <button
                                                    type="button"
                                                    className="di-qty-btn"
                                                    onClick={() => decrement(patient.id, item.id, item.isDoseable)}
                                                >−</button>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step={item.isDoseable ? "0.01" : "1"}
                                                    value={val}
                                                    onChange={e => setQty(patient.id, item.id, e.target.value, item.isDoseable)}
                                                    className="di-qty-input"
                                                />
                                                <button
                                                    type="button"
                                                    className="di-qty-btn"
                                                    onClick={() => increment(patient.id, item.id, item.isDoseable)}
                                                >+</button>
                                                <span className="di-unit">{item.isDoseable ? item.unit : 'u.'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {isOver && (
                                <div className="di-over-warning">
                                    ⚠ La cantidad distribuida supera lo comprado. Revisá los valores.
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="navigator-buttons">
                <button onClick={prevStep} className="btn btn-secondary">Anterior</button>
                <button onClick={handleConfirm} className="btn btn-primary">Siguiente</button>
            </div>
        </div>
    );
};

export default DistribuirItems;