import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';

// --- SVG Icons ---
const FaPlus = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"></path></svg>;
const FaDog = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M224 160c-15.6-15.6-40.9-15.6-56.6 0-11.2 11.2-13.8 27.6-6.8 41.5l22.3 44.6-22.3 44.6c-7 13.9-4.3 30.3 6.8 41.5 15.6 15.6 40.9 15.6 56.6 0l22.6-22.6-22.6-22.6c-15.6-15.6-15.6-40.9 0-56.6l22.6-22.6-22.6-22.6zM576 224c0-78.8-63.1-142.4-140.8-143.9-74.3-1.4-136.2 56.1-136.2 128h-32c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h16v32h-16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h32.1c29.3 68.3 94.2 112 167.9 112 97.2 0 176-78.8 176-176zm-176 96c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zM0 352v-16c0-8.8 7.2-16 16-16h32v-32H16c-8.8 0-16-7.2-16-16v-32c0-8.8 7.2-16 16-16h64c0-53 43-96 96-96h16c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16h-16C83.1 48 0 131.1 0 224v128zm128-96c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z"></path></svg>;
const FaCat = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M256 160c-19.6 0-37.5 7.1-51.5 19.3l-1.8 1.6c-1.1.9-2.2 1.8-3.3 2.8-17.2 15.3-26.4 37.4-26.4 60.3 0 44.2 35.8 80 80 80s80-35.8 80-80c0-22.9-9.2-45-26.4-60.3l-3.3-2.8-1.8-1.6C293.5 167.1 275.6 160 256 160zm-96 96c0-23.7 9.6-45.5 26.9-61.4 2.4-2.2 4.9-4.3 7.5-6.3l1.8-1.4c1-1 2-2 3.1-2.9 4.3-3.8 9.2-7 14.4-9.5 2.6-1.3 5.3-2.4 8-3.3 1-.3 2-.6 3-.9 11.8-3.4 24.5-5.2 37.8-5.2s26 1.8 37.8 5.2c1 .3 2 .6 3 .9 2.7.9 5.4 2 8 3.3 5.3 2.5 10.1 5.7 14.4 9.5 1.1.9 2.1 1.9 3.1 2.9l1.8 1.4c2.6 2 5.1 4.1 7.5 6.3C406.4 210.5 416 232.3 416 256s-9.6 45.5-26.9 61.4c-2.4 2.2-4.9 4.3-7.5 6.3l-1.8 1.4c-1 1-2 2-3.1 2.9-4.3 3.8-9.2 7-14.4 9.5-2.6 1.3-5.3 2.4-8 3.3-1 .3-2 .6-3 .9-11.8 3.4-24.5 5.2-37.8 5.2s-26-1.8-37.8-5.2c-1-.3-2-.6-3-.9-2.7-.9-5.4-2-8-3.3-5.3-2.5-10.1-5.7-14.4-9.5-1.1-.9-2.1-1.9-3.1-2.9l-1.8-1.4c-2.6-2-5.1-4.1-7.5-6.3C169.6 301.5 160 279.7 160 256zM448 96h-64l-64-64v134.4c0 53 43 96 96 96h64c17.7 0 32-14.3 32-32V128c0-17.7-14.3-32-32-32zM192 32L128 96H64c-17.7 0-32 14.3-32 32v102.4c0 53 43 96 96 96h64l64 64V96h-64z"></path></svg>;

const VerPacientes = () => {
    const [pacientes, setPacientes] = useState([]);
    const [filteredPacientes, setFilteredPacientes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({ searchTerm: '', sortOrder: 'name_asc' });
    const navigate = useNavigate();

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

    useEffect(() => { fetchPacientes(); }, [fetchPacientes]);

    useEffect(() => {
        let filtered = [...pacientes];
        const term = filters.searchTerm.toLowerCase();
        if (term) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(term) ||
                (p.species && p.species.toLowerCase().includes(term)) ||
                (p.tutorName && p.tutorName.toLowerCase().includes(term)) ||
                (p.chipNumber && p.chipNumber.includes(term))
            );
        }
        filtered.sort((a, b) => {
            if (filters.sortOrder === 'name_asc') return a.name.localeCompare(b.name);
            if (filters.sortOrder === 'name_desc') return b.name.localeCompare(a.name);
            if (filters.sortOrder === 'tutor_asc') return a.tutorName.localeCompare(b.tutorName);
            return 0;
        });
        setFilteredPacientes(filtered);
    }, [filters, pacientes]);
    
    const handleDelete = async (paciente) => {
        const result = await Swal.fire({
            title: `¿Eliminar a ${paciente.name}?`,
            text: "Se eliminará el paciente y el vínculo con su tutor.",
            icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await deleteDoc(doc(db, 'pacientes', paciente.id));
                const tutorRef = doc(db, 'tutores', paciente.tutorId);
                await updateDoc(tutorRef, { pacienteIds: arrayRemove(paciente.id) });
                Swal.fire('Eliminado', `${paciente.name} ha sido eliminado.`, 'success');
                fetchPacientes();
            } catch (error) {
                Swal.fire('Error', `No se pudo eliminar a ${paciente.name}.`, 'error');
            }
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="presential-container">
            <div className="page-header">
                <h1>Gestión de Pacientes</h1>
                <Link to="/admin/add-paciente" className="btn btn-primary"><FaPlus /> Agregar Paciente</Link>
            </div>
            <div className="filter-bar">
                <div className="filter-group">
                    <input type="text" placeholder="Buscar por nombre, tutor, especie o chip..." name="searchTerm" value={filters.searchTerm} onChange={handleFilterChange} />
                </div>
                <div className="filter-group">
                    <select name="sortOrder" value={filters.sortOrder} onChange={handleFilterChange}>
                        <option value="name_asc">Nombre (A-Z)</option>
                        <option value="name_desc">Nombre (Z-A)</option>
                        <option value="tutor_asc">Tutor (A-Z)</option>
                    </select>
                </div>
            </div>
             {isLoading ? <p className="loading-message">Cargando...</p> : (
                <div className="paciente-cards-grid">
                    {filteredPacientes.map(p => (
                        <div key={p.id} className="paciente-card" onClick={() => navigate(`/admin/paciente-profile/${p.id}`)}>
                             <div className="paciente-card-header">
                                <div className="paciente-avatar">
                                    {p.species?.toLowerCase().includes('perro') ? <FaDog /> : <FaCat />}
                                </div>
                                <div className="paciente-info">
                                    <p className="paciente-name">{p.name}</p>
                                    <p className="paciente-breed">{p.breed || p.species}</p>
                                </div>
                             </div>
                             <div className="paciente-card-body">
                                <p className="tutor-link">Tutor: {p.tutorName}</p>
                             </div>
                             <div className="paciente-card-actions">
                                 <Link to={`/admin/edit-paciente/${p.id}`} className="btn btn-edit" onClick={e => e.stopPropagation()}>Editar</Link>
                                 <button onClick={(e) => { e.stopPropagation(); handleDelete(p); }} className="btn btn-delete">Eliminar</button>
                             </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VerPacientes;
