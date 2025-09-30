import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { FaPlus, FaTrash } from 'react-icons/fa';

const CreateRecipeModal = ({ isOpen, onClose, onSave, paciente }) => {
    const [prescribedBy, setPrescribedBy] = useState('');
    const [generalIndications, setGeneralIndications] = useState('');
    const [prescriptions, setPrescriptions] = useState([{ productName: '', dose: '', frequency: '', duration: '' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        if (isOpen) {
            setPrescribedBy('');
            setGeneralIndications('');
            setPrescriptions([{ productName: '', dose: '', frequency: '', duration: '' }]);
        }
    }, [isOpen]);

    const handlePrescriptionChange = (index, field, value) => {
        const newPrescriptions = [...prescriptions];
        newPrescriptions[index][field] = value;
        setPrescriptions(newPrescriptions);
    };

    const addPrescriptionLine = () => {
        setPrescriptions([...prescriptions, { productName: '', dose: '', frequency: '', duration: '' }]);
    };

    const removePrescriptionLine = (index) => {
        setPrescriptions(prescriptions.filter((_, i) => i !== index));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const recipeData = {
            prescribedBy,
            generalIndications,
            prescriptions: prescriptions.filter(p => p.productName),
        };
        onSave(recipeData).finally(() => setIsSubmitting(false));
    };

    if (!isOpen) return null;

    return (
        <div className="agenda-modal-overlay">
            <div className="agenda-modal-content recipe-modal">
                <div className="modal-header">
                    <h3>Nueva Receta Clínica</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="prescribedBy">Recetado por:</label>
                        <input id="prescribedBy" type="text" value={prescribedBy} onChange={(e) => setPrescribedBy(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="generalIndications">Indicaciones Generales</label>
                        <textarea id="generalIndications" value={generalIndications} onChange={(e) => setGeneralIndications(e.target.value)} />
                    </div>
                    
                    <h4>Prescripciones</h4>
                    <div className="prescription-list">
                        {prescriptions.map((p, index) => (
                            <div key={index} className="prescription-item">
                                <input type="text" placeholder="Producto/Medicación" value={p.productName} onChange={(e) => handlePrescriptionChange(index, 'productName', e.target.value)} required />
                                <input type="text" placeholder="Dosis" value={p.dose} onChange={(e) => handlePrescriptionChange(index, 'dose', e.target.value)} required />
                                <input type="text" placeholder="Frecuencia" value={p.frequency} onChange={(e) => handlePrescriptionChange(index, 'frequency', e.target.value)} required />
                                <input type="text" placeholder="Duración" value={p.duration} onChange={(e) => handlePrescriptionChange(index, 'duration', e.target.value)} required />
                                <button type="button" className="remove-line-btn" onClick={() => removePrescriptionLine(index)}><FaTrash/></button>
                            </div>
                        ))}
                    </div>
                    <button type="button" className="add-line-btn" onClick={addPrescriptionLine}><FaPlus /> Agregar Línea</button>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Receta'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateRecipeModal;