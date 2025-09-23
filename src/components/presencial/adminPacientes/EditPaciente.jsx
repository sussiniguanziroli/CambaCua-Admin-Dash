import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';

const EditPaciente = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [pacienteData, setPacienteData] = useState({
        name: '', species: '', breed: '', birthDate: '', gender: 'Macho',
        weight: '', chipNumber: '', tutorName: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchPaciente = useCallback(async () => {
        setIsLoading(true);
        try {
            const pacienteRef = doc(db, 'pacientes', id);
            const pacienteSnap = await getDoc(pacienteRef);
            if (pacienteSnap.exists()) {
                setPacienteData(pacienteSnap.data());
            } else {
                Swal.fire('Error', 'Paciente no encontrado.', 'error');
                navigate('/admin/pacientes');
            }
        } catch (error) {
            Swal.fire('Error', 'No se pudieron cargar los datos del paciente.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchPaciente();
    }, [fetchPaciente]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPacienteData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { tutorName, createdAt, clinicalHistory, ...dataToUpdate } = pacienteData;
            await updateDoc(doc(db, 'pacientes', id), dataToUpdate);
            Swal.fire('Éxito', 'Paciente actualizado correctamente.', 'success');
            navigate(`/admin/paciente-profile/${id}`);
        } catch (error) {
            Swal.fire('Error', 'No se pudo actualizar el paciente.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <p className="loading-message">Cargando...</p>;

    return (
        <div className="paciente-form-container">
            <h2 className="paciente-form-title">Editar Paciente</h2>
            <form onSubmit={handleSubmit} className="paciente-styled-form">
                <fieldset className="paciente-form-fieldset">
                    <legend>Información Básica</legend>
                    <div className="paciente-form-group">
                        <label>Tutor</label>
                        <input type="text" value={pacienteData.tutorName || 'N/A'} readOnly disabled />
                    </div>
                    <div className="paciente-form-group">
                        <label htmlFor="name">Nombre</label>
                        <input id="name" name="name" type="text" value={pacienteData.name} onChange={handleChange} required />
                    </div>
                    <div className="paciente-form-row">
                        <div className="paciente-form-group"><label htmlFor="species">Especie</label><input id="species" name="species" type="text" value={pacienteData.species} onChange={handleChange} required /></div>
                        <div className="paciente-form-group"><label htmlFor="breed">Raza</label><input id="breed" name="breed" type="text" value={pacienteData.breed} onChange={handleChange} /></div>
                    </div>
                     <div className="paciente-form-row">
                        <div className="paciente-form-group"><label htmlFor="birthDate">Fecha de Nacimiento</label><input id="birthDate" name="birthDate" type="date" value={pacienteData.birthDate} onChange={handleChange} /></div>
                        <div className="paciente-form-group"><label htmlFor="gender">Sexo</label><select id="gender" name="gender" value={pacienteData.gender} onChange={handleChange}><option value="Macho">Macho</option><option value="Hembra">Hembra</option></select></div>
                    </div>
                </fieldset>
                <fieldset className="paciente-form-fieldset">
                    <legend>Datos Clínicos</legend>
                     <div className="paciente-form-row">
                        <div className="paciente-form-group"><label htmlFor="weight">Peso (kg)</label><input id="weight" name="weight" type="number" step="0.1" value={pacienteData.weight} onChange={handleChange} /></div>
                        <div className="paciente-form-group"><label htmlFor="chipNumber">N° de Chip</label><input id="chipNumber" name="chipNumber" type="text" value={pacienteData.chipNumber} onChange={handleChange} /></div>
                    </div>
                </fieldset>
                <div className="paciente-form-actions">
                    <button type="submit" className="paciente-form-submit-btn" disabled={isSubmitting}>{isSubmitting ? 'Actualizando...' : 'Actualizar Paciente'}</button>
                </div>
            </form>
        </div>
    );
};

export default EditPaciente;

