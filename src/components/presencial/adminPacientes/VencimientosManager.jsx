import React, { useState, useMemo } from 'react';
import { doc, updateDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { FaDog, FaCat } from 'react-icons/fa';

const VencimientosManager = ({ vencimientos, setVencimientos, pacienteId, pacienteSpecies, pacienteTutorName, onAlert, onAdd }) => {
    const [filters, setFilters] = useState({ searchTerm: '', status: 'todos', sortOrder: 'date-asc' });

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const toggleSupplied = async (vencimientoToUpdate) => {
        const isCurrentlySupplied = vencimientoToUpdate.supplied;
        
        setVencimientos(prev => prev.map(v => 
            v.id === vencimientoToUpdate.id 
            ? { ...v, supplied: !isCurrentlySupplied, suppliedDate: !isCurrentlySupplied ? new Date() : null } 
            : v
        ));

        try {
            const vencRef = doc(db, `pacientes/${pacienteId}/vencimientos`, vencimientoToUpdate.id);
            await updateDoc(vencRef, {
                supplied: !isCurrentlySupplied,
                suppliedDate: !isCurrentlySupplied ? serverTimestamp() : deleteField(),
                status: !isCurrentlySupplied ? 'suministrado' : 'pendiente'
            });
            onAlert({ message: 'Estado actualizado.', type: 'success' });
        } catch (error) {
            onAlert({ message: 'Error al actualizar. Reintentando...', type: 'error' });
            setVencimientos(vencimientos);
        }
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getStatus = (v) => {
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
            return filters.sortOrder === 'date-asc' ? dateA - dateB : dateB - dateA;
        });

        return filtered;
    }, [vencimientos, filters, today]);

    return (
        <div className="tab-content">
            <div className="vencimientos-controls">
                <input type="text" name="searchTerm" placeholder="Buscar por producto..." value={filters.searchTerm} onChange={handleFilterChange} />
                <select name="status" value={filters.status} onChange={handleFilterChange}>
                    <option value="todos">Todos</option><option value="pendiente">Pendientes</option><option value="proximo">Próximos</option><option value="vencido">Vencidos</option><option value="suministrado">Suministrados</option>
                </select>
                <select name="sortOrder" value={filters.sortOrder} onChange={handleFilterChange}>
                    <option value="date-asc">Fecha Ascendente</option><option value="date-desc">Fecha Descendente</option>
                </select>
                <button className="btn btn-primary" onClick={onAdd}>+ Agregar Vencimiento</button>
            </div>
            {filteredAndSortedVencimientos.length > 0 ? (
                <div className="vencimientos-list">{filteredAndSortedVencimientos.map(v => {
                    const status = getStatus(v);
                    return (<div key={v.id} className={`vencimiento-card ${status.key}`}><div className="vencimiento-info"><span className="vencimiento-product">{pacienteSpecies === 'Canino' ? <FaDog /> : pacienteSpecies === 'Felino' ? <FaCat /> : null}{v.productName}<span className={`badge ${status.key}`}>{status.label}</span></span><span className="vencimiento-tutor">Tutor: {v.tutorName || pacienteTutorName}</span></div><div className="vencimiento-date"><span>Vence el:</span><strong>{v.dueDate.toLocaleDateString('es-AR')}</strong>{v.suppliedDate && <span className="supplied-date">Suministrado el: {v.suppliedDate.toLocaleDateString('es-AR')}</span>}<button className={`btn btn-suministrado ${v.supplied ? 'supplied' : ''}`} onClick={() => toggleSupplied(v)}>{v.supplied ? 'Desmarcar' : 'Marcar Suministrado'}</button></div></div>);
                })}</div>
            ) : <p className="no-results-message">No hay vencimientos que coincidan con los filtros.</p>}
        </div>
    );
};

export default VencimientosManager;