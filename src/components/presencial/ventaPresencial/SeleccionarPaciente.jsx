import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';

const SeleccionarPaciente = ({ onPatientSelected, prevStep, tutor }) => {
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (tutor?.id) {
            const fetchPatients = async () => {
                setIsLoading(true);
                const patientsQuery = query(collection(db, 'patients'), where("tutorId", "==", tutor.id));
                const patientsSnapshot = await getDocs(patientsQuery);
                const patientsList = patientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPatients(patientsList);
                setIsLoading(false);
            };
            fetchPatients();
        }
    }, [tutor]);

    return (
        <div className="seleccionar-paciente">
            <h2>Paso 2: Seleccionar Paciente</h2>
            <div className="tutor-info">
                Tutor seleccionado: <strong>{tutor?.name || 'Ninguno'}</strong>
            </div>
            {isLoading ? <p>Buscando pacientes...</p> : (
                 <ul className="selection-list">
                    {patients.length > 0 ? patients.map(patient => (
                        <li 
                            key={patient.id} 
                            onClick={() => setSelectedPatient(patient)} 
                            className={selectedPatient?.id === patient.id ? 'selected' : ''}
                        >
                            {patient.name}
                        </li>
                    )) : <p>Este tutor no tiene pacientes registrados.</p>}
                </ul>
            )}
            <div className="navigator-buttons">
                <button onClick={prevStep} className="btn-secondary">Anterior</button>
                <button onClick={() => onPatientSelected(selectedPatient)} disabled={!selectedPatient}>Siguiente</button>
            </div>
        </div>
    );
};

export default SeleccionarPaciente;

