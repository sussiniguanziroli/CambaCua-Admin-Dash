import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';
import { FaPlus, FaUserMd, FaDog } from 'react-icons/fa';
import { FaUserLarge } from 'react-icons/fa6';
import { CiEdit } from 'react-icons/ci';
import { MdDeleteOutline } from 'react-icons/md';

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
                                <div className="tutor-avatar"><FaUserLarge /></div>
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
                                 <Link to={`/admin/edit-tutor/${tutor.id}`} className="btn btn-edit" onClick={e => e.stopPropagation()}><CiEdit /></Link>
                                 <button onClick={(e) => { e.stopPropagation(); handleDelete(tutor.id, tutor.name); }} className="btn btn-delete"><MdDeleteOutline /></button>
                             </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VerTutores;