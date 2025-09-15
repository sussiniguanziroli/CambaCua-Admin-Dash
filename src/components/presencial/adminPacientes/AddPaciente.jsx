import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';

const AddPaciente = () => {
    const navigate = useNavigate();
    const [pacienteData, setPacienteData] = useState({
        name: '',
        species: '',
        breed: '',
        birthDate: '',
        tutorId: '',
    });
    const [tutores, setTutores] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingTutores, setIsLoadingTutores] = useState(true);

    useEffect(() => {
        const fetchTutores = async () => {
            setIsLoadingTutores(true);
            try {
                const snapshot = await getDocs(collection(db, 'tutores'));
                const tutorsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTutores(tutorsList);
            } catch (error) {
                Swal.fire('Error', 'No se pudieron cargar los tutores.', 'error');
            } finally {
                setIsLoadingTutores(false);
            }
        };
        fetchTutores();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPacienteData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!pacienteData.tutorId) {
            Swal.fire('Campo Requerido', 'Debe seleccionar un tutor.', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            const selectedTutor = tutores.find(t => t.id === pacienteData.tutorId);
            const docRef = await addDoc(collection(db, 'pacientes'), {
                ...pacienteData,
                tutorName: selectedTutor.name,
                createdAt: serverTimestamp()
            });

            const tutorRef = doc(db, 'tutores', pacienteData.tutorId);
            await updateDoc(tutorRef, {
                pacienteIds: arrayUnion(docRef.id)
            });

            Swal.fire('Éxito', 'Paciente agregado y vinculado al tutor.', 'success');
            navigate('/admin/pacientes');
        } catch (error) {
            console.error("Error adding patient: ", error);
            Swal.fire('Error', 'No se pudo agregar el paciente.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="presential-form-container">
            <h2>Agregar Nuevo Paciente (Mascota)</h2>
            <form onSubmit={handleSubmit} className="presential-form">
                <div className="form-group">
                    <label htmlFor="tutorId">Tutor</label>
                    <select id="tutorId" name="tutorId" value={pacienteData.tutorId} onChange={handleChange} required disabled={isLoadingTutores}>
                        <option value="">{isLoadingTutores ? 'Cargando...' : 'Seleccionar Tutor'}</option>
                        {tutores.map(tutor => (
                            <option key={tutor.id} value={tutor.id}>{tutor.name}</option>
                        ))}
                    </select>
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
                    {isSubmitting ? 'Agregando...' : 'Agregar Paciente'}
                </button>
            </form>
        </div>
    );
};

export default AddPaciente;
