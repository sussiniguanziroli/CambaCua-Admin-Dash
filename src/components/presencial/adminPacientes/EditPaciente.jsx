import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';

const EditPaciente = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [pacienteData, setPacienteData] = useState({ name: '', species: '', breed: '', birthDate: '', tutorName: '' });
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
            const dataToUpdate = { ...pacienteData };
            delete dataToUpdate.tutorName; // Avoid updating read-only field if it's part of the state
            
            await updateDoc(doc(db, 'pacientes', id), dataToUpdate);
            Swal.fire('Éxito', 'Paciente actualizado correctamente.', 'success');
            navigate('/admin/pacientes');
        } catch (error) {
            console.error("Error updating paciente: ", error);
            Swal.fire('Error', 'No se pudo actualizar el paciente.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <p className="loading-message">Cargando datos del paciente...</p>;
    }

    return (
        <div className="presential-form-container">
            <h2>Editar Paciente (Mascota)</h2>
            <form onSubmit={handleSubmit} className="presential-form">
                 <div className="form-group">
                    <label>Tutor</label>
                    <input type="text" value={pacienteData.tutorName || 'N/A'} readOnly disabled />
                 </div>
                <div className="form-group">
                    <label htmlFor="name">Nombre del Paciente</label>
                    <input id="name" name="name" type="text" value={pacienteData.name} onChange={handleChange} required />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="species">Especie</label>
                        <input id="species" name="species" type="text" value={pacienteData.species} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="breed">Raza</label>
                        <input id="breed" name="breed" type="text" value={pacienteData.breed} onChange={handleChange} />
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="birthDate">Fecha de Nacimiento</label>
                    <input id="birthDate" name="birthDate" type="date" value={pacienteData.birthDate} onChange={handleChange} />
                </div>
                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Actualizando...' : 'Actualizar Paciente'}
                </button>
            </form>
        </div>
    );
};

export default EditPaciente;
