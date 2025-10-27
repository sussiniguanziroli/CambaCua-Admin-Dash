import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, getDocs, orderBy, updateDoc, addDoc, Timestamp, deleteDoc, where } from 'firebase/firestore';
import { db, storage } from '../../../firebase/config';
import { ref, deleteObject } from 'firebase/storage';
import { FaDog, FaCat, FaTrash, FaStethoscope } from 'react-icons/fa';
import { PiBathtub } from 'react-icons/pi';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import VencimientosManager from './VencimientosManager';
import AddVencimientoModal from './AddVencimientoModal';
import ClinicalNoteModal from './ClinicalNoteModal';
import ViewClinicalNoteModal from './ViewClinicalNoteModal';
import CreateRecipeModal from './CreateRecipeModal';
import ViewRecipeModal from './ViewRecipeModal';
import CreateNotaPeluqueriaModal from './CreateNotaPeluqueriaModal';
import ViewNotaPeluqueriaModal from './ViewNotaPeluqueriaModal';
import EditNotaPeluqueriaModal from './EditNotaPeluqueriaModal';
import LoaderSpinner from '../../utils/LoaderSpinner';

const CustomAlert = ({ message, type, onClose }) => { if (!message) return null; return (<div className={`custom-alert ${type === 'error' ? 'alert-error' : 'alert-success'}`}><span>{message}</span><button onClick={onClose}>&times;</button></div>); };

const PacienteProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState(null);
  const [allAppointments, setAllAppointments] = useState([]);
  const [vencimientos, setVencimientos] = useState([]);
  const [clinicalHistory, setClinicalHistory] = useState([]);
  const [groomingNotes, setGroomingNotes] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('historia');
  const [alert, setAlert] = useState({ message: '', type: '' });
  const itemsPerPage = 5;

  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [groomingNotesCurrentPage, setGroomingNotesCurrentPage] = useState(1);
  const [recipesCurrentPage, setRecipesCurrentPage] = useState(1);
  const [citasCurrentPage, setCitasCurrentPage] = useState(1);

  const [historyFilters, setHistoryFilters] = useState({ searchTerm: '', startDate: '', endDate: '', sortOrder: 'date-desc' });
  const [recipeFilters, setRecipeFilters] = useState({ searchTerm: '', startDate: '', endDate: '', sortOrder: 'date-desc' });
  const [citasFilters, setCitasFilters] = useState({ startDate: '', endDate: '', serviceType: 'todos' });
  const [groomingNotesFilters, setGroomingNotesFilters] = useState({ searchTerm: '', startDate: '', endDate: '', sortOrder: 'date-desc' });

  const [isAddVencimientoModalOpen, setIsAddVencimientoModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateRecipeModalOpen, setIsCreateRecipeModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [isCreateNotaPeluqueriaModalOpen, setIsCreateNotaPeluqueriaModalOpen] = useState(false);
  const [selectedGroomingNote, setSelectedGroomingNote] = useState(null);
  const [isViewGroomingNoteModalOpen, setIsViewGroomingNoteModalOpen] = useState(false);
  const [isEditGroomingNoteModalOpen, setIsEditGroomingNoteModalOpen] = useState(false);

  const handleAlertClose = () => setAlert({ message: '', type: '' });
  const handleCloseModals = () => { setIsViewModalOpen(false); setIsEditModalOpen(false); setSelectedNote(null); setIsCreateRecipeModalOpen(false); setSelectedRecipe(null); setIsCreateNotaPeluqueriaModalOpen(false); setIsViewGroomingNoteModalOpen(false); setIsEditGroomingNoteModalOpen(false); setSelectedGroomingNote(null); };

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const pacienteRef = doc(db, 'pacientes', id);
      const historyQuery = query(collection(db, `pacientes/${id}/clinical_history`), orderBy('createdAt', 'desc'));
      const groomingNotesQuery = query(collection(db, `pacientes/${id}/notas_peluqueria`), orderBy('createdAt', 'desc'));
      const recipesQuery = query(collection(db, `pacientes/${id}/clinical_recipes`), orderBy('createdAt', 'desc'));
      const citasQuery = query(collection(db, 'citas'), where('pacienteId', '==', id), orderBy('startTime', 'desc'));
      const groomingAppointmentsQuery = query(collection(db, 'turnos_peluqueria'), where('pacienteId', '==', id), orderBy('startTime', 'desc'));
      const vencQuery = query(collection(db, `pacientes/${id}/vencimientos`), orderBy('dueDate', 'asc'));

      const [pacienteSnap, historySnap, groomingNotesSnap, recipesSnap, citasSnap, groomingAppointmentsSnap, vencSnap] = await Promise.all([ 
        getDoc(pacienteRef), 
        getDocs(historyQuery), 
        getDocs(groomingNotesQuery), 
        getDocs(recipesQuery), 
        getDocs(citasQuery), // <-- Error estaba aquí: decía getDocs(citasSnap)
        getDocs(groomingAppointmentsQuery), 
        getDocs(vencQuery) 
      ]);

      if (!pacienteSnap.exists()) { setPaciente(null); setAlert({ message: 'Paciente no encontrado.', type: 'error' }); return; }
      setPaciente({ id: pacienteSnap.id, ...pacienteSnap.data() });
      setClinicalHistory(historySnap.docs.map((d) => ({ id: d.id, ...d.data(), date: d.data().createdAt.toDate().toLocaleDateString('es-AR') })));
      setGroomingNotes(groomingNotesSnap.docs.map((d) => ({ id: d.id, ...d.data(), date: d.data().createdAt.toDate().toLocaleDateString('es-AR') })));
      setRecipes(recipesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      
      const clinicalAppointments = citasSnap.docs.map(d => ({ ...d.data(), id: d.id, appointmentType: 'clinical', startTime: d.data().startTime.toDate() }));
      const groomingAppointments = groomingAppointmentsSnap.docs.map(d => ({ ...d.data(), id: d.id, appointmentType: 'grooming', startTime: d.data().startTime.toDate() }));
      setAllAppointments([...clinicalAppointments, ...groomingAppointments].sort((a, b) => b.startTime - a.startTime));
      
      setVencimientos(vencSnap.docs.map((d) => ({ id: d.id, ...d.data(), dueDate: d.data().dueDate?.toDate(), suppliedDate: d.data().suppliedDate?.toDate() })));
    } catch (err) { console.error('Error fetching patient data:', err); setAlert({ message: 'No se pudieron cargar los datos del paciente.', type: 'error' });
    } finally { setIsLoading(false); }
  }, [id]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const handleSaveClinicalNote = async (formData, originalNote) => { try { if (originalNote) { await updateDoc(doc(db, `pacientes/${id}/clinical_history`, originalNote.id), formData); setAlert({ message: 'Nota clínica actualizada.', type: 'success' }); } else { await addDoc(collection(db, `pacientes/${id}/clinical_history`), { ...formData, createdAt: Timestamp.now() }); setAlert({ message: 'Nota agregada.', type: 'success' }); } handleCloseModals(); await fetchAllData(); } catch (error) { setAlert({ message: 'No se pudo guardar la nota.', type: 'error' }); } };
  
  const handleDeleteClinicalNote = async (note) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Eliminar Nota Clínica?',
      text: `Se eliminará la nota "${note.reason || 'Sin motivo'}" del ${note.date}. Se borrarán también los archivos adjuntos. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (isConfirmed) {
      try {
        if (note.media && note.media.length > 0) {
          const deletePromises = note.media.map(file => {
            try {
              return deleteObject(ref(storage, file.url));
            } catch (storageError) {
              console.warn("Error al intentar borrar archivo de storage:", storageError);
              return Promise.resolve();
            }
          });
          await Promise.all(deletePromises);
        }
        await deleteDoc(doc(db, `pacientes/${id}/clinical_history`, note.id));
        setAlert({ message: 'Nota clínica eliminada.', type: 'success' });
        await fetchAllData();
      } catch (error) {
        setAlert({ message: 'No se pudo eliminar la nota o sus archivos.', type: 'error' });
      }
    }
  };

  const handleSaveRecipe = async (recipeData) => { try { await addDoc(collection(db, `pacientes/${id}/clinical_recipes`), { ...recipeData, createdAt: Timestamp.now() }); setAlert({ message: 'Receta guardada.', type: 'success' }); handleCloseModals(); await fetchAllData(); } catch (error) { setAlert({ message: 'No se pudo guardar la receta.', type: 'error' }); } };
  const handleSaveGroomingNote = async (noteData, originalNote) => { try { if (originalNote) { await updateDoc(doc(db, `pacientes/${id}/notas_peluqueria`, originalNote.id), noteData); setAlert({ message: 'Nota de peluquería actualizada.', type: 'success' }); } else { await addDoc(collection(db, `pacientes/${id}/notas_peluqueria`), { ...noteData, createdAt: Timestamp.now() }); setAlert({ message: 'Nota de peluquería guardada.', type: 'success' }); } handleCloseModals(); await fetchAllData(); } catch (error) { setAlert({ message: 'No se pudo guardar la nota de peluquería.', type: 'error' }); } };
  const handleDeleteRecipe = async (recipeId) => { const { isConfirmed } = await Swal.fire({ title: '¿Eliminar Receta?', text: 'Esta acción no se puede deshacer.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' }); if (isConfirmed) { try { await deleteDoc(doc(db, `pacientes/${id}/clinical_recipes`, recipeId)); setAlert({ message: 'Receta eliminada.', type: 'success' }); await fetchAllData(); } catch (error) { setAlert({ message: 'No se pudo eliminar la receta.', type: 'error' }); } } };
  const handleDeleteGroomingNote = async (note) => { const { isConfirmed } = await Swal.fire({ title: '¿Eliminar Nota?', text: 'Se eliminarán también los archivos adjuntos.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' }); if (isConfirmed) { try { if (note.media && note.media.length > 0) { const deletePromises = note.media.map(file => deleteObject(ref(storage, file.url))); await Promise.all(deletePromises); } await deleteDoc(doc(db, `pacientes/${id}/notas_peluqueria`, note.id)); setAlert({ message: 'Nota eliminada.', type: 'success' }); await fetchAllData(); } catch (error) { setAlert({ message: 'No se pudo eliminar la nota.', type: 'error' }); } } };
  const handlePrintRecipe = async (elementId) => { const input = document.getElementById(elementId); const canvas = await html2canvas(input, { scale: 2 }); const imgData = canvas.toDataURL('image/png'); const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' }); const pdfWidth = pdf.internal.pageSize.getWidth(); const pdfHeight = (canvas.height * pdfWidth) / canvas.width; pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight); pdf.save(`receta_${paciente.name}_${new Date().toLocaleDateString('es-AR')}.pdf`); };
  
  const handleViewNote = (note) => { setSelectedNote(note); setIsViewModalOpen(true); };
  const handleEditNote = (note) => { setSelectedNote(note); setIsViewModalOpen(false); setIsEditModalOpen(true); };
  const handleAddNewNote = () => { setSelectedNote(null); setIsEditModalOpen(true); };
  const handleViewGroomingNote = (note) => { setSelectedGroomingNote(note); setIsViewGroomingNoteModalOpen(true); };
  const handleEditGroomingNote = (note) => { setSelectedGroomingNote(note); setIsViewGroomingNoteModalOpen(false); setIsEditGroomingNoteModalOpen(true); };

  const handleHistoryFilterChange = (e) => { const { name, value } = e.target; setHistoryFilters((prev) => ({ ...prev, [name]: value })); setHistoryCurrentPage(1); };
  const handleRecipeFilterChange = (e) => { const { name, value } = e.target; setRecipeFilters((prev) => ({ ...prev, [name]: value })); setRecipesCurrentPage(1); };
  const handleCitasFilterChange = (e) => { const { name, value } = e.target; setCitasFilters(prev => ({ ...prev, [name]: value })); setCitasCurrentPage(1); };
  const handleGroomingNotesFilterChange = (e) => { const { name, value } = e.target; setGroomingNotesFilters((prev) => ({ ...prev, [name]: value })); setGroomingNotesCurrentPage(1); };

  const filteredAndSortedHistory = useMemo(() => { let filtered = [...clinicalHistory]; if (historyFilters.startDate) { const start = new Date(historyFilters.startDate); start.setHours(0, 0, 0, 0); filtered = filtered.filter((e) => e.createdAt.toDate() >= start); } if (historyFilters.endDate) { const end = new Date(historyFilters.endDate); end.setHours(23, 59, 59, 999); filtered = filtered.filter((e) => e.createdAt.toDate() <= end); } if (historyFilters.searchTerm) { const term = historyFilters.searchTerm.toLowerCase(); filtered = filtered.filter((e) => (e.reason || '').toLowerCase().includes(term) || (e.diagnosis || '').toLowerCase().includes(term) || (e.treatment || '').toLowerCase().includes(term)); } filtered.sort((a, b) => { if (historyFilters.sortOrder === 'date-desc') return b.createdAt.toMillis() - a.createdAt.toMillis(); return a.createdAt.toMillis() - b.createdAt.toMillis(); }); return filtered; }, [clinicalHistory, historyFilters]);
  const filteredAndSortedRecipes = useMemo(() => { let filtered = [...recipes]; if (recipeFilters.startDate) { const start = new Date(recipeFilters.startDate); start.setHours(0, 0, 0, 0); filtered = filtered.filter((r) => r.createdAt.toDate() >= start); } if (recipeFilters.endDate) { const end = new Date(recipeFilters.endDate); end.setHours(23, 59, 59, 999); filtered = filtered.filter((r) => r.createdAt.toDate() <= end); } if (recipeFilters.searchTerm) { const term = recipeFilters.searchTerm.toLowerCase(); filtered = filtered.filter((r) => (r.prescribedBy || '').toLowerCase().includes(term) || (r.prescriptions || []).some((p) => (p.productName || '').toLowerCase().includes(term))); } filtered.sort((a, b) => { if (recipeFilters.sortOrder === 'date-desc') return b.createdAt.toMillis() - a.createdAt.toMillis(); return a.createdAt.toMillis() - b.createdAt.toMillis(); }); return filtered; }, [recipes, recipeFilters]);
  const filteredAppointments = useMemo(() => { let filtered = [...allAppointments]; if (citasFilters.serviceType !== 'todos') { filtered = filtered.filter(a => a.appointmentType === citasFilters.serviceType); } if (citasFilters.startDate) { const start = new Date(citasFilters.startDate); start.setHours(0, 0, 0, 0); filtered = filtered.filter(a => a.startTime >= start); } if (citasFilters.endDate) { const end = new Date(citasFilters.endDate); end.setHours(23, 59, 59, 999); filtered = filtered.filter(a => a.startTime <= end); } return filtered; }, [allAppointments, citasFilters]);
  const filteredGroomingNotes = useMemo(() => { let filtered = [...groomingNotes]; if (groomingNotesFilters.startDate) { const start = new Date(groomingNotesFilters.startDate); start.setHours(0, 0, 0, 0); filtered = filtered.filter((e) => e.createdAt.toDate() >= start); } if (groomingNotesFilters.endDate) { const end = new Date(groomingNotesFilters.endDate); end.setHours(23, 59, 59, 999); filtered = filtered.filter((e) => e.createdAt.toDate() <= end); } if (groomingNotesFilters.searchTerm) { const term = groomingNotesFilters.searchTerm.toLowerCase(); filtered = filtered.filter((e) => (e.title || '').toLowerCase().includes(term) || (e.description || '').toLowerCase().includes(term)); } filtered.sort((a, b) => { if (groomingNotesFilters.sortOrder === 'date-desc') return b.createdAt.toMillis() - a.createdAt.toMillis(); return a.createdAt.toMillis() - b.createdAt.toMillis(); }); return filtered; }, [groomingNotes, groomingNotesFilters]);
  
  const calculateAge = (birthDateStr) => { if (!birthDateStr) return 'N/A'; const bd = new Date(birthDateStr); if (isNaN(bd.getTime())) return 'N/A'; const now = new Date(); let years = now.getFullYear() - bd.getFullYear(); let months = now.getMonth() - bd.getMonth(); if (now.getDate() < bd.getDate()) months--; if (months < 0) { years--; months += 12; } if (years < 0) return 'N/A'; return years === 0 ? `${months} meses` : `${years} año${years > 1 ? 's' : ''}${months ? `, ${months} meses` : ''}`; };
  const handleStartSale = () => { navigate('/admin/vender', { state: { tutor: { id: paciente.tutorId, name: paciente.tutorName }, patient: { id: paciente.id, name: paciente.name } } }); };

  if (isLoading) return (<div className="loading-message"><LoaderSpinner /><p>Cargando perfil del paciente...</p></div>);
  if (!paciente) return (<div className="error-message-container"><p className="error-message">No se encontró el paciente.</p><button onClick={() => navigate('/admin/pacientes')} className="btn btn-primary">Volver</button></div>);

  const renderPagination = (currentPage, totalPages, setCurrentPage) => {
    if (totalPages <= 1) return null;
    return (
      <div className="pagination-controls">
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</button>
        <span>Página {currentPage} de {totalPages}</span>
        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente</button>
      </div>
    );
  };

  const renderHistoria = () => {
    const totalPages = Math.ceil(filteredAndSortedHistory.length / itemsPerPage);
    const currentItems = filteredAndSortedHistory.slice((historyCurrentPage - 1) * itemsPerPage, historyCurrentPage * itemsPerPage);
    return (<div className="tab-content"><div className="history-controls"><input type="text" name="searchTerm" placeholder="Buscar en historia..." value={historyFilters.searchTerm} onChange={handleHistoryFilterChange} /><input type="date" name="startDate" value={historyFilters.startDate} onChange={handleHistoryFilterChange} /><input type="date" name="endDate" value={historyFilters.endDate} onChange={handleHistoryFilterChange} /><select name="sortOrder" value={historyFilters.sortOrder} onChange={handleHistoryFilterChange}><option value="date-desc">Más Recientes</option><option value="date-asc">Más Antiguas</option></select></div>{currentItems.length > 0 ? (<div className="clinical-history-list">{currentItems.map((entry) => (<div key={entry.id} className="clinical-entry-card"><div className="entry-header" onClick={() => handleViewNote(entry)}><div className="header-info"><span className="entry-date">{entry.date}</span><strong className="entry-reason">{entry.reason}</strong></div><button className="btn-delete-note" onClick={(e) => { e.stopPropagation(); handleDeleteClinicalNote(entry); }}><FaTrash /></button></div><div className="entry-body" onClick={() => handleViewNote(entry)}><p><strong>Diagnóstico:</strong> {entry.diagnosis || 'N/A'}</p></div></div>))}</div>) : (<p className="no-results-message">No hay entradas.</p>)}{renderPagination(historyCurrentPage, totalPages, setHistoryCurrentPage)}</div>);
  };
  
  const renderCitas = () => {
    const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
    const currentItems = filteredAppointments.slice((citasCurrentPage - 1) * itemsPerPage, citasCurrentPage * itemsPerPage);
    return (<div className="tab-content"><div className="citas-controls"><select name="serviceType" value={citasFilters.serviceType} onChange={handleCitasFilterChange}><option value="todos">Todos los Servicios</option><option value="clinical">Clínica</option><option value="grooming">Peluquería</option></select><input type="date" name="startDate" value={citasFilters.startDate} onChange={handleCitasFilterChange} /><input type="date" name="endDate" value={citasFilters.endDate} onChange={handleCitasFilterChange} /></div>{currentItems.length > 0 ? (currentItems.map((cita) => (<div key={cita.id} className="cita-card"><p><strong>Fecha:</strong> {cita.startTime.toLocaleString('es-AR')}</p><p><strong>Servicios:</strong> {cita.appointmentType === 'clinical' ? (cita.services || []).map((s) => s.name || s.nombre).join(', ') : (cita.services || []).map((s) => s.name).join(', ')}</p></div>))) : (<p className="no-results-message">No hay citas para los filtros seleccionados.</p>)}{renderPagination(citasCurrentPage, totalPages, setCitasCurrentPage)}</div>);
  };
  
  const renderRecetas = () => {
    const totalPages = Math.ceil(filteredAndSortedRecipes.length / itemsPerPage);
    const currentItems = filteredAndSortedRecipes.slice((recipesCurrentPage - 1) * itemsPerPage, recipesCurrentPage * itemsPerPage);
    return (<div className="tab-content"><div className="recipe-controls">{!paciente.fallecido && (<button className="btn btn-primary" onClick={() => setIsCreateRecipeModalOpen(true)}>+ Nueva Receta</button>)}<div className="filters-group"><input type="text" name="searchTerm" placeholder="Buscar por doctor o producto..." value={recipeFilters.searchTerm} onChange={handleRecipeFilterChange} /><input type="date" name="startDate" value={recipeFilters.startDate} onChange={handleRecipeFilterChange} /><input type="date" name="endDate" value={recipeFilters.endDate} onChange={handleRecipeFilterChange} /><select name="sortOrder" value={recipeFilters.sortOrder} onChange={handleRecipeFilterChange}><option value="date-desc">Más Recientes</option><option value="date-asc">Más Antiguas</option></select></div></div><div className="recipe-list">{currentItems.length > 0 ? (currentItems.map((recipe) => (<div key={recipe.id} className="recipe-list-item"><span>Receta del{" "}{recipe.createdAt.toDate().toLocaleDateString("es-AR")}</span><div className="recipe-actions"><button className="btn btn-secondary" onClick={() => setSelectedRecipe(recipe)}>Ver/Imprimir</button>{!paciente.fallecido && (<button className="btn btn-delete-small" onClick={() => handleDeleteRecipe(recipe.id)}><FaTrash /></button>)}</div></div>))) : (<p className="no-results-message">No hay recetas.</p>)}{renderPagination(recipesCurrentPage, totalPages, setRecipesCurrentPage)}</div></div>);
  };
  
  const renderNotasPeluqueria = () => {
    const totalPages = Math.ceil(filteredGroomingNotes.length / itemsPerPage);
    const currentItems = filteredGroomingNotes.slice((groomingNotesCurrentPage - 1) * itemsPerPage, groomingNotesCurrentPage * itemsPerPage);
    return (<div className="tab-content"><div className="recipe-controls">{!paciente.fallecido && (<button className="btn btn-primary" onClick={() => setIsCreateNotaPeluqueriaModalOpen(true)}>+ Nota Peluquería</button>)}<div className="filters-group"><input type="text" name="searchTerm" placeholder="Buscar en notas..." value={groomingNotesFilters.searchTerm} onChange={handleGroomingNotesFilterChange} /><input type="date" name="startDate" value={groomingNotesFilters.startDate} onChange={handleGroomingNotesFilterChange} /><input type="date" name="endDate" value={groomingNotesFilters.endDate} onChange={handleGroomingNotesFilterChange} /><select name="sortOrder" value={groomingNotesFilters.sortOrder} onChange={handleGroomingNotesFilterChange}><option value="date-desc">Más Recientes</option><option value="date-asc">Más Antiguas</option></select></div></div><div className="recipe-list">{currentItems.length > 0 ? (currentItems.map((note) => (<div key={note.id} className="recipe-list-item"><span>Nota del {note.date}</span><div className="recipe-actions"><button className="btn btn-secondary" onClick={() => handleViewGroomingNote(note)}>Ver</button>{!paciente.fallecido && (<button className="btn btn-delete-small" onClick={() => handleDeleteGroomingNote(note)}><FaTrash /></button>)}</div></div>))) : (<p className="no-results-message">No hay notas de peluquería.</p>)}{renderPagination(groomingNotesCurrentPage, totalPages, setGroomingNotesCurrentPage)}</div></div>);
  };
  
  const renderVencimientos = () => {
    return (
      <VencimientosManager 
        vencimientos={vencimientos} 
        setVencimientos={setVencimientos} 
        pacienteId={id} 
        pacienteSpecies={paciente.species} 
        pacienteTutorName={paciente.tutorName} 
        onAlert={setAlert} 
        onAdd={() => !paciente.fallecido && setIsAddVencimientoModalOpen(true)} 
      />
    );
  };

  return (
    <div className="profile-container paciente-profile">
      <CustomAlert message={alert.message} type={alert.type} onClose={handleAlertClose} />
      <ViewClinicalNoteModal isOpen={isViewModalOpen} onClose={handleCloseModals} onEdit={() => handleEditNote(selectedNote)} note={selectedNote} />
      <ClinicalNoteModal isOpen={isEditModalOpen} onClose={handleCloseModals} onSave={handleSaveClinicalNote} note={selectedNote} pacienteId={id} />
      <AddVencimientoModal isOpen={isAddVencimientoModalOpen} onClose={() => setIsAddVencimientoModalOpen(false)} onSave={() => { setIsAddVencimientoModalOpen(false); fetchAllData(); }} pacienteId={id} tutorId={paciente.tutorId} tutorName={paciente.tutorName} pacienteName={paciente.name} />
      <CreateRecipeModal isOpen={isCreateRecipeModalOpen} onClose={handleCloseModals} onSave={handleSaveRecipe} paciente={paciente} />
      <ViewRecipeModal isOpen={!!selectedRecipe} onClose={handleCloseModals} onPrint={handlePrintRecipe} recipe={selectedRecipe} paciente={paciente} />
      <CreateNotaPeluqueriaModal isOpen={isCreateNotaPeluqueriaModalOpen} onClose={handleCloseModals} onSave={handleSaveGroomingNote} pacienteId={id} />
      <ViewNotaPeluqueriaModal isOpen={isViewGroomingNoteModalOpen} onClose={handleCloseModals} onEdit={() => handleEditGroomingNote(selectedGroomingNote)} note={selectedGroomingNote} />
      <EditNotaPeluqueriaModal isOpen={isEditGroomingNoteModalOpen} onClose={handleCloseModals} onSave={handleSaveGroomingNote} note={selectedGroomingNote} pacienteId={id} />

      <div className="profile-header"><div className="profile-avatar">{paciente.species === "Canino" ? <FaDog /> : <FaCat />}</div><div className="profile-info"><h1>{paciente.name}</h1><p>Tutor: <Link to={`/admin/tutor-profile/${paciente.tutorId}`}>{paciente.tutorName}</Link></p></div><div className="profile-actions">{!paciente.fallecido && <button className="btn btn-primary" onClick={handleStartSale}>Vender</button>}<Link to={`/admin/edit-paciente/${id}`} className="btn btn-secondary">Editar Paciente</Link>{!paciente.fallecido && (<button className="btn btn-primary" onClick={handleAddNewNote}>+ Nota Clínica</button>)}</div></div>
      {paciente.fallecido && (<div className="fallecido-banner">Fallecido el {new Date(paciente.fechaFallecimiento).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</div>)}
      <div className="details-bar"><div className="detail-chip"><strong>Especie:</strong> {paciente.species}</div><div className="detail-chip"><strong>Raza:</strong> {paciente.breed}</div><div className="detail-chip"><strong>Sexo:</strong> {paciente.gender}</div><div className="detail-chip"><strong>Edad:</strong> {calculateAge(paciente.birthDate)}</div><div className="detail-chip"><strong>Peso:</strong> {paciente.weight ? `${paciente.weight} kg` : "N/A"}</div><div className="detail-chip"><strong>Chip:</strong> {paciente.chipNumber || "N/A"}</div>
        {(paciente.serviceTypes && paciente.serviceTypes.length > 0) && (
            <div className="service-chips-inline">
                {paciente.serviceTypes.includes('clinical') && <div className="service-chip clinical"><FaStethoscope /><span>Clínica</span></div>}
                {paciente.serviceTypes.includes('grooming') && <div className="service-chip grooming"><PiBathtub /><span>Peluquería</span></div>}
            </div>
        )}
      </div>
      <div className="profile-nav"><button className={activeTab === "historia" ? "active" : ""} onClick={() => setActiveTab("historia")}>Historia Clínica</button><button className={activeTab === "notas_peluqueria" ? "active" : ""} onClick={() => setActiveTab("notas_peluqueria")}>Notas Peluquería</button><button className={activeTab === "recetas" ? "active" : ""} onClick={() => setActiveTab("recetas")}>Recetas</button><button className={activeTab === "citas" ? "active" : ""} onClick={() => setActiveTab("citas")}>Citas</button><button className={activeTab === "vencimientos" ? "active" : ""} onClick={() => setActiveTab("vencimientos")}>Vencimientos</button></div>
      <div className="profile-content">
        {activeTab === "historia" && renderHistoria()}
        {activeTab === "notas_peluqueria" && renderNotasPeluqueria()}
        {activeTab === "recetas" && renderRecetas()}
        {activeTab === "citas" && renderCitas()}
        {activeTab === "vencimientos" && renderVencimientos()}
      </div>
    </div>
  );
};

export default PacienteProfile;

