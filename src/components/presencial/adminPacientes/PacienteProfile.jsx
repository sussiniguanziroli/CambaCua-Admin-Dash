import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';

// --- SVG Icons ---
const FaDog = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M224 160c-15.6-15.6-40.9-15.6-56.6 0-11.2 11.2-13.8 27.6-6.8 41.5l22.3 44.6-22.3 44.6c-7 13.9-4.3 30.3 6.8 41.5 15.6 15.6 40.9 15.6 56.6 0l22.6-22.6-22.6-22.6c-15.6-15.6-15.6-40.9 0-56.6l22.6-22.6-22.6-22.6zM576 224c0-78.8-63.1-142.4-140.8-143.9-74.3-1.4-136.2 56.1-136.2 128h-32c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h16v32h-16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h32.1c29.3 68.3 94.2 112 167.9 112 97.2 0 176-78.8 176-176zm-176 96c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zM0 352v-16c0-8.8 7.2-16 16-16h32v-32H16c-8.8 0-16-7.2-16-16v-32c0-8.8 7.2-16 16-16h64c0-53 43-96 96-96h16c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16h-16C83.1 48 0 131.1 0 224v128zm128-96c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z"></path></svg>;
const FaCat = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M256 160c-19.6 0-37.5 7.1-51.5 19.3l-1.8 1.6c-1.1.9-2.2 1.8-3.3 2.8-17.2 15.3-26.4 37.4-26.4 60.3 0 44.2 35.8 80 80 80s80-35.8 80-80c0-22.9-9.2-45-26.4-60.3l-3.3-2.8-1.8-1.6C293.5 167.1 275.6 160 256 160zm-96 96c0-23.7 9.6-45.5 26.9-61.4 2.4-2.2 4.9-4.3 7.5-6.3l1.8-1.4c1-1 2-2 3.1-2.9 4.3-3.8 9.2-7 14.4-9.5 2.6-1.3 5.3-2.4 8-3.3 1-.3 2-.6 3-.9 11.8-3.4 24.5-5.2 37.8-5.2s26 1.8 37.8 5.2c1 .3 2 .6 3 .9 2.7.9 5.4 2 8 3.3 5.3 2.5 10.1 5.7 14.4 9.5 1.1.9 2.1 1.9 3.1 2.9l1.8 1.4c2.6 2 5.1 4.1 7.5 6.3C406.4 210.5 416 232.3 416 256s-9.6 45.5-26.9 61.4c-2.4 2.2-4.9 4.3-7.5 6.3l-1.8 1.4c-1 1-2 2-3.1 2.9-4.3 3.8-9.2 7-14.4 9.5-2.6 1.3-5.3 2.4-8 3.3-1 .3-2 .6-3 .9-11.8 3.4-24.5 5.2-37.8 5.2s-26-1.8-37.8-5.2c-1-.3-2-.6-3-.9-2.7-.9-5.4-2-8-3.3-5.3-2.5-10.1-5.7-14.4-9.5-1.1-.9-2.1-1.9-3.1-2.9l-1.8-1.4c-2.6-2-5.1-4.1-7.5-6.3C169.6 301.5 160 279.7 160 256zM448 96h-64l-64-64v134.4c0 53 43 96 96 96h64c17.7 0 32-14.3 32-32V128c0-17.7-14.3-32-32-32zM192 32L128 96H64c-17.7 0-32 14.3-32 32v102.4c0 53 43 96 96 96h64l64 64V96h-64z"></path></svg>;

// --- Internal Component: AddClinicalNoteModal ---
const AddClinicalNoteModal = ({ isOpen, onClose, onSave }) => {
    const [noteData, setNoteData] = useState({ reason: '', diagnosis: '', treatment: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setNoteData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        onSave(noteData).finally(() => setIsSubmitting(false));
    };

    if (!isOpen) return null;

    return (
        <div className="agenda-modal-overlay">
            <div className="agenda-modal-content">
                <div className="modal-header">
                    <h3>Agregar Nota a Historia Clínica</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group"><label>Motivo de la Consulta</label><input type="text" name="reason" value={noteData.reason} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Diagnóstico</label><textarea name="diagnosis" value={noteData.diagnosis} onChange={handleChange}></textarea></div>
                    <div className="form-group"><label>Tratamiento</label><textarea name="treatment" value={noteData.treatment} onChange={handleChange}></textarea></div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Nota'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const PacienteProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [paciente, setPaciente] = useState(null);
    const [citas, setCitas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('historia');
    const [error, setError] = useState(null);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

    const calculateAge = (birthDate) => {
        if (!birthDate) return 'N/A';
        const today = new Date();
        const birth = new Date(birthDate);
        let age_y = today.getFullYear() - birth.getFullYear();
        let age_m = today.getMonth() - birth.getMonth();
        if (age_m < 0 || (age_m === 0 && today.getDate() < birth.getDate())) {
            age_y--;
            age_m = 12 + age_m;
        }
        return `${age_y} años y ${age_m} meses`;
    };
    
    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const pacienteRef = doc(db, 'pacientes', id);
            const pacienteSnap = await getDoc(pacienteRef);

            if (!pacienteSnap.exists()) {
                setError('Paciente no encontrado.');
                setTimeout(() => navigate('/admin/pacientes'), 2000);
                return;
            }
             const pacienteData = { id: pacienteSnap.id, ...pacienteSnap.data() };
            setPaciente(pacienteData);

            const citasQuery = query(
                collection(db, 'citas'),
                where('pacienteId', '==', id),
                orderBy('startTime', 'desc')
            );
            const citasSnap = await getDocs(citasQuery);
            setCitas(citasSnap.docs.map(d => ({ id: d.id, ...d.data(), startTime: d.data().startTime.toDate() })));

        } catch (err) {
            console.error("Error fetching data: ", err);
            setError('No se pudieron cargar los datos del paciente.');
        } finally {
            setIsLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    const handleSaveClinicalNote = async (noteData) => {
        const newEntry = {
            ...noteData,
            date: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        };
        try {
            const pacienteRef = doc(db, 'pacientes', id);
            await updateDoc(pacienteRef, {
                clinicalHistory: arrayUnion(newEntry)
            });
            Swal.fire('Éxito', 'Nota agregada a la historia clínica.', 'success');
            setIsNoteModalOpen(false);
            fetchAllData(); // Refresh data to show new note
        } catch (error) {
            console.error("Error adding clinical note: ", error);
            Swal.fire('Error', 'No se pudo guardar la nota.', 'error');
        }
    };

    if (isLoading) return <p className="loading-message">Cargando perfil del paciente...</p>;
    if (error) return <p className="error-message">{error}</p>;
    if (!paciente) return null;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'historia':
                const clinicalHistory = paciente.clinicalHistory || [];
                return (
                    <div className="tab-content">
                        {clinicalHistory.length > 0 ? (
                            <div className="clinical-history-list">
                                {clinicalHistory.slice().reverse().map((entry, index) => (
                                    <div key={index} className="clinical-entry-card">
                                        <div className="entry-header">
                                            <span className="entry-date">{entry.date}</span>
                                            <strong className="entry-reason">{entry.reason}</strong>
                                        </div>
                                        <div className="entry-body">
                                            <p><strong>Diagnóstico:</strong> {entry.diagnosis || 'N/A'}</p>
                                            <p><strong>Tratamiento:</strong> {entry.treatment || 'N/A'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="no-results-message">No hay entradas en la historia clínica.</p>}
                    </div>
                );
            case 'citas':
                return (
                    <div className="tab-content">
                        {citas.length > 0 ? (
                            citas.map(cita => (
                                <div key={cita.id} className="cita-card">
                                    <p><strong>Fecha:</strong> {cita.startTime.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })} hs</p>
                                    <p><strong>Servicios:</strong> {cita.services?.map(s => s.nombre).join(', ') || 'Consulta General'}</p>
                                    <p><strong>Notas:</strong> {cita.notes || 'Sin notas.'}</p>
                                </div>
                            ))
                        ) : <p className="no-results-message">No hay citas registradas para este paciente.</p>}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="profile-container paciente-profile">
            <AddClinicalNoteModal 
                isOpen={isNoteModalOpen}
                onClose={() => setIsNoteModalOpen(false)}
                onSave={handleSaveClinicalNote}
            />

            <div className="profile-header">
                 <div className="profile-avatar">
                    {paciente.species?.toLowerCase().includes('perro') ? <FaDog/> : <FaCat/>}
                </div>
                <div className="profile-info">
                    <h1>{paciente.name}</h1>
                    <p>Tutor: <Link to={`/admin/tutor-profile/${paciente.tutorId}`}>{paciente.tutorName}</Link></p>
                </div>
                <div className="profile-actions">
                     <Link to={`/admin/edit-paciente/${paciente.id}`} className="btn btn-secondary">Editar Paciente</Link>
                     <button className="btn btn-primary" onClick={() => setIsNoteModalOpen(true)}>+ Agregar Nota Clínica</button>
                </div>
            </div>

            <div className="details-bar">
                <div className="detail-chip"><strong>Especie:</strong> {paciente.species}</div>
                <div className="detail-chip"><strong>Raza:</strong> {paciente.breed}</div>
                <div className="detail-chip"><strong>Sexo:</strong> {paciente.gender || 'N/A'}</div>
                <div className="detail-chip"><strong>Edad:</strong> {calculateAge(paciente.birthDate)}</div>
                <div className="detail-chip"><strong>Peso:</strong> {paciente.weight ? `${paciente.weight} kg` : 'N/A'}</div>
                <div className="detail-chip"><strong>Chip:</strong> {paciente.chipNumber || 'N/A'}</div>
            </div>

            <div className="profile-nav">
                <button className={activeTab === 'historia' ? 'active' : ''} onClick={() => setActiveTab('historia')}>Historia Clínica</button>
                <button className={activeTab === 'citas' ? 'active' : ''} onClick={() => setActiveTab('citas')}>Citas ({citas.length})</button>
            </div>

            <div className="profile-content">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default PacienteProfile;

