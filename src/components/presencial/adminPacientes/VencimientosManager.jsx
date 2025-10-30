import React, { useState, useMemo, useEffect, useRef } from 'react';
import { doc, updateDoc, serverTimestamp, deleteField, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { FaDog, FaCat, FaEllipsisV, FaTrash, FaClock } from 'react-icons/fa';
import Swal from 'sweetalert2';

const VencimientosManager = ({ vencimientos, setVencimientos, pacienteId, pacienteSpecies, pacienteTutorName, onAlert, onAdd }) => {
    // --- CHANGE: Default sortOrder to 'date-desc' ---
    const [filters, setFilters] = useState({ searchTerm: '', status: 'todos', sortOrder: 'date-desc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [openMenuId, setOpenMenuId] = useState(null);
    const menuRef = useRef(null);
    const itemsPerPage = 5;

    // --- NEW: State for custom date picker ---
    const [customDateVencimientoId, setCustomDateVencimientoId] = useState(null);
    const [customSuppliedDate, setCustomSuppliedDate] = useState('');

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    // --- REWORK: toggleSupplied to handle custom dates ---
    const toggleSupplied = async (vencimientoToUpdate, customDate = null) => {
        const isCurrentlySupplied = vencimientoToUpdate.supplied;
        const originalVencimientos = [...vencimientos];
        
        let newSuppliedState = !isCurrentlySupplied;
        let newSuppliedDateObj = null;

        if (newSuppliedState) { // We are MARKING as supplied
            newSuppliedDateObj = customDate ? new Date(customDate) : new Date();
        }

        // Optimistic UI update
        setVencimientos(prev => prev.map(v => 
            v.id === vencimientoToUpdate.id ? { ...v, supplied: newSuppliedState, suppliedDate: newSuppliedState ? newSuppliedDateObj : null } : v
        ));

        // Close custom date picker if it was open
        setCustomDateVencimientoId(null);
        setCustomSuppliedDate('');
        
        try {
            const vencRef = doc(db, `pacientes/${pacienteId}/vencimientos`, vencimientoToUpdate.id);
            
            let dataToUpdate;
            if (newSuppliedState) { // Marking AS supplied
                dataToUpdate = {
                    supplied: true,
                    suppliedDate: customDate ? Timestamp.fromDate(new Date(customDate)) : serverTimestamp(),
                    status: 'suministrado'
                };
            } else { // UN-marking (toggling off)
                dataToUpdate = {
                    supplied: false,
                    suppliedDate: deleteField(),
                    status: 'pendiente' // Note: This might need recalculation based on dueDate vs today
                };
            }
            
            await updateDoc(vencRef, dataToUpdate);
            onAlert({ message: 'Estado actualizado.', type: 'success' });
        } catch (error) {
            onAlert({ message: 'Error al actualizar. Reintentando...', type: 'error' });
            setVencimientos(originalVencimientos);
        }
    };
    
    const handleDeleteVencimiento = async (vencimiento) => {
        setOpenMenuId(null);
        const { isConfirmed } = await Swal.fire({
            title: `¿Eliminar Vencimiento?`,
            text: `Se eliminará el vencimiento de "${vencimiento.productName}" del ${vencimiento.dueDate.toLocaleDateString('es-AR')}. Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (isConfirmed) {
            try {
                await deleteDoc(doc(db, `pacientes/${pacienteId}/vencimientos`, vencimiento.id));
                setVencimientos(prev => prev.filter(v => v.id !== vencimiento.id));
                onAlert({ message: 'Vencimiento eliminado.', type: 'success' });
            } catch (error) {
                onAlert({ message: 'No se pudo eliminar el vencimiento.', type: 'error' });
            }
        }
    };
    
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const getStatus = (v) => {
        if (!v || !v.dueDate) return { key: 'pendiente', label: 'Pendiente' };
        if (v.supplied) return { key: 'suministrado', label: 'Suministrado' };
        if (v.dueDate < today) return { key: 'vencido', label: 'Vencido' };
        const daysDiff = Math.ceil((v.dueDate - today) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 7) return { key: 'proximo', label: 'Próximo' };
        return { key: 'pendiente', label: 'Pendiente' };
    };

    const filteredAndSortedVencimientos = useMemo(() => {
        let filtered = vencimientos.filter(v => {
            if (!v.productName || !v.dueDate || isNaN(v.dueDate.getTime())) return false;
            if (!v.productName.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;
            if (filters.status === 'todos') return true;
            return getStatus(v).key === filters.status;
        });
        filtered.sort((a, b) => {
            const dateA = a.dueDate.getTime();
            const dateB = b.dueDate.getTime();
            // --- CHANGE: Swapped a and b for descending order ---
            return filters.sortOrder === 'date-asc' ? dateA - dateB : dateB - dateA;
        });
        return filtered;
    }, [vencimientos, filters, today]);

    const totalPages = Math.ceil(filteredAndSortedVencimientos.length / itemsPerPage);
    const currentItems = filteredAndSortedVencimientos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        return (
          <div className="pagination-controls">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</button>
            <span>Página {currentPage} de {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente</button>
          </div>
        );
      };

    const handleOpenCustomDate = (e, vencimiento) => {
        e.stopPropagation();
        setCustomDateVencimientoId(vencimiento.id);
        // Default to today if no supplied date, otherwise use the existing supplied date
        const defaultDate = vencimiento.suppliedDate 
            ? vencimiento.suppliedDate.toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];
        setCustomSuppliedDate(defaultDate);
    };

    return (
        <div className="tab-content">
            <div className="vencimientos-controls">
                <input type="text" name="searchTerm" placeholder="Buscar por producto..." value={filters.searchTerm} onChange={handleFilterChange} />
                <select name="status" value={filters.status} onChange={handleFilterChange}><option value="todos">Todos</option><option value="pendiente">Pendientes</option><option value="proximo">Próximos</option><option value="vencido">Vencidos</option><option value="suministrado">Suministrados</option></select>
                <select name="sortOrder" value={filters.sortOrder} onChange={handleFilterChange}><option value="date-desc">Fecha Descendente</option><option value="date-asc">Fecha Ascendente</option></select>
                <button className="btn btn-primary" onClick={onAdd}>+ Agregar Vencimiento</button>
            </div>
            {currentItems.length > 0 ? (
                <div className="vencimientos-list">{currentItems.map(v => {
                    const status = getStatus(v);
                    return (<div key={v.id} className={`vencimiento-card ${status.key}`}>
                        <div className="vencimiento-info">
                            <span className="vencimiento-product">{pacienteSpecies === 'Canino' ? <FaDog /> : pacienteSpecies === 'Felino' ? <FaCat /> : null}{v.productName}<span className={`badge ${status.key}`}>{status.label}</span></span>
                            <span className="vencimiento-tutor">Tutor: {v.tutorName || pacienteTutorName}</span>
                            {v.appliedDosage && <span className="vencimiento-dosage">Dosis Anterior: {v.appliedDosage}</span>}
                        </div>
                        
                        {/* --- REWORK: Vencimiento Date & Actions --- */}
                        <div className="vencimiento-date">
                            <span>Vence el:</span><strong>{v.dueDate.toLocaleDateString('es-AR')}</strong>
                            {v.suppliedDate && <span className="supplied-date">Suministrado el: {v.suppliedDate.toLocaleDateString('es-AR')}</span>}

                            {/* --- NEW: Custom Date Picker Form --- */}
                            {customDateVencimientoId === v.id ? (
                                <div className="custom-date-supply-form" onClick={e => e.stopPropagation()}>
                                    <label>Fecha Suministro:</label>
                                    <input 
                                        type="date" 
                                        value={customSuppliedDate} 
                                        onChange={e => setCustomSuppliedDate(e.target.value)} 
                                    />
                                    <button className="btn btn-primary btn-small" onClick={() => toggleSupplied(v, customSuppliedDate)}>OK</button>
                                    <button className="btn btn-secondary btn-small" onClick={(e) => {e.stopPropagation(); setCustomDateVencimientoId(null);}}>X</button>
                                </div>
                            ) : (
                                <div className="supply-actions">
                                    <button className={`btn btn-suministrado ${v.supplied ? 'supplied' : ''}`} onClick={() => toggleSupplied(v)}>
                                        {v.supplied ? 'Desmarcar' : 'Marcar Suministrado'}
                                    </button>
                                    {/* --- NEW: Clock button --- */}
                                    <button className="btn btn-custom-date" title="Suministrar con fecha" onClick={(e) => handleOpenCustomDate(e, v)}>
                                        <FaClock />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="vencimiento-actions">
                            <button className="vencimiento-actions-trigger" onClick={(e) => { e.stopPropagation(); setOpenMenuId(v.id); }}>
                                <FaEllipsisV />
                            </button>
                            {openMenuId === v.id && (
                                <div className="vencimiento-context-menu" ref={menuRef}>
                                    <button className="context-menu-item delete" onClick={() => handleDeleteVencimiento(v)}>
                                        <FaTrash /> Eliminar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>);
                })}</div>
            ) : <p className="no-results-message">No hay vencimientos que coincidan con los filtros.</p>}
            {renderPagination()}
        </div>
    );
};

export default VencimientosManager;
