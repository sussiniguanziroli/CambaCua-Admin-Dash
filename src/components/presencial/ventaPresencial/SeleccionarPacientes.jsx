// SeleccionarPacientes.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { FaDog, FaCat } from 'react-icons/fa';

const SeleccionarPacientes = ({ onPatientsSelected, onSkipPatients, prevStep, tutor }) => {
    const [patients, setPatients] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!tutor?.id) { setPatients([]); return; }
        const fetch = async () => {
            setIsLoading(true);
            try {
                const q = query(collection(db, 'pacientes'), where('tutorId', '==', tutor.id));
                const snap = await getDocs(q);
                setPatients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (e) { console.error(e); }
            finally { setIsLoading(false); }
        };
        fetch();
    }, [tutor]);

    const togglePatient = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        setSelectedIds(prev =>
            prev.size === patients.length ? new Set() : new Set(patients.map(p => p.id))
        );
    };

    const handleConfirm = () => {
        onPatientsSelected(patients.filter(p => selectedIds.has(p.id)));
    };

    return (
        <div className="venta-step-container venta-selection-container">
            <h2>Paso 2: Seleccionar Pacientes</h2>
            <div className="venta-context-info">
                Tutor: <strong>{tutor?.name || 'Ninguno'}</strong>
            </div>
            <p className="seleccionar-pacientes-subtitle">
                Podés seleccionar uno o varios pacientes para esta venta.
            </p>

            {isLoading ? (
                <p>Buscando pacientes...</p>
            ) : patients.length === 0 ? (
                <div className="seleccionar-pacientes-empty">
                    Este tutor no tiene pacientes registrados.
                </div>
            ) : (
                <div className="seleccionar-pacientes-list-wrapper">
                    <div className="seleccionar-pacientes-select-all" onClick={toggleAll}>
                        <div className={`sp-checkbox ${selectedIds.size === patients.length ? 'checked' : selectedIds.size > 0 ? 'indeterminate' : ''}`}>
                            {selectedIds.size === patients.length && <span>✓</span>}
                            {selectedIds.size > 0 && selectedIds.size < patients.length && <span>—</span>}
                        </div>
                        <span className="sp-select-all-label">
                            {selectedIds.size === patients.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                        </span>
                        <span className="sp-count">{patients.length} paciente{patients.length !== 1 ? 's' : ''}</span>
                    </div>

                    <ul className="venta-selection-list seleccionar-pacientes-list">
                        {patients.map(patient => {
                            const isSelected = selectedIds.has(patient.id);
                            return (
                                <li
                                    key={patient.id}
                                    onClick={() => togglePatient(patient.id)}
                                    className={isSelected ? 'selected' : ''}
                                >
                                    <div className={`sp-checkbox ${isSelected ? 'checked' : ''}`}>
                                        {isSelected && <span>✓</span>}
                                    </div>
                                    <span className="sp-species-icon">
                                        {patient.species === 'Canino' ? <FaDog /> : <FaCat />}
                                    </span>
                                    <div className="sp-patient-info">
                                        <span className="sp-patient-name">{patient.name}</span>
                                        <span className="sp-patient-meta">{patient.species} · {patient.breed || 'Sin raza'}</span>
                                    </div>
                                    {isSelected && <span className="sp-selected-badge">Seleccionado</span>}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {selectedIds.size > 0 && (
                <div className="seleccionar-pacientes-info-banner">
                    <strong>{selectedIds.size}</strong> paciente{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}.
                    Los vencimientos y la historia clínica se registrarán para cada uno.
                </div>
            )}

            <div className="venta-navigator-buttons">
                <button onClick={prevStep} className="btn btn-secondary">Anterior</button>
                <button onClick={onSkipPatients} className="btn btn-outline">Continuar sin Paciente</button>
                <button onClick={handleConfirm} className="btn btn-primary" disabled={selectedIds.size === 0}>
                    Siguiente
                </button>
            </div>
        </div>
    );
};

export default SeleccionarPacientes;