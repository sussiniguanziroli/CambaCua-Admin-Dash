import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';
import { CiUser } from 'react-icons/ci';
import { FaTrash } from 'react-icons/fa';
import CreatePeluqueroNoteModal from './CreatePeluqueroNoteModal';
import ViewPeluqueroNoteModal from './ViewPeluqueroNoteModal';
import EditPeluqueroNoteModal from './EditPeluqueroNoteModal';

const PeluqueroProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [peluquero, setPeluquero] = useState(null);
    const [turnos, setTurnos] = useState([]);
    const [notes, setNotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('turnos');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const [turnosFilters, setTurnosFilters] = useState({ searchTerm: '', startDate: '', endDate: '' });
    
    const [isCreateNoteModalOpen, setCreateNoteModalOpen] = useState(false);
    const [selectedNote, setSelectedNote] = useState(null);
    const [isViewNoteModalOpen, setViewNoteModalOpen] = useState(false);
    const [isEditNoteModalOpen, setEditNoteModalOpen] = useState(false);


    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const peluqueroRef = doc(db, 'peluqueros', id);
            const notesQuery = query(collection(db, `peluqueros/${id}/notas`), orderBy('createdAt', 'desc'));
            const turnosQuery1 = query(collection(db, 'turnos_peluqueria'), where('peluqueroId', '==', id));
            const turnosQuery2 = query(collection(db, 'turnos_peluqueria'), where('peluqueroid', '==', id));
            
            const [peluqueroSnap, notesSnap, turnosSnap1, turnosSnap2] = await Promise.all([
                getDoc(peluqueroRef),
                getDocs(notesQuery),
                getDocs(turnosQuery1),
                getDocs(turnosQuery2)
            ]);

            if (!peluqueroSnap.exists()) { navigate('/admin/peluqueros'); return; }
            setPeluquero({ id: peluqueroSnap.id, ...peluqueroSnap.data() });
            setNotes(notesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            
            const combinedTurnos = new Map();
            turnosSnap1.docs.forEach(d => combinedTurnos.set(d.id, { id: d.id, ...d.data(), startTime: d.data().startTime.toDate() }));
            turnosSnap2.docs.forEach(d => combinedTurnos.set(d.id, { id: d.id, ...d.data(), startTime: d.data().startTime.toDate() }));

            setTurnos(Array.from(combinedTurnos.values()).sort((a, b) => b.startTime - a.startTime));

        } catch (error) { console.error("Error fetching data:", error); } 
        finally { setIsLoading(false); }
    }, [id, navigate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSaveNote = async (noteData, originalNote) => {
        try {
            if (originalNote) {
                await updateDoc(doc(db, `peluqueros/${id}/notas`, originalNote.id), noteData);
            } else {
                await addDoc(collection(db, `peluqueros/${id}/notas`), { ...noteData, createdAt: Timestamp.now() });
            }
            fetchData();
            setCreateNoteModalOpen(false);
            setEditNoteModalOpen(false);
        } catch (error) { console.error("Error saving note: ", error); }
    };

    const handleDeleteNote = async (noteId) => {
        const { isConfirmed } = await Swal.fire({ title: '¿Eliminar Nota?', text: 'Esta acción no se puede deshacer.', icon: 'warning', showCancelButton: true });
        if (isConfirmed) {
            await deleteDoc(doc(db, `peluqueros/${id}/notas`, noteId));
            fetchData();
        }
    };

    const handleTurnosFilterChange = (e) => {
        const { name, value } = e.target;
        setTurnosFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const filteredTurnos = useMemo(() => {
        let filtered = [...turnos];
        if (turnosFilters.startDate) { filtered = filtered.filter(t => t.startTime >= new Date(turnosFilters.startDate)); }
        if (turnosFilters.endDate) { filtered = filtered.filter(t => t.startTime <= new Date(turnosFilters.endDate)); }
        if (turnosFilters.searchTerm) { const term = turnosFilters.searchTerm.toLowerCase(); filtered = filtered.filter(t => t.pacienteName.toLowerCase().includes(term) || t.tutorName.toLowerCase().includes(term)); }
        return filtered;
    }, [turnos, turnosFilters]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = activeTab === 'turnos' ? filteredTurnos.slice(indexOfFirstItem, indexOfLastItem) : notes.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil((activeTab === 'turnos' ? filteredTurnos.length : notes.length) / itemsPerPage);

    if (isLoading) return <p className="loading-message">Cargando perfil...</p>;
    if (!peluquero) return null;

    return (
        <div className="profile-container peluquero-profile">
            <CreatePeluqueroNoteModal isOpen={isCreateNoteModalOpen} onClose={() => setCreateNoteModalOpen(false)} onSave={handleSaveNote} />
            <ViewPeluqueroNoteModal isOpen={isViewNoteModalOpen} onClose={() => setViewNoteModalOpen(false)} note={selectedNote} onEdit={() => { setViewNoteModalOpen(false); setEditNoteModalOpen(true); }} />
            <EditPeluqueroNoteModal isOpen={isEditNoteModalOpen} onClose={() => setEditNoteModalOpen(false)} note={selectedNote} onSave={handleSaveNote} />
            
            <div className="profile-header">
                <div className="profile-avatar"><CiUser /></div>
                <div className="profile-info"><h1>{peluquero.name}</h1><p>{peluquero.phone}</p></div>
                <div className="profile-actions">
                    <Link to={`/admin/edit-peluquero/${id}`} className="btn btn-secondary">Editar Perfil</Link>
                    <button className="btn btn-primary" onClick={() => navigate('/admin/agenda-peluqueria')}>Ir a la Agenda</button>
                </div>
            </div>
            
            <div className="profile-nav">
                <button className={activeTab === 'turnos' ? 'active' : ''} onClick={() => { setActiveTab('turnos'); setCurrentPage(1); }}>Turnos Asignados</button>
                <button className={activeTab === 'notas' ? 'active' : ''} onClick={() => { setActiveTab('notas'); setCurrentPage(1); }}>Notas</button>
            </div>

            <div className="profile-content">
                {activeTab === 'turnos' && (
                    <div>
                        <div className="turnos-filters">
                            <input type="text" name="searchTerm" placeholder="Buscar por paciente o tutor..." value={turnosFilters.searchTerm} onChange={handleTurnosFilterChange} />
                            <input type="date" name="startDate" value={turnosFilters.startDate} onChange={handleTurnosFilterChange} />
                            <input type="date" name="endDate" value={turnosFilters.endDate} onChange={handleTurnosFilterChange} />
                        </div>
                        <div className="turnos-list">
                            {currentItems.length > 0 ? currentItems.map(t => (
                                <div key={t.id} className="turno-card">
                                    <div className="turno-info">
                                        <p><strong>Paciente:</strong> <Link to={`/admin/paciente-profile/${t.pacienteId}`}>{t.pacienteName}</Link></p>
                                        <p><strong>Tutor:</strong> <Link to={`/admin/tutor-profile/${t.tutorId}`}>{t.tutorName}</Link></p>
                                        <p><strong>Servicios:</strong> {(t.services || []).map(s => s.name).join(', ')}</p>
                                    </div>
                                    <div className="turno-date">
                                        {t.startTime.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })} hs
                                    </div>
                                </div>
                            )) : <p>No hay turnos para los filtros seleccionados.</p>}
                        </div>
                    </div>
                )}

                {activeTab === 'notas' && (
                     <div>
                        <div className="notas-header">
                            <h3>Notas Internas</h3>
                            <button className="btn btn-primary" onClick={() => setCreateNoteModalOpen(true)}>+ Nueva Nota</button>
                        </div>
                        <div className="notas-list">
                            {currentItems.length > 0 ? currentItems.map(n => (
                                <div key={n.id} className="nota-card">
                                    <div className="nota-info">
                                        <p className="nota-title">{n.title}</p>
                                        <p className="nota-date">{n.createdAt.toDate().toLocaleDateString('es-AR')}</p>
                                    </div>
                                    <div className="nota-actions">
                                        <button className="btn btn-secondary" onClick={() => { setSelectedNote(n); setViewNoteModalOpen(true); }}>Ver</button>
                                        <button className="btn btn-delete-small" onClick={() => handleDeleteNote(n.id)}><FaTrash /></button>
                                    </div>
                                </div>
                            )) : <p>No hay notas registradas.</p>}
                        </div>
                    </div>
                )}
                 {totalPages > 1 && (
                    <div className="pagination-controls">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</button>
                        <span>Página {currentPage} de {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PeluqueroProfile;