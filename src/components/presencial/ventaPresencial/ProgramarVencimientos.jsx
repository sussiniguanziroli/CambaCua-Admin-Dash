import React, { useState } from 'react';

const ProgramarVencimientos = ({ saleData, onConfirmAndSchedule, prevStep, isSubmitting }) => {
    const itemsToSchedule = saleData.cart.filter(item => saleData.clinicalHistoryItems.includes(item.id));
    const [schedule, setSchedule] = useState({});

    const handleDaysChange = (itemId, days) => {
        setSchedule(prev => ({
            ...prev,
            [itemId]: parseInt(days, 10) || 0,
        }));
    };

    return (
        <div className="programar-vencimientos-container">
            <h2>Paso 6: Programar Vencimientos</h2>
            <p className="step-subtitle">
                Seleccione los productos que desea programar para un futuro recordatorio e ingrese en cuántos días vence la próxima aplicación.
            </p>

            <div className="vencimientos-list">
                {itemsToSchedule.map(item => (
                    <div key={item.id} className="vencimiento-item">
                        <div className="item-info">
                            <span className="item-name">{item.name || item.nombre}</span>
                            <span className="item-desc">Marcar para seguimiento</span>
                        </div>
                        <div className="item-schedule-input">
                            <input
                                type="number"
                                placeholder="Días"
                                min="0"
                                onChange={(e) => handleDaysChange(item.id, e.target.value)}
                            />
                            <label>días para el vencimiento</label>
                        </div>
                    </div>
                ))}
                {itemsToSchedule.length === 0 && (
                    <p className="no-items-message">No se seleccionaron items para agregar a la historia clínica en el paso anterior.</p>
                )}
            </div>
            
            <div className="navigator-buttons">
                <button onClick={prevStep} className="btn btn-secondary" disabled={isSubmitting}>Anterior</button>
                <button onClick={() => onConfirmAndSchedule(schedule)} className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Finalizando...' : 'Finalizar Venta'}
                </button>
            </div>
        </div>
    );
};

export default ProgramarVencimientos;