import React, { useState } from 'react';
import { FaSyringe } from 'react-icons/fa';

const ProgramarVencimientos = ({ saleData, onConfirmAndSchedule, prevStep, isSubmitting }) => {
    const itemsToSchedule = saleData.cart.filter(item => saleData.clinicalHistoryItems.includes(item.id));
    const [schedule, setSchedule] = useState({});

    const handleDaysChange = (itemId, days) => {
        setSchedule(prev => ({ ...prev, [itemId]: parseInt(days, 10) || 0 }));
    };

    return (
        <div className="programar-vencimientos-container">
            <h2>Paso 6: Programar Vencimientos</h2>
            <p className="step-subtitle">Ingrese en cuántos días vence la próxima aplicación para los items seleccionados.</p>
            <div className="vencimientos-list">
                {itemsToSchedule.map(item => (
                    <div key={item.id} className="vencimiento-item">
                        <div className="item-info">
                            <span className="item-name">
                                {/* --- NEW: Show syringe if suministro is active --- */}
                                {saleData.suministroItems.includes(item.id) &&  (
                                    <span title="Creará Suministro Base" className="suministro-indicator">
                                        <FaSyringe />

                                    </span>
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
                ))}
                {itemsToSchedule.length === 0 && <p className="no-items-message">No se seleccionaron items para programar un vencimiento.</p>}
            </div>
            <div className="navigator-buttons">
                <button onClick={prevStep} className="btn btn-secondary" disabled={isSubmitting}>Anterior</button>
                <button onClick={() => onConfirmAndSchedule(schedule)} className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Finalizando...' : 'Finalizar Venta'}</button>
            </div>
        </div>
    );
};

export default ProgramarVencimientos;
