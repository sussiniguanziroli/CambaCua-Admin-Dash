import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFirestore, collection, getDocs, doc, deleteDoc, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import TutorDetailModal from './TutorDetailModal';

// --- SVG Icons ---
const FaPlus = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"></path></svg>;
const FaUserMd = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0 96 57.3 96 128s57.3 128 128 128zm96 32h-16.7c-22.2 10.2-46.9 16-71.3 16s-49.1-5.8-71.3-16H128c-70.7 0-128 57.3-128 128v48c0 17.7 14.3 32 32 32h384c17.7 0 32-14.3 32-32v-48c0-70.7-57.3-128-128-128z"></path></svg>;
const FaLink = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M326.612 185.391c59.747 59.809 58.927 155.698.36 214.59-.11.12-.24.25-.36.37l-67.2 67.2c-59.27 59.27-155.699 59.262-214.96 0-59.27-59.26-59.27-155.7 0-214.96l37.106-37.106c9.84-9.84 26.786-3.3 27.294 10.606.648 17.722 3.826 35.527 9.69 52.721 1.986 5.822.56 12.421-3.645 16.571l-13.661 13.661c-12.88 12.88-12.879 33.805 0 46.685 12.88 12.88 33.806 12.88 46.685 0l67.2-67.2c12.88-12.88 12.88-33.806 0-46.685s-33.806-12.88-46.685 0l-13.661 13.661c-4.205 4.148-10.749 5.625-16.571 3.645-17.194-5.864-34.999-9.041-52.721-9.69-13.906-.508-20.447-17.454-10.606-27.294l37.106-37.106c59.271-59.259 155.699-59.26 214.96 0zM422.9 221.7c-59.269-59.269-155.699-59.269-214.96 0l-37.106 37.106c-9.84 9.84-3.3 26.786 10.606 27.294.648 17.722 3.826 35.527 9.69 52.721 1.986 5.822.56 12.421-3.645 16.571l-13.661 13.661c-12.88 12.88-12.879 33.805 0 46.685 12.88 12.88 33.806 12.88 46.685 0l67.2-67.2c12.88-12.88 12.88-33.806 0-46.685s-33.806-12.88-46.685 0l-13.661 13.661c-4.205 4.148-10.749 5.625-16.571 3.645-17.194-5.864-34.999-9.041-52.721-9.69-13.906-.508-20.447-17.454-10.606-27.294l37.106-37.106c59.271-59.259 155.699-59.26 214.96 0 59.747 59.809 58.927 155.698.36 214.59-.11.12-.24.25-.36.37l-67.2 67.2c-59.27 59.27-155.699 59.262-214.96 0-59.27-59.26-59.27-155.7 0-214.96l37.106-37.106c9.84-9.84 26.786-3.3 27.294 10.606.648 17.722 3.826 35.527 9.69 52.721 1.986 5.822.56 12.421-3.645 16.571l-13.661 13.661c-12.88 12.88-12.879 33.805 0 46.685 12.88 12.88 33.806 12.88 46.685 0l67.2-67.2c12.88-12.88 12.88-33.806 0-46.685s-33.806-12.88-46.685 0l-13.661 13.661c-4.205 4.148-10.749 5.625-16.571 3.645-17.194-5.864-34.999-9.041-52.721-9.69-13.906-.508-20.447-17.454-10.606-27.294l37.106-37.106z"></path></svg>;

// --- Helper Components ---
const CustomAlert = ({ message, type = 'info', onClose }) => { /* ... */ };
const ConfirmationDialog = ({ isOpen, title, message, onConfirm, onCancel }) => { /* ... */ };

// --- Main Component ---
const VerTutores = () => {
    const [tutores, setTutores] = useState([]);
    const [filteredTutores, setFilteredTutores] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTutor, setSelectedTutor] = useState(null);
    const [alert, setAlert] = useState({ message: '', type: 'info' });
    const [confirmAction, setConfirmAction] = useState(null);

    const fetchTutores = useCallback(async () => {
        setIsLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'tutores'));
            const tutorsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTutores(tutorsList);
        } catch (error) {
            setAlert({ message: 'No se pudieron cargar los tutores.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTutores();
    }, [fetchTutores]);

    useEffect(() => {
        let filtered = tutores.filter(t =>
            t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.email && t.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        filtered.sort((a, b) => {
            const dateA = a.createdAt?.toMillis() || 0;
            const dateB = b.createdAt?.toMillis() || 0;
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
        setFilteredTutores(filtered);
    }, [searchTerm, sortOrder, tutores]);
    
    const handleDeleteRequest = (tutorId, tutorName) => {
        setConfirmAction({
            title: `¿Eliminar a ${tutorName}?`,
            message: "Esta acción no se puede deshacer. Los pacientes asociados NO serán eliminados.",
            action: () => performDelete(tutorId, tutorName)
        });
    };

    const performDelete = async (tutorId, tutorName) => {
        try {
            await deleteDoc(doc(db, 'tutores', tutorId));
            setAlert({ message: `${tutorName} ha sido eliminado.`, type: 'success' });
            fetchTutores();
        } catch (error) {
            setAlert({ message: `No se pudo eliminar a ${tutorName}.`, type: 'error' });
        }
        setConfirmAction(null);
    };
    
    const handleTutorClick = (tutor) => {
        setSelectedTutor(tutor);
        setIsModalOpen(true);
    };

    const handleTutorUpdate = () => {
        setIsModalOpen(false);
        fetchTutores();
    };

    return (
        <div className="presential-container">
            <CustomAlert message={alert.message} type={alert.type} onClose={() => setAlert({ message: '' })} />
            <ConfirmationDialog 
                isOpen={!!confirmAction}
                title={confirmAction?.title}
                message={confirmAction?.message}
                onConfirm={confirmAction?.action}
                onCancel={() => setConfirmAction(null)}
            />
            <div className="page-header">
                <h1>Gestión de Tutores</h1>
                <Link to="/admin/add-tutor" className="btn btn-primary"><FaPlus /> Agregar Tutor</Link>
            </div>
            <div className="filter-bar">
                <div className="filter-group">
                     <input type="text" placeholder="Buscar por nombre o email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                 <div className="filter-group">
                    <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                        <option value="newest">Más nuevos</option>
                        <option value="oldest">Más antiguos</option>
                    </select>
                </div>
            </div>
            {isLoading ? <p className="loading-message">Cargando...</p> : (
                <div className="user-list-items-container">
                    {filteredTutores.length > 0 ? filteredTutores.map(tutor => (
                        <div key={tutor.id} className="user-card" onClick={() => handleTutorClick(tutor)}>
                             <div className="user-info">
                                <p className="user-name">
                                    <FaUserMd /> {tutor.name} {tutor.userId && <FaLink title="Cuenta de usuario vinculada"/>}
                                </p>
                                <p className="user-email">{tutor.email}</p>
                             </div>
                             <div className="card-actions">
                                 <Link to={`/admin/edit-tutor/${tutor.id}`} className="btn btn-edit" onClick={e => e.stopPropagation()}>Editar</Link>
                                 <button onClick={(e) => { e.stopPropagation(); handleDeleteRequest(tutor.id, tutor.name); }} className="btn btn-delete">Eliminar</button>
                             </div>
                        </div>
                    )) : <p className="no-results-message">No se encontraron tutores.</p>}
                </div>
            )}
            {selectedTutor && (
                <TutorDetailModal 
                    tutor={selectedTutor} 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    onTutorUpdate={handleTutorUpdate}
                />
            )}
        </div>
    );
};

export default VerTutores;

