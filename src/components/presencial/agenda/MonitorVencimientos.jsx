import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../../firebase/config';
import { collectionGroup, query, getDocs, doc, updateDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';

const MonitorVencimientos = () => {
    const [allVencimientos, setAllVencimientos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        searchTerm: '',
        status: 'proximo',
        startDate: '',
        endDate: '',
        sortOrder: 'date-asc'
    });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const vencimientosQuery = query(collectionGroup(db, 'vencimientos'));
            const querySnapshot = await getDocs(vencimientosQuery);
            const data = querySnapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                dueDate: d.data().dueDate.toDate(),
                suppliedDate: d.data().suppliedDate ? d.data().suppliedDate.toDate() : null
            }));
            setAllVencimientos(data);
        } catch (error) {
            Swal.fire('Error', 'No se pudieron cargar los vencimientos.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const toggleSupplied = async (vencimiento) => {
        const isCurrentlySupplied = vencimiento.supplied;
        const confirmation = await Swal.fire({
            title: `¿${isCurrentlySupplied ? 'Desmarcar' : 'Marcar'} como Suministrado?`,
            text: `Esto cambiará el estado del vencimiento para "${vencimiento.productName}".`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, cambiar estado',
            cancelButtonText: 'Cancelar',
        });

        if (!confirmation.isConfirmed) return;

        try {
            const vencRef = doc(db, `pacientes/${vencimiento.pacienteId}/vencimientos`, vencimiento.id);
            await updateDoc(vencRef, {
                supplied: !isCurrentlySupplied,
                suppliedDate: !isCurrentlySupplied ? serverTimestamp() : deleteField(),
                status: !isCurrentlySupplied ? 'suministrado' : 'pendiente'
            });
            await fetchData();
            Swal.fire('¡Éxito!', 'El estado del vencimiento ha sido actualizado.', 'success');
        } catch (error) {
            Swal.fire('Error', 'No se pudo actualizar el estado.', 'error');
        }
    };
    
    const filteredAndSortedVencimientos = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const getStatus = (v) => {
            if (v.supplied) return 'suministrado';
            if (v.dueDate < today) return 'vencido';
            const daysDiff = Math.ceil((v.dueDate - today) / (1000 * 60 * 60 * 24));
            if (daysDiff <= 7) return 'proximo';
            return 'pendiente';
        };

        let filtered = allVencimientos;

        if (filters.status !== 'todos') {
            filtered = filtered.filter(v => getStatus(v) === filters.status);
        }

        if (filters.startDate) {
            const start = new Date(filters.startDate);
            start.setHours(0,0,0,0);
            filtered = filtered.filter(v => v.dueDate >= start);
        }
        if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23,59,59,999);
            filtered = filtered.filter(v => v.dueDate <= end);
        }

        if (filters.searchTerm) {
            const lowerTerm = filters.searchTerm.toLowerCase();
            filtered = filtered.filter(v => 
                v.productName?.toLowerCase().includes(lowerTerm) ||
                v.pacienteName?.toLowerCase().includes(lowerTerm) ||
                v.tutorName?.toLowerCase().includes(lowerTerm)
            );
        }

        filtered.sort((a, b) => {
            if (filters.sortOrder === 'date-asc') return a.dueDate - b.dueDate;
            if (filters.sortOrder === 'date-desc') return b.dueDate - a.dueDate;
            if (filters.sortOrder === 'patient-asc') return (a.pacienteName || '').localeCompare(b.pacienteName || '');
            return 0;
        });

        return filtered;
    }, [allVencimientos, filters]);

    const statusLabels = {
        proximo: { label: 'Próximo', icon: '🔔' },
        vencido: { label: 'Vencido', icon: '❗️' },
        pendiente: { label: 'Pendiente', icon: '🗓️' },
        suministrado: { label: 'Suministrado', icon: '✅' },
    };

    return (
        <div className="monitor-vencimientos-container">
            <header className="monitor-header">
                <h1>Monitor de Vencimientos</h1>
                <p>Administra todos los vencimientos de productos y servicios para todos los pacientes.</p>
            </header>

            <div className="monitor-filter-bar">
                <input type="text" name="searchTerm" placeholder="Buscar por paciente, tutor o producto..." value={filters.searchTerm} onChange={handleFilterChange} />
                <select name="status" value={filters.status} onChange={handleFilterChange}>
                    <option value="todos">Todos</option>
                    <option value="proximo">Próximos a Vencer (7 días)</option>
                    <option value="vencido">Vencidos</option>
                    <option value="pendiente">Pendientes</option>
                    <option value="suministrado">Suministrados</option>
                </select>
                <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                <select name="sortOrder" value={filters.sortOrder} onChange={handleFilterChange}>
                    <option value="date-asc">Vence Próximamente</option>
                    <option value="date-desc">Vence Más Tarde</option>
                    <option value="patient-asc">Paciente (A-Z)</option>
                </select>
            </div>

            <main className="monitor-content">
                {isLoading ? <p>Cargando vencimientos...</p> : (
                    <div className="vencimientos-grid">
                        {filteredAndSortedVencimientos.length > 0 ? filteredAndSortedVencimientos.map(v => {
                            const today = new Date(); today.setHours(0, 0, 0, 0);
                            let statusKey = 'pendiente';
                            if (v.supplied) statusKey = 'suministrado';
                            else if (v.dueDate < today) statusKey = 'vencido';
                            else if (Math.ceil((v.dueDate - today) / (1000 * 60 * 60 * 24)) <= 7) statusKey = 'proximo';
                            const statusInfo = statusLabels[statusKey];

                            return (
                                <div key={v.id} className={`vencimiento-card ${statusKey}`}>
                                    <div className="card-header">
                                        <span className="product-name">{v.productName}</span>
                                        <span className={`status-badge ${statusKey}`}>{statusInfo.icon} {statusInfo.label}</span>
                                    </div>
                                    <div className="card-body">
                                        <div className="info-line">
                                            <span>Paciente:</span>
                                            <Link to={`/admin/paciente-profile/${v.pacienteId}`}>{v.pacienteName}</Link>
                                        </div>
                                        <div className="info-line">
                                            <span>Tutor:</span>
                                            <Link to={`/admin/tutor-profile/${v.tutorId}`}>{v.tutorName}</Link>
                                        </div>
                                    </div>
                                    <div className="card-footer">
                                        <div className="date-info">
                                            <strong>Vence el: {v.dueDate.toLocaleDateString('es-AR')}</strong>
                                            {v.suppliedDate && <small>Suministrado: {v.suppliedDate.toLocaleDateString('es-AR')}</small>}
                                        </div>
                                        {!v.supplied && <button className="action-btn" onClick={() => toggleSupplied(v)}>Marcar Suministrado</button>}
                                    </div>
                                </div>
                            );
                        }) : <p className="no-results">No se encontraron vencimientos con los filtros actuales.</p>}
                    </div>
                )}
            </main>
        </div>
    );
};

export default MonitorVencimientos;