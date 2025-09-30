import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../../firebase/config';
import { collectionGroup, query, getDocs, doc, updateDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FaListUl, FaUserMd, FaBox, FaSyringe } from 'react-icons/fa';

const MonitorVencimientos = () => {
    const [allVencimientos, setAllVencimientos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('vencimiento');
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
                id: d.id, ...d.data(),
                dueDate: d.data().dueDate.toDate(),
                suppliedDate: d.data().suppliedDate ? d.data().suppliedDate.toDate() : null
            }));
            setAllVencimientos(data);
        } catch (error) { Swal.fire('Error', 'No se pudieron cargar los vencimientos.', 'error'); } 
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleCycleViewMode = () => {
        setViewMode(current => {
            if (current === 'vencimiento') return 'paciente';
            if (current === 'paciente') return 'producto';
            return 'vencimiento';
        });
    };

    const toggleSupplied = async (vencimiento) => {
        const isCurrentlySupplied = vencimiento.supplied;
        const result = await Swal.fire({
            title: `¿${isCurrentlySupplied ? 'Desmarcar' : 'Marcar'} Suministrado?`,
            icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, cambiar', cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;

        try {
            const vencRef = doc(db, `pacientes/${vencimiento.pacienteId}/vencimientos`, vencimiento.id);
            await updateDoc(vencRef, {
                supplied: !isCurrentlySupplied,
                suppliedDate: !isCurrentlySupplied ? serverTimestamp() : deleteField(),
                status: !isCurrentlySupplied ? 'suministrado' : 'pendiente'
            });
            await fetchData();
            Swal.fire('¡Éxito!', 'El estado ha sido actualizado.', 'success');
        } catch (error) { Swal.fire('Error', 'No se pudo actualizar el estado.', 'error'); }
    };
    
    const getStatus = (v) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (v.supplied) return 'suministrado';
        if (v.dueDate < today) return 'vencido';
        const daysDiff = Math.ceil((v.dueDate - today) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 7) return 'proximo';
        return 'pendiente';
    };

    const { filteredData, groupedByPatient, groupedByProduct } = useMemo(() => {
        let filtered = allVencimientos;
        if (filters.status !== 'todos') { filtered = filtered.filter(v => getStatus(v) === filters.status); }
        if (filters.startDate) { const start = new Date(filters.startDate); start.setHours(0,0,0,0); filtered = filtered.filter(v => v.dueDate >= start); }
        if (filters.endDate) { const end = new Date(filters.endDate); end.setHours(23,59,59,999); filtered = filtered.filter(v => v.dueDate <= end); }
        if (filters.searchTerm) {
            const lowerTerm = filters.searchTerm.toLowerCase();
            filtered = filtered.filter(v => v.productName?.toLowerCase().includes(lowerTerm) || v.pacienteName?.toLowerCase().includes(lowerTerm) || v.tutorName?.toLowerCase().includes(lowerTerm));
        }

        filtered.sort((a, b) => {
            if (filters.sortOrder === 'date-asc') return a.dueDate - b.dueDate;
            if (filters.sortOrder === 'date-desc') return b.dueDate - a.dueDate;
            if (filters.sortOrder === 'patient-asc') return (a.pacienteName || '').localeCompare(b.pacienteName || '');
            return 0;
        });

        const patientGroups = filtered.reduce((acc, v) => {
            (acc[v.pacienteId] = acc[v.pacienteId] || { info: { pacienteName: v.pacienteName, pacienteId: v.pacienteId, tutorName: v.tutorName, tutorId: v.tutorId }, vencimientos: [] }).vencimientos.push(v);
            return acc;
        }, {});

        const productGroups = filtered.reduce((acc, v) => {
            (acc[v.productName] = acc[v.productName] || { info: { productName: v.productName, isDoseable: v.appliedDosage != null }, vencimientos: [] }).vencimientos.push(v);
            return acc;
        }, {});

        return { filteredData: filtered, groupedByPatient: Object.values(patientGroups), groupedByProduct: Object.values(productGroups) };
    }, [allVencimientos, filters]);

    const statusLabels = { proximo: { label: 'Próximo', icon: '🔔' }, vencido: { label: 'Vencido', icon: '❗️' }, pendiente: { label: 'Pendiente', icon: '🗓️' }, suministrado: { label: 'Suministrado', icon: '✅' } };
    const ViewModeIcon = () => viewMode === 'vencimiento' ? <FaListUl /> : viewMode === 'paciente' ? <FaUserMd /> : <FaBox />;

    return (
        <div className="monitor-vencimientos-container">
            <header className="monitor-header"><h1>Monitor de Vencimientos</h1><p>Administra todos los vencimientos de productos y servicios para todos los pacientes.</p></header>
            <div className="monitor-filter-bar">
                <input type="text" name="searchTerm" placeholder="Buscar por paciente, tutor o producto..." value={filters.searchTerm} onChange={handleFilterChange} />
                <select name="status" value={filters.status} onChange={handleFilterChange}><option value="todos">Todos</option><option value="proximo">Próximos a Vencer</option><option value="vencido">Vencidos</option><option value="pendiente">Pendientes</option><option value="suministrado">Suministrados</option></select>
                <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                <select name="sortOrder" value={filters.sortOrder} onChange={handleFilterChange}><option value="date-asc">Vence Próximamente</option><option value="date-desc">Vence Más Tarde</option><option value="patient-asc">Paciente (A-Z)</option></select>
                <button className="view-mode-toggle" onClick={handleCycleViewMode} title="Cambiar Vista"><ViewModeIcon /></button>
            </div>

            <main className="monitor-content">
                {isLoading ? <p>Cargando...</p> : (
                    <>
                    {viewMode === 'vencimiento' && (<div className="vencimientos-grid">{filteredData.length > 0 ? filteredData.map(v => { const statusKey = getStatus(v); const statusInfo = statusLabels[statusKey];
                        return (<div key={v.id} className={`vencimiento-card ${statusKey}`}><div className="card-header"><span className="product-name">{v.productName}</span><span className={`status-badge ${statusKey}`}>{statusInfo.icon} {statusInfo.label}</span></div><div className="card-body"><div className="info-line"><span>Paciente:</span><Link to={`/admin/paciente-profile/${v.pacienteId}`}>{v.pacienteName}</Link></div><div className="info-line"><span>Tutor:</span><Link to={`/admin/tutor-profile/${v.tutorId}`}>{v.tutorName}</Link></div>{v.appliedDosage && <div className="info-line dosage"><span>Dosis Anterior:</span><strong>{v.appliedDosage}</strong></div>}</div><div className="card-footer"><div className="date-info"><strong>Vence el: {v.dueDate.toLocaleDateString('es-AR')}</strong>{v.suppliedDate && <small>Suministrado: {v.suppliedDate.toLocaleDateString('es-AR')}</small>}</div>{!v.supplied && <button className="action-btn" onClick={() => toggleSupplied(v)}>Marcar Suministrado</button>}</div></div>);
                    }) : <p className="no-results">No se encontraron vencimientos.</p>}</div>)}

                    {viewMode === 'paciente' && (<div className="vencimientos-grid">{groupedByPatient.length > 0 ? groupedByPatient.map(group => (
                        <div key={group.info.pacienteId} className="patient-group-card"><div className="card-header"><FaUserMd className="group-icon" /><div><h3>{group.info.pacienteName}</h3><small>Tutor: <Link to={`/admin/tutor-profile/${group.info.tutorId}`}>{group.info.tutorName}</Link></small></div></div><div className="vencimiento-sublist">{group.vencimientos.map(v => { const statusKey = getStatus(v); const statusInfo = statusLabels[statusKey]; return (
                            <div key={v.id} className="sublist-item"><div className="sublist-item-info"><span>{v.productName}</span>{v.appliedDosage && <small>{v.appliedDosage}</small>}</div><div className="sublist-item-status"><span className={`status-badge ${statusKey}`}>{statusInfo.label}</span><strong>{v.dueDate.toLocaleDateString('es-AR')}</strong></div></div>
                        )})}</div></div>
                    )) : <p className="no-results">No hay pacientes con vencimientos.</p>}</div>)}
                    
                    {viewMode === 'producto' && (<div className="vencimientos-grid">{groupedByProduct.length > 0 ? groupedByProduct.map(group => (
                        <div key={group.info.productName} className="product-group-card"><div className="card-header">{group.info.isDoseable ? <FaSyringe className="group-icon"/> : <FaBox className="group-icon"/>}<h3>{group.info.productName}</h3></div><div className="vencimiento-sublist">{group.vencimientos.map(v => { const statusKey = getStatus(v); const statusInfo = statusLabels[statusKey]; return (
                            <div key={v.id} className="sublist-item"><div className="sublist-item-info"><Link to={`/admin/paciente-profile/${v.pacienteId}`}>{v.pacienteName}</Link>{v.appliedDosage && <small>{v.appliedDosage}</small>}</div><div className="sublist-item-status"><span className={`status-badge ${statusKey}`}>{statusInfo.label}</span><strong>{v.dueDate.toLocaleDateString('es-AR')}</strong></div></div>
                        )})}</div></div>
                    )) : <p className="no-results">No hay productos con vencimientos.</p>}</div>)}
                    </>
                )}
            </main>
        </div>
    );
};

export default MonitorVencimientos;