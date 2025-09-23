import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, addDoc, getDocs, doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';

const AddPaciente = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [pacienteData, setPacienteData] = useState({
        name: '', species: '', breed: '', birthDate: '', gender: 'Macho', 
        weight: '', chipNumber: '', clinicalNotes: '', tutorId: '',
    });
    const [tutores, setTutores] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingTutores, setIsLoadingTutores] = useState(true);

    useEffect(() => {
        const fetchTutores = async () => {
            setIsLoadingTutores(true);
            try {
                const snapshot = await getDocs(collection(db, 'tutores'));
                setTutores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                Swal.fire('Error', 'No se pudieron cargar los tutores.', 'error');
            } finally {
                setIsLoadingTutores(false);
            }
        };
        fetchTutores();

        const params = new URLSearchParams(location.search);
        const tutorIdFromUrl = params.get('tutorId');
        if (tutorIdFromUrl) {
            setPacienteData(prev => ({ ...prev, tutorId: tutorIdFromUrl }));
        }
    }, [location.search]);

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
            const dataToSave = {
                name: pacienteData.name,
                species: pacienteData.species,
                breed: pacienteData.breed,
                birthDate: pacienteData.birthDate,
                gender: pacienteData.gender,
                weight: pacienteData.weight || null,
                chipNumber: pacienteData.chipNumber,
                tutorId: pacienteData.tutorId,
                tutorName: selectedTutor.name,
                createdAt: serverTimestamp(),
                clinicalHistory: pacienteData.clinicalNotes 
                    ? [{ date: new Date().toLocaleDateString('es-AR'), reason: 'Registro inicial', diagnosis: 'N/A', treatment: pacienteData.clinicalNotes }] 
                    : []
            };

            const docRef = await addDoc(collection(db, 'pacientes'), dataToSave);
            const tutorRef = doc(db, 'tutores', pacienteData.tutorId);
            await updateDoc(tutorRef, { pacienteIds: arrayUnion(docRef.id) });

            Swal.fire('Éxito', 'Paciente agregado y vinculado al tutor.', 'success');
            navigate(`/admin/tutor-profile/${pacienteData.tutorId}`);
        } catch (error) {
            Swal.fire('Error', 'No se pudo agregar el paciente.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="paciente-form-container">
            <h2 className="paciente-form-title">Agregar Nuevo Paciente</h2>
            <form onSubmit={handleSubmit} className="paciente-styled-form">
                <fieldset className="paciente-form-fieldset">
                    <legend>Información Básica</legend>
                    <div className="paciente-form-group">
                        <label htmlFor="tutorId">Tutor</label>
                        <select id="tutorId" name="tutorId" value={pacienteData.tutorId} onChange={handleChange} required disabled={isLoadingTutores}>
                             <option value="">{isLoadingTutores ? 'Cargando...' : 'Seleccionar Tutor'}</option>
                             {tutores.map(tutor => <option key={tutor.id} value={tutor.id}>{tutor.name}</option>)}
                        </select>
                    </div>
                    <div className="paciente-form-group"><label htmlFor="name">Nombre</label><input id="name" name="name" type="text" value={pacienteData.name} onChange={handleChange} required /></div>
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
                    <div className="paciente-form-group"><label htmlFor="clinicalNotes">Notas Iniciales</label><textarea id="clinicalNotes" name="clinicalNotes" rows="4" value={pacienteData.clinicalNotes} onChange={handleChange}></textarea></div>
                </fieldset>
                <div className="paciente-form-actions">
                    <button type="submit" className="paciente-form-submit-btn" disabled={isSubmitting}>{isSubmitting ? 'Agregando...' : 'Agregar Paciente'}</button>
                </div>
            </form>
        </div>
    );
};

export default AddPaciente;

