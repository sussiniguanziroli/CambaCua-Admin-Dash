import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';

// --- SVG Icons ---
const FaPlus = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"></path></svg>;
const FaUserMd = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0 96 57.3 96 128s57.3 128 128 128zm96 32h-16.7c-22.2 10.2-46.9 16-71.3 16s-49.1-5.8-71.3-16H128c-70.7 0-128 57.3-128 128v48c0 17.7 14.3 32 32 32h384c17.7 0 32-14.3 32-32v-48c0-70.7-57.3-128-128-128z"></path></svg>;
const FaDog = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M224 160c-15.6-15.6-40.9-15.6-56.6 0-11.2 11.2-13.8 27.6-6.8 41.5l22.3 44.6-22.3 44.6c-7 13.9-4.3 30.3 6.8 41.5 15.6 15.6 40.9 15.6 56.6 0l22.6-22.6-22.6-22.6c-15.6-15.6-15.6-40.9 0-56.6l22.6-22.6-22.6-22.6zM576 224c0-78.8-63.1-142.4-140.8-143.9-74.3-1.4-136.2 56.1-136.2 128h-32c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h16v32h-16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h32.1c29.3 68.3 94.2 112 167.9 112 97.2 0 176-78.8 176-176zm-176 96c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zM0 352v-16c0-8.8 7.2-16 16-16h32v-32H16c-8.8 0-16-7.2-16-16v-32c0-8.8 7.2-16 16-16h64c0-53 43-96 96-96h16c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16h-16C83.1 48 0 131.1 0 224v128zm128-96c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z"></path></svg>;

const VerTutores = () => {
    const [tutores, setTutores] = useState([]);
    const [filteredTutores, setFilteredTutores] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({ searchTerm: '', sortOrder: 'name_asc' });
    const navigate = useNavigate();

    const fetchTutores = useCallback(async () => {
        setIsLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'tutores'));
            const tutorsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTutores(tutorsList);
        } catch (error) {
            Swal.fire('Error', 'No se pudieron cargar los tutores.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchTutores(); }, [fetchTutores]);

    useEffect(() => {
        let filtered = [...tutores];
        const term = filters.searchTerm.toLowerCase();
        if (term) {
            filtered = filtered.filter(t =>
                t.name.toLowerCase().includes(term) ||
                (t.email && t.email.toLowerCase().includes(term)) ||
                (t.dni && t.dni.includes(term)) ||
                (t.phone && t.phone.includes(term))
            );
        }
        filtered.sort((a, b) => {
            if (filters.sortOrder === 'name_asc') return a.name.localeCompare(b.name);
            if (filters.sortOrder === 'name_desc') return b.name.localeCompare(a.name);
            if (filters.sortOrder === 'newest') return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
            return 0;
        });
        setFilteredTutores(filtered);
    }, [filters, tutores]);
    
    const handleDelete = async (tutorId, tutorName) => {
       const result = await Swal.fire({
            title: `¿Eliminar a ${tutorName}?`,
            text: "Esta acción no se puede deshacer. Los pacientes asociados NO serán eliminados.",
            icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            try {
                await deleteDoc(doc(db, 'tutores', tutorId));
                Swal.fire('Eliminado', `${tutorName} ha sido eliminado.`, 'success');
                fetchTutores();
            } catch (error) {
                Swal.fire('Error', `No se pudo eliminar a ${tutorName}.`, 'error');
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
                <h1>Gestión de Tutores</h1>
                <Link to="/admin/add-tutor" className="btn btn-primary"><FaPlus /> Agregar Tutor</Link>
            </div>
            <div className="filter-bar">
                <div className="filter-group">
                     <input type="text" placeholder="Buscar por nombre, DNI, email o teléfono..." name="searchTerm" value={filters.searchTerm} onChange={handleFilterChange} />
                </div>
                 <div className="filter-group">
                    <select name="sortOrder" value={filters.sortOrder} onChange={handleFilterChange}>
                        <option value="name_asc">Nombre (A-Z)</option>
                        <option value="name_desc">Nombre (Z-A)</option>
                        <option value="newest">Más nuevos</option>
                    </select>
                </div>
            </div>
            {isLoading ? <p className="loading-message">Cargando...</p> : (
                <div className="tutor-cards-grid">
                    {filteredTutores.map(tutor => (
                        <div key={tutor.id} className="tutor-card" onClick={() => navigate(`/admin/tutor-profile/${tutor.id}`)}>
                             <div className="tutor-card-header">
                                <div className="tutor-avatar"><FaUserMd /></div>
                                <div className="tutor-info">
                                    <p className="tutor-name">{tutor.name}</p>
                                    <p className="tutor-contact">{tutor.phone || tutor.email || 'Sin contacto'}</p>
                                </div>
                             </div>
                             <div className="tutor-card-body">
                                <div className="info-chip">
                                    <FaDog />
                                    <span>{tutor.pacienteIds?.length || 0} Pacientes</span>
                                </div>
                                <div className={`info-chip balance ${tutor.accountBalance < 0 ? 'deudor' : ''}`}>
                                    <span>${tutor.accountBalance?.toFixed(2) || '0.00'}</span>
                                </div>
                             </div>
                             <div className="tutor-card-actions">
                                 <Link to={`/admin/edit-tutor/${tutor.id}`} className="btn btn-edit" onClick={e => e.stopPropagation()}>Editar</Link>
                                 <button onClick={(e) => { e.stopPropagation(); handleDelete(tutor.id, tutor.name); }} className="btn btn-delete">Eliminar</button>
                             </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VerTutores;

