import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';
import { FaPlus, FaDog, FaCat, FaTimes } from 'react-icons/fa';

const PacienteDetailModal = ({ paciente, isOpen, onClose }) => {
    const modalRef = useRef();
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

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
        return `${age_y} años, ${age_m} meses`;
    };

    return (
        <div className="user-modal-overlay open">
            <div className="user-modal" ref={modalRef}>
                <button className="user-modal-close-btn" onClick={onClose}><FaTimes /></button>
                <div className="user-modal-content">
                    <h3 className="user-modal-title">Detalles del Paciente</h3>
                    <div className="user-modal-details">
                        <p className="user-modal-name">{paciente.name}</p>
                        <p><strong>Tutor:</strong> {paciente.tutorName}</p>
                        <p><strong>Especie:</strong> {paciente.species}</p>
                        <p><strong>Raza:</strong> {paciente.breed}</p>
                        <p><strong>Fecha de Nacimiento:</strong> {paciente.birthDate}</p>
                        <p><strong>Edad Aproximada:</strong> {calculateAge(paciente.birthDate)}</p>
                    </div>
                     {/* Clinical history section can be added here in the future */}
                </div>
            </div>
        </div>
    );
};

const VerPacientes = () => {
    const [pacientes, setPacientes] = useState([]);
    const [filteredPacientes, setFilteredPacientes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPaciente, setSelectedPaciente] = useState(null);

    const fetchPacientes = useCallback(async () => {
        setIsLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'pacientes'));
            const pacientesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPacientes(pacientesList);
        } catch (error) {
            Swal.fire('Error', 'No se pudieron cargar los pacientes.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPacientes();
    }, [fetchPacientes]);

    useEffect(() => {
        let filtered = pacientes.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.species.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.tutorName.toLowerCase().includes(searchTerm.toLowerCase())
        );
        filtered.sort((a, b) => {
            const dateA = a.createdAt?.toMillis() || 0;
            const dateB = b.createdAt?.toMillis() || 0;
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
        setFilteredPacientes(filtered);
    }, [searchTerm, sortOrder, pacientes]);

    const handleDelete = async (paciente) => {
        const result = await Swal.fire({
            title: `¿Eliminar a ${paciente.name}?`,
            text: "Se eliminará el paciente y el vínculo con su tutor.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            try {
                await deleteDoc(doc(db, 'pacientes', paciente.id));
                const tutorRef = doc(db, 'tutores', paciente.tutorId);
                await updateDoc(tutorRef, {
                    pacienteIds: arrayRemove(paciente.id)
                });
                Swal.fire('Eliminado', `${paciente.name} ha sido eliminado.`, 'success');
                fetchPacientes();
            } catch (error) {
                Swal.fire('Error', `No se pudo eliminar a ${paciente.name}.`, 'error');
            }
        }
    };
    
    const handlePacienteClick = (paciente) => {
        setSelectedPaciente(paciente);
        setIsModalOpen(true);
    };

    return (
        <div className="presential-container">
            <div className="page-header">
                <h1>Gestión de Pacientes</h1>
                <Link to="/admin/add-paciente" className="btn btn-primary"><FaPlus /> Agregar Paciente</Link>
            </div>
            <div className="filter-bar">
                <div className="filter-group">
                    <input type="text" placeholder="Buscar por nombre, especie, tutor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                    {filteredPacientes.length > 0 ? filteredPacientes.map(p => (
                        <div key={p.id} className="user-card" onClick={() => handlePacienteClick(p)}>
                            <div className="user-info">
                                <p className="user-name">
                                    {p.species.toLowerCase().includes('canino') ? <FaDog /> : <FaCat />} {p.name}
                                </p>
                                <p className="user-email">Tutor: {p.tutorName}</p>
                            </div>
                            <div className="card-actions">
                                <Link to={`/admin/edit-paciente/${p.id}`} className="btn btn-edit" onClick={e => e.stopPropagation()}>Editar</Link>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(p); }} className="btn btn-delete">Eliminar</button>
                            </div>
                        </div>
                    )) : <p className="no-results-message">No se encontraron pacientes.</p>}
                </div>
            )}
            <PacienteDetailModal paciente={selectedPaciente} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};

export default VerPacientes;
