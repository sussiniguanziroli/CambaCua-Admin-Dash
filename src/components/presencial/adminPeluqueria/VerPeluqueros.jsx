import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';
import { FaPlus } from 'react-icons/fa';
import { CiEdit, CiUser } from "react-icons/ci";
import { MdDeleteOutline } from "react-icons/md";

const VerPeluqueros = () => {
    const [peluqueros, setPeluqueros] = useState([]);
    const [filteredPeluqueros, setFilteredPeluqueros] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({ searchTerm: '', sortOrder: 'name_asc' });
    const navigate = useNavigate();

    const fetchPeluqueros = useCallback(async () => {
        setIsLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'peluqueros'));
            setPeluqueros(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            Swal.fire('Error', 'No se pudieron cargar los peluqueros.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchPeluqueros(); }, [fetchPeluqueros]);

    useEffect(() => {
        let filtered = [...peluqueros];
        const term = filters.searchTerm.toLowerCase();
        if (term) {
            filtered = filtered.filter(p => p.name.toLowerCase().includes(term) || (p.phone && p.phone.includes(term)));
        }
        filtered.sort((a, b) => {
            if (filters.sortOrder === 'name_asc') return a.name.localeCompare(b.name);
            if (filters.sortOrder === 'name_desc') return b.name.localeCompare(a.name);
            return 0;
        });
        setFilteredPeluqueros(filtered);
    }, [filters, peluqueros]);

    const handleDelete = async (peluqueroId, peluqueroName) => {
       const result = await Swal.fire({
            title: `¿Eliminar a ${peluqueroName}?`,
            text: "Esta acción no se puede deshacer.",
            icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            try {
                await deleteDoc(doc(db, 'peluqueros', peluqueroId));
                Swal.fire('Eliminado', `${peluqueroName} ha sido eliminado.`, 'success');
                fetchPeluqueros();
            } catch (error) {
                Swal.fire('Error', `No se pudo eliminar a ${peluqueroName}.`, 'error');
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
                <h1>Gestión de Peluqueros</h1>
                <Link to="/admin/add-peluquero" className="btn btn-primary"><FaPlus /> Agregar Peluquero</Link>
            </div>
            <div className="filter-bar">
                <div className="filter-group">
                     <input type="text" placeholder="Buscar por nombre o teléfono..." name="searchTerm" value={filters.searchTerm} onChange={handleFilterChange} />
                </div>
                 <div className="filter-group">
                    <select name="sortOrder" value={filters.sortOrder} onChange={handleFilterChange}>
                        <option value="name_asc">Nombre (A-Z)</option>
                        <option value="name_desc">Nombre (Z-A)</option>
                    </select>
                </div>
            </div>
            {isLoading ? <p className="loading-message">Cargando...</p> : (
                <div className="tutor-cards-grid">
                    {filteredPeluqueros.map(p => (
                        <div key={p.id} className="tutor-card" onClick={() => navigate(`/admin/peluqueros/${p.id}`)}>
                             <div className="tutor-card-header">
                                <div className="tutor-avatar"><CiUser /></div>
                                <div className="tutor-info">
                                    <p className="tutor-name">{p.name}</p>
                                    <p className="tutor-contact">{p.phone || p.email || 'Sin contacto'}</p>
                                </div>
                             </div>
                             <div className="tutor-card-body">
                                <div className="info-chip">
                                    <span>{p.specialties?.join(', ') || 'General'}</span>
                                </div>
                                <div className={`info-chip ${p.isActive ? 'active' : 'inactive'}`}>
                                    <span>{p.isActive ? 'Activo' : 'Inactivo'}</span>
                                </div>
                             </div>
                             <div className="tutor-card-actions">
                                 <Link to={`/admin/edit-peluquero/${p.id}`} className="btn btn-edit" onClick={e => e.stopPropagation()}><CiEdit /></Link>
                                 <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.name); }} className="btn btn-delete"><MdDeleteOutline /></button>
                             </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VerPeluqueros;