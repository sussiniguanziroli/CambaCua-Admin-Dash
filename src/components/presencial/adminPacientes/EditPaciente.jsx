import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs, deleteField } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';

const EditPaciente = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [pacienteData, setPacienteData] = useState({
        name: '', species: '', breed: '', birthDate: '', gender: 'Macho',
        weight: '', chipNumber: '', tutorName: '', fallecido: false, 
        fechaFallecimiento: '', serviceTypes: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [especiesData, setEspeciesData] = useState({});
    const [razas, setRazas] = useState([]);
    const [isLoadingEspecies, setIsLoadingEspecies] = useState(true);

    const fetchEspeciesYRazas = useCallback(async () => {
        setIsLoadingEspecies(true);
        try { const snapshot = await getDocs(collection(db, 'db_especies_razas')); const data = {}; snapshot.forEach(doc => { const docData = doc.data(); data[docData.especie] = docData.razas.sort(); }); setEspeciesData(data); return data;
        } catch (error) { Swal.fire('Error', 'No se pudieron cargar las especies y razas.', 'error'); return {};
        } finally { setIsLoadingEspecies(false); }
    }, []);

    const fetchPaciente = useCallback(async (fetchedEspeciesData) => {
        setIsLoading(true);
        try {
            const pacienteRef = doc(db, 'pacientes', id);
            const pacienteSnap = await getDoc(pacienteRef);
            if (pacienteSnap.exists()) {
                const data = pacienteSnap.data();
                setPacienteData({
                    ...data,
                    serviceTypes: data.serviceTypes || [],
                    fallecido: data.fallecido || false,
                    fechaFallecimiento: data.fechaFallecimiento || ''
                });
                if (data.species && fetchedEspeciesData[data.species]) { setRazas(fetchedEspeciesData[data.species]); }
            } else { Swal.fire('Error', 'Paciente no encontrado.', 'error'); navigate('/admin/pacientes'); }
        } catch (error) { Swal.fire('Error', 'No se pudieron cargar los datos del paciente.', 'error');
        } finally { setIsLoading(false); }
    }, [id, navigate]);

    useEffect(() => { const loadAllData = async () => { const fetchedEspeciesData = await fetchEspeciesYRazas(); await fetchPaciente(fetchedEspeciesData); }; loadAllData(); }, [fetchEspeciesYRazas, fetchPaciente]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        if (name === 'species') { setPacienteData(prev => ({ ...prev, species: value, breed: '' })); setRazas(especiesData[value] || []); } 
        else if (name === 'fallecido') { setPacienteData(prev => ({ ...prev, fallecido: checked, fechaFallecimiento: checked ? prev.fechaFallecimiento : '' })); } 
        else { setPacienteData(prev => ({ ...prev, [name]: val })); }
    };

    const handleServiceTypeChange = (e) => {
        const { value, checked } = e.target;
        setPacienteData(prev => {
            const currentServices = prev.serviceTypes || [];
            if (checked) { return { ...prev, serviceTypes: [...currentServices, value] }; }
            else { return { ...prev, serviceTypes: currentServices.filter(service => service !== value) }; }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { tutorName, createdAt, clinicalHistory, ...dataToUpdate } = pacienteData;
            if (dataToUpdate.fallecido) { dataToUpdate.fechaFallecimiento = dataToUpdate.fechaFallecimiento || new Date().toISOString().split('T')[0]; } 
            else { dataToUpdate.fallecido = deleteField(); dataToUpdate.fechaFallecimiento = deleteField(); }
            await updateDoc(doc(db, 'pacientes', id), dataToUpdate);
            Swal.fire('Éxito', 'Paciente actualizado correctamente.', 'success');
            navigate(`/admin/paciente-profile/${id}`);
        } catch (error) { Swal.fire('Error', 'No se pudo actualizar el paciente.', 'error');
        } finally { setIsSubmitting(false); }
    };

    if (isLoading) return <p className="loading-message">Cargando...</p>;

    return (
        <div className="paciente-form-container">
            <h2 className="paciente-form-title">Editar Paciente</h2>
            <form onSubmit={handleSubmit} className="paciente-styled-form">
                <fieldset className="paciente-form-fieldset">
                    <legend>Información Básica</legend>
                    <div className="paciente-form-group"><label>Tutor</label><input type="text" value={pacienteData.tutorName || 'N/A'} readOnly disabled /></div>
                    <div className="paciente-form-group"><label htmlFor="name">Nombre</label><input id="name" name="name" type="text" value={pacienteData.name} onChange={handleChange} required /></div>
                    <div className="paciente-form-row"><div className="paciente-form-group"><label htmlFor="species">Especie</label><select id="species" name="species" value={pacienteData.species} onChange={handleChange} required disabled={isLoadingEspecies}><option value="">{isLoadingEspecies ? 'Cargando...' : 'Seleccionar Especie'}</option>{Object.keys(especiesData).map(especie => <option key={especie} value={especie}>{especie}</option>)}</select></div><div className="paciente-form-group"><label htmlFor="breed">Raza</label><select id="breed" name="breed" value={pacienteData.breed} onChange={handleChange} disabled={!pacienteData.species}><option value="">Seleccionar Raza</option>{razas.map(raza => <option key={raza} value={raza}>{raza}</option>)}</select></div></div>
                    <div className="paciente-form-row"><div className="paciente-form-group"><label htmlFor="birthDate">Fecha de Nacimiento</label><input id="birthDate" name="birthDate" type="date" value={pacienteData.birthDate} onChange={handleChange} /></div><div className="paciente-form-group"><label htmlFor="gender">Sexo</label><select id="gender" name="gender" value={pacienteData.gender} onChange={handleChange}><option value="Macho">Macho</option><option value="Hembra">Hembra</option></select></div></div>
                </fieldset>
                <fieldset className="paciente-form-fieldset">
                    <legend>Datos Clínicos</legend>
                    <div className="paciente-form-row"><div className="paciente-form-group"><label htmlFor="weight">Peso (kg)</label><input id="weight" name="weight" type="number" step="0.1" value={pacienteData.weight} onChange={handleChange} /></div><div className="paciente-form-group"><label htmlFor="chipNumber">N° de Chip</label><input id="chipNumber" name="chipNumber" type="text" value={pacienteData.chipNumber} onChange={handleChange} /></div></div>
                    <div className="paciente-form-group"><label>Tipos de Servicio</label><div className="paciente-checkbox-group-horizontal"><div className="paciente-checkbox-item"><input id="serviceClinical" type="checkbox" value="clinical" checked={(pacienteData.serviceTypes || []).includes('clinical')} onChange={handleServiceTypeChange} /><label htmlFor="serviceClinical">Clínica</label></div><div className="paciente-checkbox-item"><input id="serviceGrooming" type="checkbox" value="grooming" checked={(pacienteData.serviceTypes || []).includes('grooming')} onChange={handleServiceTypeChange} /><label htmlFor="serviceGrooming">Peluquería</label></div></div></div>
                    <div className="paciente-form-group"><label htmlFor="fallecido" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><input id="fallecido" name="fallecido" type="checkbox" checked={pacienteData.fallecido} onChange={handleChange} style={{ width: 'auto' }} />Marcar como fallecido</label></div>
                    {pacienteData.fallecido && (<div className="paciente-form-group"><label htmlFor="fechaFallecimiento">Fecha de Fallecimiento</label><input id="fechaFallecimiento" name="fechaFallecimiento" type="date" value={pacienteData.fechaFallecimiento} onChange={handleChange} required /></div>)}
                </fieldset>
                <div className="paciente-form-actions"><button type="submit" className="paciente-form-submit-btn" disabled={isSubmitting}>{isSubmitting ? 'Actualizando...' : 'Actualizar Paciente'}</button></div>
            </form>
        </div>
    );
};

export default EditPaciente;