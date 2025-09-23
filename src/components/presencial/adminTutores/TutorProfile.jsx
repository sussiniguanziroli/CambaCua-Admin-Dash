import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';

// --- SVG Icons ---
const FaUserMd = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0 96 57.3 96 128s57.3 128 128 128zm96 32h-16.7c-22.2 10.2-46.9 16-71.3 16s-49.1-5.8-71.3-16H128c-70.7 0-128 57.3-128 128v48c0 17.7 14.3 32 32 32h384c17.7 0 32-14.3 32-32v-48c0-70.7-57.3-128-128-128z"></path></svg>;
const FaDog = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M224 160c-15.6-15.6-40.9-15.6-56.6 0-11.2 11.2-13.8 27.6-6.8 41.5l22.3 44.6-22.3 44.6c-7 13.9-4.3 30.3 6.8 41.5 15.6 15.6 40.9 15.6 56.6 0l22.6-22.6-22.6-22.6c-15.6-15.6-15.6-40.9 0-56.6l22.6-22.6-22.6-22.6zM576 224c0-78.8-63.1-142.4-140.8-143.9-74.3-1.4-136.2 56.1-136.2 128h-32c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h16v32h-16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h32.1c29.3 68.3 94.2 112 167.9 112 97.2 0 176-78.8 176-176zm-176 96c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zM0 352v-16c0-8.8 7.2-16 16-16h32v-32H16c-8.8 0-16-7.2-16-16v-32c0-8.8 7.2-16 16-16h64c0-53 43-96 96-96h16c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16h-16C83.1 48 0 131.1 0 224v128zm128-96c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z"></path></svg>;
const FaCat = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M256 160c-19.6 0-37.5 7.1-51.5 19.3l-1.8 1.6c-1.1.9-2.2 1.8-3.3 2.8-17.2 15.3-26.4 37.4-26.4 60.3 0 44.2 35.8 80 80 80s80-35.8 80-80c0-22.9-9.2-45-26.4-60.3l-3.3-2.8-1.8-1.6C293.5 167.1 275.6 160 256 160zm-96 96c0-23.7 9.6-45.5 26.9-61.4 2.4-2.2 4.9-4.3 7.5-6.3l1.8-1.4c1-1 2-2 3.1-2.9 4.3-3.8 9.2-7 14.4-9.5 2.6-1.3 5.3-2.4 8-3.3 1-.3 2-.6 3-.9 11.8-3.4 24.5-5.2 37.8-5.2s26 1.8 37.8 5.2c1 .3 2 .6 3 .9 2.7.9 5.4 2 8 3.3 5.3 2.5 10.1 5.7 14.4 9.5 1.1.9 2.1 1.9 3.1 2.9l1.8 1.4c2.6 2 5.1 4.1 7.5 6.3C406.4 210.5 416 232.3 416 256s-9.6 45.5-26.9 61.4c-2.4 2.2-4.9 4.3-7.5 6.3l-1.8 1.4c-1 1-2 2-3.1 2.9-4.3 3.8-9.2 7-14.4 9.5-2.6 1.3-5.3 2.4-8 3.3-1 .3-2 .6-3 .9-11.8 3.4-24.5 5.2-37.8 5.2s-26-1.8-37.8-5.2c-1-.3-2-.6-3-.9-2.7-.9-5.4-2-8-3.3-5.3-2.5-10.1-5.7-14.4-9.5-1.1-.9-2.1-1.9-3.1-2.9l-1.8-1.4c-2.6-2-5.1-4.1-7.5-6.3C169.6 301.5 160 279.7 160 256zM448 96h-64l-64-64v134.4c0 53 43 96 96 96h64c17.7 0 32-14.3 32-32V128c0-17.7-14.3-32-32-32zM192 32L128 96H64c-17.7 0-32 14.3-32 32v102.4c0 53 43 96 96 96h64l64 64V96h-64z"></path></svg>;

const TutorProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tutor, setTutor] = useState(null);
    const [pacientes, setPacientes] = useState([]);
    const [citas, setCitas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('details');

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const tutorRef = doc(db, 'tutores', id);
            const tutorSnap = await getDoc(tutorRef);

            if (!tutorSnap.exists()) {
                Swal.fire('Error', 'Tutor no encontrado.', 'error');
                navigate('/admin/tutores');
                return;
            }
            const tutorData = { id: tutorSnap.id, ...tutorSnap.data() };
            setTutor(tutorData);

            // Fetch related data in parallel
            const [pacientesSnap, citasSnap] = await Promise.all([
                tutorData.pacienteIds && tutorData.pacienteIds.length > 0
                    ? getDocs(query(collection(db, 'pacientes'), where('__name__', 'in', tutorData.pacienteIds)))
                    : Promise.resolve({ docs: [] }),
                getDocs(query(collection(db, 'citas'), where('tutorId', '==', id)))
            ]);

            setPacientes(pacientesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setCitas(citasSnap.docs.map(d => ({ id: d.id, ...d.data(), startTime: d.data().startTime.toDate() })));

        } catch (error) {
            Swal.fire('Error', 'No se pudieron cargar los datos completos del tutor.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    if (isLoading) return <p className="loading-message">Cargando perfil del tutor...</p>;
    if (!tutor) return null;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'pacientes':
                return (
                    <div className="tab-content">
                        {pacientes.length > 0 ? (
                            pacientes.map(p => (
                                <div key={p.id} className="paciente-card-profile" onClick={() => navigate(`/admin/paciente-profile/${p.id}`)}>
                                    {p.species?.toLowerCase().includes('perro') ? <FaDog/> : <FaCat/>}
                                    <div>
                                        <p className="paciente-name">{p.name}</p>
                                        <p className="paciente-breed">{p.breed || p.species}</p>
                                    </div>
                                </div>
                            ))
                        ) : <p>No hay pacientes registrados.</p>}
                    </div>
                );
            case 'citas':
                return (
                    <div className="tab-content">
                        {citas.length > 0 ? (
                             citas.sort((a,b) => b.startTime - a.startTime).map(c => (
                                <div key={c.id} className="cita-card">
                                    <p><strong>Paciente:</strong> {c.pacienteName}</p>
                                    <p><strong>Fecha:</strong> {c.startTime.toLocaleDateString('es-AR')}</p>
                                    <p><strong>Servicios:</strong> {c.services?.map(s => s.nombre).join(', ') || 'N/A'}</p>
                                </div>
                             ))
                        ) : <p>No hay citas registradas.</p>}
                    </div>
                );
            case 'cuenta':
                 return (
                    <div className="tab-content">
                       <div className="account-balance-card">
                         <h3>Saldo de Cuenta Corriente</h3>
                         <p className={`balance-amount ${tutor.accountBalance < 0 ? 'deudor' : ''}`}>
                            ${tutor.accountBalance?.toFixed(2) || '0.00'}
                         </p>
                         {/* Add transaction history here in the future */}
                       </div>
                    </div>
                );
            default: // details
                return (
                    <div className="tab-content details-grid">
                        <div className="detail-item"><span>DNI</span><p>{tutor.dni || 'No provisto'}</p></div>
                        <div className="detail-item"><span>Email</span><p>{tutor.email || 'No provisto'}</p></div>
                        <div className="detail-item"><span>Tel. Principal</span><p>{tutor.phone || 'No provisto'}</p></div>
                        <div className="detail-item"><span>Tel. Secundario</span><p>{tutor.secondaryPhone || 'No provisto'}</p></div>
                        <div className="detail-item full-width"><span>Dirección</span><p>{tutor.address || 'No provista'}</p></div>
                        <hr className="full-width"/>
                        <div className="detail-item"><span>Razón Social</span><p>{tutor.billingInfo?.razonSocial || 'No provista'}</p></div>
                        <div className="detail-item"><span>CUIT/CUIL</span><p>{tutor.billingInfo?.cuit || 'No provisto'}</p></div>
                        <div className="detail-item"><span>Cond. Fiscal</span><p>{tutor.billingInfo?.condicionFiscal || 'No provista'}</p></div>
                    </div>
                );
        }
    };

    return (
        <div className="profile-container">
            <div className="profile-header">
                <div className="profile-avatar"><FaUserMd /></div>
                <div className="profile-info">
                    <h1>{tutor.name}</h1>
                    <p>{tutor.email}</p>
                </div>
                <div className="profile-actions">
                     <Link to={`/admin/edit-tutor/${tutor.id}`} className="btn btn-secondary">Editar Tutor</Link>
                     <button className="btn btn-primary" onClick={() => navigate(`/admin/add-paciente?tutorId=${id}`)}>+ Agregar Paciente</button>
                </div>
            </div>

            <div className="profile-nav">
                <button className={activeTab === 'details' ? 'active' : ''} onClick={() => setActiveTab('details')}>Detalles</button>
                <button className={activeTab === 'pacientes' ? 'active' : ''} onClick={() => setActiveTab('pacientes')}>Pacientes ({pacientes.length})</button>
                <button className={activeTab === 'citas' ? 'active' : ''} onClick={() => setActiveTab('citas')}>Citas ({citas.length})</button>
                <button className={activeTab === 'cuenta' ? 'active' : ''} onClick={() => setActiveTab('cuenta')}>Cuenta Corriente</button>
            </div>

            <div className="profile-content">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default TutorProfile;
