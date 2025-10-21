import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../../firebase/config';
import { collectionGroup, query, getDocs, doc, getDoc, updateDoc, collection, where, documentId, orderBy, limit, startAfter } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import SaleDetailModal from '../../administracion/SaleDetailModal';
import ViewClinicalNoteModal from '../adminPacientes/ViewClinicalNoteModal';
import ClinicalNoteModal from '../adminPacientes/ClinicalNoteModal';
import { FaEye, FaPencilAlt } from 'react-icons/fa';

const ITEMS_PER_PAGE = 25;

const fetchClinicalHistoryPage = async (filters, lastVisibleDoc = null) => {
    const notesQueryConstraints = [
        orderBy('createdAt', 'desc'),
        limit(ITEMS_PER_PAGE)
    ];

    if (filters.startDate) {
        notesQueryConstraints.push(where('createdAt', '>=', new Date(filters.startDate)));
    }
    if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        notesQueryConstraints.push(where('createdAt', '<=', end));
    }

    if (lastVisibleDoc) {
        notesQueryConstraints.push(startAfter(lastVisibleDoc));
    }

    const notesQuery = query(collectionGroup(db, 'clinical_history'), ...notesQueryConstraints);
    const notesSnapshot = await getDocs(notesQuery);

    const clinicalNotes = notesSnapshot.docs.map(d => ({ ...d.data(), id: d.id, pacienteId: d.ref.parent.parent.id }));
    const newLastVisibleDoc = notesSnapshot.docs[notesSnapshot.docs.length - 1];
    
    if (clinicalNotes.length === 0) {
        return { combinedData: [], lastDoc: newLastVisibleDoc, hasMore: false };
    }

    const patientIds = [...new Set(clinicalNotes.map(note => note.pacienteId).filter(Boolean))];

    if (patientIds.length === 0) {
        const combinedData = clinicalNotes.map(note => ({
            ...note,
            date: note.createdAt.toDate().toLocaleDateString('es-AR')
        }));
        return { combinedData, lastDoc: newLastVisibleDoc, hasMore: clinicalNotes.length === ITEMS_PER_PAGE };
    }
    
    const patientsQuery = query(collection(db, 'pacientes'), where(documentId(), 'in', patientIds));
    const patientsSnapshot = await getDocs(patientsQuery);

    const patientsMap = new Map();
    patientsSnapshot.docs.forEach(doc => {
        patientsMap.set(doc.id, doc.data());
    });

    const combinedData = clinicalNotes.map(note => {
        const patientData = patientsMap.get(note.pacienteId) || {};
        return {
            ...note,
            pacienteName: patientData.name || 'N/A',
            tutorId: patientData.tutorId || 'N/A',
            tutorName: patientData.tutorName || 'N/A',
            date: note.createdAt.toDate().toLocaleDateString('es-AR')
        };
    });

    return { combinedData, lastDoc: newLastVisibleDoc, hasMore: clinicalNotes.length === ITEMS_PER_PAGE };
};


const MonitorClinica = () => {
    const [historyEntries, setHistoryEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    
    const [filters, setFilters] = useState({ searchTerm: '', startDate: '', endDate: '', sortOrder: 'date-desc' });
    
    const [selectedSale, setSelectedSale] = useState(null);
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    
    const [selectedNote, setSelectedNote] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const loadEntries = useCallback(async (currentFilters, lastDoc = null) => {
        if (lastDoc) setIsLoadingMore(true);
        else setIsLoading(true);

        try {
            const { combinedData, lastDoc: newLastDoc, hasMore: newHasMore } = await fetchClinicalHistoryPage(currentFilters, lastDoc);
            setHistoryEntries(prev => lastDoc ? [...prev, ...combinedData] : combinedData);
            setLastVisibleDoc(newLastDoc);
            setHasMore(newHasMore);
        } catch (error) {
            Swal.fire('Error', 'No se pudieron cargar las historias clínicas.', 'error');
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        setHistoryEntries([]);
        setLastVisibleDoc(null);
        setHasMore(true);
        loadEntries(filters, null);
    }, [filters.startDate, filters.endDate, loadEntries]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const handleLoadMore = () => {
        if (hasMore && !isLoadingMore) {
            loadEntries(filters, lastVisibleDoc);
        }
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
            setHistoryEntries(prev => prev.map(entry => entry.id === originalNote.id ? { ...entry, ...formData } : entry));
            Swal.fire('Éxito', 'Nota clínica actualizada.', 'success');
            handleCloseModals();
        } catch (error) { Swal.fire('Error', 'No se pudo guardar la nota.', 'error'); }
    };

    const filteredAndSortedHistory = useMemo(() => {
        let filtered = [...historyEntries];
        
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
    }, [historyEntries, filters.searchTerm, filters.sortOrder]);

    return (
        <div className="monitor-clinica-container">
            {isSaleModalOpen && <SaleDetailModal sale={selectedSale} onClose={() => setIsSaleModalOpen(false)} />}
            <ViewClinicalNoteModal isOpen={isViewModalOpen} onClose={handleCloseModals} onEdit={() => handleEditNote(selectedNote)} note={selectedNote} />
            <ClinicalNoteModal isOpen={isEditModalOpen} onClose={handleCloseModals} onSave={handleSaveNote} note={selectedNote} pacienteId={selectedNote?.pacienteId} />
            <header className="monitor-header"><h1>Monitor de Historias Clínicas</h1><p>Busca y revisa todas las entradas del historial clínico de los pacientes.</p></header>
            <div className="monitor-filter-bar">
                <input type="text" name="searchTerm" placeholder="Buscar en resultados cargados..." value={filters.searchTerm} onChange={handleFilterChange} />
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
                {isLoadingMore && <p>Cargando más...</p>}
                {!isLoading && hasMore && (
                    <div className="load-more-container">
                        <button onClick={handleLoadMore} disabled={isLoadingMore}>Cargar Más</button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default MonitorClinica;