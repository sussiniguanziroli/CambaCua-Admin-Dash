import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import LinkUserModal from './LinkUserModal';
import { db } from '../../../firebase/config';

// --- SVG Icons ---
const FaTimes = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 352 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.19 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.19 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path></svg>;
const FaDog = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M224 160c-15.6-15.6-40.9-15.6-56.6 0-11.2 11.2-13.8 27.6-6.8 41.5l22.3 44.6-22.3 44.6c-7 13.9-4.3 30.3 6.8 41.5 15.6 15.6 40.9 15.6 56.6 0l22.6-22.6-22.6-22.6c-15.6-15.6-15.6-40.9 0-56.6l22.6-22.6-22.6-22.6zM576 224c0-78.8-63.1-142.4-140.8-143.9-74.3-1.4-136.2 56.1-136.2 128h-32c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h16v32h-16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h32.1c29.3 68.3 94.2 112 167.9 112 97.2 0 176-78.8 176-176zm-176 96c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zM0 352v-16c0-8.8 7.2-16 16-16h32v-32H16c-8.8 0-16-7.2-16-16v-32c0-8.8 7.2-16 16-16h64c0-53 43-96 96-96h16c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16h-16C83.1 48 0 131.1 0 224v128zm128-96c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z"></path></svg>;
const FaCat = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M256 160c-19.6 0-37.5 7.1-51.5 19.3l-1.8 1.6c-1.1.9-2.2 1.8-3.3 2.8-17.2 15.3-26.4 37.4-26.4 60.3 0 44.2 35.8 80 80 80s80-35.8 80-80c0-22.9-9.2-45-26.4-60.3l-3.3-2.8-1.8-1.6C293.5 167.1 275.6 160 256 160zm-96 96c0-23.7 9.6-45.5 26.9-61.4 2.4-2.2 4.9-4.3 7.5-6.3l1.8-1.4c1-1 2-2 3.1-2.9 4.3-3.8 9.2-7 14.4-9.5 2.6-1.3 5.3-2.4 8-3.3 1-.3 2-.6 3-.9 11.8-3.4 24.5-5.2 37.8-5.2s26 1.8 37.8 5.2c1 .3 2 .6 3 .9 2.7.9 5.4 2 8 3.3 5.3 2.5 10.1 5.7 14.4 9.5 1.1.9 2.1 1.9 3.1 2.9l1.8 1.4c2.6 2 5.1 4.1 7.5 6.3C406.4 210.5 416 232.3 416 256s-9.6 45.5-26.9 61.4c-2.4 2.2-4.9 4.3-7.5 6.3l-1.8 1.4c-1 1-2 2-3.1 2.9-4.3 3.8-9.2 7-14.4 9.5-2.6 1.3-5.3 2.4-8 3.3-1 .3-2 .6-3 .9-11.8 3.4-24.5 5.2-37.8 5.2s-26-1.8-37.8-5.2c-1-.3-2-.6-3-.9-2.7-.9-5.4-2-8-3.3-5.3-2.5-10.1-5.7-14.4-9.5-1.1-.9-2.1-1.9-3.1-2.9l-1.8-1.4c-2.6-2-5.1-4.1-7.5-6.3C169.6 301.5 160 279.7 160 256zM448 96h-64l-64-64v134.4c0 53 43 96 96 96h64c17.7 0 32-14.3 32-32V128c0-17.7-14.3-32-32-32zM192 32L128 96H64c-17.7 0-32 14.3-32 32v102.4c0 53 43 96 96 96h64l64 64V96h-64z"></path></svg>;
const FaLink = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M326.612 185.391c59.747 59.809 58.927 155.698.36 214.59-.11.12-.24.25-.36.37l-67.2 67.2c-59.27 59.27-155.699 59.262-214.96 0-59.27-59.26-59.27-155.7 0-214.96l37.106-37.106c9.84-9.84 26.786-3.3 27.294 10.606.648 17.722 3.826 35.527 9.69 52.721 1.986 5.822.56 12.421-3.645 16.571l-13.661 13.661c-12.88 12.88-12.879 33.805 0 46.685 12.88 12.88 33.806 12.88 46.685 0l67.2-67.2c12.88-12.88 12.88-33.806 0-46.685s-33.806-12.88-46.685 0l-13.661 13.661c-4.205 4.148-10.749 5.625-16.571 3.645-17.194-5.864-34.999-9.041-52.721-9.69-13.906-.508-20.447-17.454-10.606-27.294l37.106-37.106c59.271-59.259 155.699-59.26 214.96 0zM422.9 221.7c-59.269-59.269-155.699-59.269-214.96 0l-37.106 37.106c-9.84 9.84-3.3 26.786 10.606 27.294.648 17.722 3.826 35.527 9.69 52.721 1.986 5.822.56 12.421-3.645 16.571l-13.661 13.661c-12.88 12.88-12.879 33.805 0 46.685 12.88 12.88 33.806 12.88 46.685 0l67.2-67.2c12.88-12.88 12.88-33.806 0-46.685s-33.806-12.88-46.685 0l-13.661 13.661c-4.205 4.148-10.749 5.625-16.571 3.645-17.194-5.864-34.999-9.041-52.721-9.69-13.906-.508-20.447-17.454-10.606-27.294l37.106-37.106c59.271-59.259 155.699-59.26 214.96 0 59.747 59.809 58.927 155.698.36 214.59-.11.12-.24.25-.36.37l-67.2 67.2c-59.27 59.27-155.699 59.262-214.96 0-59.27-59.26-59.27-155.7 0-214.96l37.106-37.106c9.84-9.84 26.786-3.3 27.294 10.606.648 17.722 3.826 35.527 9.69 52.721 1.986 5.822.56 12.421-3.645 16.571l-13.661 13.661c-12.88 12.88-12.879 33.805 0 46.685 12.88 12.88 33.806 12.88 46.685 0l67.2-67.2c12.88-12.88 12.88-33.806 0-46.685s-33.806-12.88-46.685 0l-13.661 13.661c-4.205 4.148-10.749 5.625-16.571 3.645-17.194-5.864-34.999-9.041-52.721-9.69-13.906-.508-20.447-17.454-10.606-27.294l37.106-37.106z"></path></svg>;

const TutorDetailModal = ({ tutor, isOpen, onClose, onTutorUpdate }) => {
    const modalRef = useRef();
    const navigate = useNavigate();
    const [pacientes, setPacientes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLinkUserModalOpen, setIsLinkUserModalOpen] = useState(false);

    useEffect(() => {
        const fetchPacientes = async () => {
            if (!isOpen || !tutor || !tutor.id) {
                setPacientes([]);
                return;
            }
            setIsLoading(true);
            try {
                const q = query(collection(db, "pacientes"), where("tutorId", "==", tutor.id));
                const querySnapshot = await getDocs(q);
                const fetchedPacientes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPacientes(fetchedPacientes);
            } catch (error) {
                console.error("Error fetching pacientes: ", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPacientes();
    }, [isOpen, tutor]);
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const handleAddPaciente = () => {
        navigate(`/admin/add-paciente?tutorId=${tutor.id}`);
    };
    
    const handleLinkSuccess = () => {
        setIsLinkUserModalOpen(false);
        onTutorUpdate(); 
    };

    if (!isOpen) return null;

    return (
        <>
            <div className={`tutor-detail-modal-overlay ${isOpen ? 'open' : ''}`}>
                <div className="tutor-detail-modal" ref={modalRef}>
                    <button className="close-btn" onClick={onClose}><FaTimes /></button>
                    <div className="modal-content">
                        <h3 className="modal-title">Detalles del Tutor</h3>
                        <div className="info-section">
                            <div className="details">
                                <p className="name">{tutor.name} {tutor.userId && <FaLink title="Cuenta de usuario vinculada"/>}</p>
                                <p className="email">{tutor.email}</p>
                                <p><strong>Teléfono:</strong> {tutor.phone}</p>
                                <p><strong>Dirección:</strong> {tutor.address}</p>
                            </div>
                            <div className="actions">
                                {!tutor.userId && (
                                     <button className="btn btn-secondary" onClick={() => setIsLinkUserModalOpen(true)}>Vincular Usuario</button>
                                )}
                                <button className="btn btn-primary" onClick={handleAddPaciente}>Agregar Mascota</button>
                            </div>
                        </div>
                        <div className="pacientes-section">
                            <h4>Mascotas Asociadas ({pacientes.length})</h4>
                            {isLoading ? <p>Cargando mascotas...</p> : (
                                pacientes.length > 0 ? (
                                    <ul className="paciente-list">
                                        {pacientes.map(p => (
                                            <li key={p.id}>
                                                {p.species?.toLowerCase().includes('canino') ? <FaDog /> : <FaCat />}
                                                <strong>{p.name}</strong> ({p.species})
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p>No tiene mascotas registradas.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <LinkUserModal tutor={tutor} isOpen={isLinkUserModalOpen} onClose={() => setIsLinkUserModalOpen(false)} onLinkSuccess={handleLinkSuccess} />
        </>
    );
};

export default TutorDetailModal;

