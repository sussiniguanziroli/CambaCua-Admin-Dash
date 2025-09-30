import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../../firebase/config';
import { collectionGroup, query, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import SaleDetailModal from '../../administracion/SaleDetailModal';
import ViewClinicalNoteModal from '../adminPacientes/ViewClinicalNoteModal';
import ClinicalNoteModal from '../adminPacientes/ClinicalNoteModal';
import { FaEye, FaPencilAlt } from 'react-icons/fa';

const MonitorClinica = () => {
    const [flatHistory, setFlatHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({ searchTerm: '', startDate: '', endDate: '', sortOrder: 'date-desc' });
    
    const [selectedSale, setSelectedSale] = useState(null);
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    
    const [selectedNote, setSelectedNote] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const historyQuery = query(collectionGroup(db, 'clinical_history'));
            const historySnapshot = await getDocs(historyQuery);
            
            const historyPromises = historySnapshot.docs.map(async (noteDoc) => {
                const noteData = noteDoc.data();
                const patientRef = noteDoc.ref.parent.parent;
                const patientSnap = await getDoc(patientRef);
                if (!patientSnap.exists()) return null;
                const patientData = patientSnap.data();
                
                return {
                    ...noteData,
                    id: noteDoc.id,
                    pacienteId: patientRef.id,
                    pacienteName: patientData.name,
                    tutorId: patientData.tutorId,
                    tutorName: patientData.tutorName,
                    date: noteData.createdAt.toDate().toLocaleDateString('es-AR')
                };
            });

            const allHistoryEntries = (await Promise.all(historyPromises)).filter(Boolean);
            setFlatHistory(allHistoryEntries);
        } catch (error) {
            Swal.fire('Error', 'No se pudieron cargar las historias clínicas.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleViewSale = async (saleId) => {
        try {
            const saleRef = doc(db, 'ventas_presenciales', saleId);
            const saleSnap = await getDoc(saleRef);
            if (saleSnap.exists()) { setSelectedSale({ id: saleSnap.id, ...saleSnap.data(), type: 'Venta Presencial' }); setIsSaleModalOpen(true); } 
            else { Swal.fire('No encontrado', 'No se encontró la venta asociada.', 'info'); }
        } catch (error) { Swal.fire('Error', 'No se pudo cargar la venta.', 'error'); }
    };
    
    const handleViewNote = (note) => { setSelectedNote(note); setIsViewModalOpen(true); };
    const handleEditNote = (note) => { setSelectedNote(note); setIsViewModalOpen(false); setIsEditModalOpen(true); };
    const handleCloseModals = () => { setIsViewModalOpen(false); setIsEditModalOpen(false); setSelectedNote(null); };

    const handleSaveNote = async (formData, originalNote) => {
        try {
            const noteRef = doc(db, `pacientes/${originalNote.pacienteId}/clinical_history`, originalNote.id);
            await updateDoc(noteRef, formData);
            Swal.fire('Éxito', 'Nota clínica actualizada.', 'success');
            handleCloseModals();
            await fetchData();
        } catch (error) { Swal.fire('Error', 'No se pudo guardar la nota.', 'error'); }
    };

    const filteredAndSortedHistory = useMemo(() => {
        let filtered = flatHistory.filter(entry => entry.createdAt);
        const parseDate = (dateString) => new Date(dateString.split('/').reverse().join('-'));

        if (filters.startDate) { const start = new Date(filters.startDate); start.setHours(0,0,0,0); filtered = filtered.filter(entry => parseDate(entry.date) >= start); }
        if (filters.endDate) { const end = new Date(filters.endDate); end.setHours(23,59,59,999); filtered = filtered.filter(entry => parseDate(entry.date) <= end); }
        if (filters.searchTerm) {
            const lowerTerm = filters.searchTerm.toLowerCase();
            filtered = filtered.filter(entry => entry.pacienteName?.toLowerCase().includes(lowerTerm) || entry.tutorName?.toLowerCase().includes(lowerTerm) || entry.reason?.toLowerCase().includes(lowerTerm) || entry.diagnosis?.toLowerCase().includes(lowerTerm) || entry.treatment?.toLowerCase().includes(lowerTerm));
        }
        filtered.sort((a, b) => {
            if (filters.sortOrder === 'date-desc') return b.createdAt.toMillis() - a.createdAt.toMillis();
            if (filters.sortOrder === 'date-asc') return a.createdAt.toMillis() - b.createdAt.toMillis();
            if (filters.sortOrder === 'patient-asc') return (a.pacienteName || '').localeCompare(b.pacienteName || '');
            return 0;
        });
        return filtered;
    }, [flatHistory, filters]);

    return (
        <div className="monitor-clinica-container">
            {isSaleModalOpen && <SaleDetailModal sale={selectedSale} onClose={() => setIsSaleModalOpen(false)} />}
            <ViewClinicalNoteModal isOpen={isViewModalOpen} onClose={handleCloseModals} onEdit={() => handleEditNote(selectedNote)} note={selectedNote} />
            <ClinicalNoteModal isOpen={isEditModalOpen} onClose={handleCloseModals} onSave={handleSaveNote} note={selectedNote} pacienteId={selectedNote?.pacienteId} />
            <header className="monitor-header"><h1>Monitor de Historias Clínicas</h1><p>Busca y revisa todas las entradas del historial clínico de los pacientes.</p></header>
            <div className="monitor-filter-bar">
                <input type="text" name="searchTerm" placeholder="Buscar por paciente, tutor, motivo, diagnóstico..." value={filters.searchTerm} onChange={handleFilterChange} />
                <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                <select name="sortOrder" value={filters.sortOrder} onChange={handleFilterChange}><option value="date-desc">Más Recientes</option><option value="date-asc">Más Antiguas</option><option value="patient-asc">Paciente (A-Z)</option></select>
            </div>
            <main className="monitor-content">
                <div className="history-list-header"><div className="col-date">Fecha</div><div className="col-patient">Paciente / Tutor</div><div className="col-reason">Motivo</div><div className="col-details">Detalles Clínicos</div><div className="col-actions">Acciones</div></div>
                {isLoading ? <p>Cargando historias clínicas...</p> : (
                    <div className="history-list-body">
                        {filteredAndSortedHistory.length > 0 ? filteredAndSortedHistory.map(entry => (
                            <div key={entry.id} className="history-entry-card">
                                <div className="col-date">{entry.date}</div>
                                <div className="col-patient"><Link to={`/admin/paciente-profile/${entry.pacienteId}`}>{entry.pacienteName}</Link><small><Link to={`/admin/tutor-profile/${entry.tutorId}`}>{entry.tutorName}</Link></small></div>
                                <div className="col-reason">{entry.reason}{entry.saleId && <button className="sale-link-btn" title="Ver venta asociada" onClick={() => handleViewSale(entry.saleId)}>$</button>}</div>
                                <div className="col-details"><p><strong>Diagnóstico:</strong> {entry.diagnosis || 'N/A'}</p><p><strong>Tratamiento:</strong> {entry.treatment || 'N/A'}</p></div>
                                <div className="col-actions"><button className="action-btn view" onClick={() => handleViewNote(entry)}><FaEye /></button><button className="action-btn edit" onClick={() => handleEditNote(entry)}><FaPencilAlt /></button></div>
                            </div>
                        )) : <p className="no-results">No se encontraron entradas con los filtros actuales.</p>}
                    </div>
                )}
            </main>
        </div>
    );
};

export default MonitorClinica;