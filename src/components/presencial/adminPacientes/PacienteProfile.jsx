import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { FaDog, FaCat } from 'react-icons/fa';
import VencimientosManager from './VencimientosManager';
import AddVencimientoModal from './AddVencimientoModal';
import ClinicalNoteModal from './ClinicalNoteModal';
import ViewClinicalNoteModal from './ViewClinicalNoteModal';

const CustomAlert = ({ message, type, onClose }) => {
  if (!message) return null;
  return (<div className={`custom-alert ${type === 'error' ? 'alert-error' : 'alert-success'}`}><span>{message}</span><button onClick={onClose}>&times;</button></div>);
};

const PacienteProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState(null);
  const [citas, setCitas] = useState([]);
  const [vencimientos, setVencimientos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('historia');
  const [alert, setAlert] = useState({ message: '', type: '' });
  const [historyFilters, setHistoryFilters] = useState({ searchTerm: '', sortOrder: 'newest' });
  const [isAddVencimientoModalOpen, setIsAddVencimientoModalOpen] = useState(false);

  const [selectedNote, setSelectedNote] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleAlertClose = () => setAlert({ message: '', type: '' });
  const handleCloseModals = () => { setIsViewModalOpen(false); setIsEditModalOpen(false); setSelectedNote(null); };

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const pacienteRef = doc(db, 'pacientes', id);
      const pacienteSnap = await getDoc(pacienteRef);
      if (!pacienteSnap.exists()) { setAlert({ message: 'Paciente no encontrado.', type: 'error' }); setTimeout(() => navigate('/admin/pacientes'), 1500); return; }
      const pacienteData = { id: pacienteSnap.id, ...pacienteSnap.data() };
      setPaciente(pacienteData);

      const citasQuery = query(collection(db, 'citas'), where('pacienteId', '==', id), orderBy('startTime', 'desc'));
      const citasSnap = await getDocs(citasQuery);
      setCitas(citasSnap.docs.map(d => ({ id: d.id, ...d.data(), startTime: d.data().startTime?.toDate() })));

      const vencQuery = query(collection(db, `pacientes/${id}/vencimientos`), orderBy('dueDate', 'asc'));
      const vencSnap = await getDocs(vencQuery);
      setVencimientos(vencSnap.docs.map(d => ({ id: d.id, ...d.data(), dueDate: d.data().dueDate?.toDate(), suppliedDate: d.data().suppliedDate?.toDate() })));
    } catch (err) { setAlert({ message: 'No se pudieron cargar los datos del paciente.', type: 'error' }); } 
    finally { setIsLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const handleSaveClinicalNote = async (formData, originalNote, noteIndex) => {
    try {
      const pacienteRef = doc(db, 'pacientes', id);
      const history = paciente?.clinicalHistory || [];
      if (originalNote && typeof noteIndex === 'number' && noteIndex >= 0) {
        const updatedHistory = [...history];
        updatedHistory[noteIndex] = { ...updatedHistory[noteIndex], ...formData };
        await updateDoc(pacienteRef, { clinicalHistory: updatedHistory });
        setAlert({ message: 'Nota clínica actualizada.', type: 'success' });
      } else {
        const newEntry = { ...formData, date: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) };
        await updateDoc(pacienteRef, { clinicalHistory: arrayUnion(newEntry) });
        setAlert({ message: 'Nota agregada a la historia clínica.', type: 'success' });
      }
      handleCloseModals();
      await fetchAllData();
    } catch (error) { setAlert({ message: 'No se pudo guardar la nota.', type: 'error' }); }
  };
  
  const handleViewNote = (note, index) => { setSelectedNote({ ...note, originalIndex: index }); setIsViewModalOpen(true); };
  const handleEditNote = (note) => { setSelectedNote(note); setIsViewModalOpen(false); setIsEditModalOpen(true); };
  const handleAddNewNote = () => { setSelectedNote(null); setIsEditModalOpen(true); };

  const handleFilterChange = (e) => { const { name, value } = e.target; setHistoryFilters(prev => ({ ...prev, [name]: value })); };

  const filteredAndSortedHistory = useMemo(() => {
    const rawHistory = [...(paciente?.clinicalHistory || [])];
    const term = (historyFilters.searchTerm || '').toLowerCase();
    let list = term ? rawHistory.filter(e => ((e.reason || '').toLowerCase().includes(term) || (e.diagnosis || '').toLowerCase().includes(term) || (e.treatment || '').toLowerCase().includes(term))) : rawHistory;
    list.sort((a, b) => { const dateA = a?.date ? new Date(a.date.split('/').reverse().join('-')) : new Date(0); const dateB = b?.date ? new Date(b.date.split('/').reverse().join('-')) : new Date(0); return historyFilters.sortOrder === 'newest' ? dateB - dateA : dateA - dateB; });
    return list;
  }, [paciente?.clinicalHistory, historyFilters]);

  const calculateAge = (birthDateStr) => {
    if (!birthDateStr) return 'N/A'; const bd = new Date(birthDateStr); if (isNaN(bd.getTime())) return 'N/A'; const now = new Date();
    let years = now.getFullYear() - bd.getFullYear(); let months = now.getMonth() - bd.getMonth(); if (now.getDate() < bd.getDate()) months--;
    if (months < 0) { years--; months += 12; } if (years < 0) return 'N/A';
    return years === 0 ? `${months} meses` : `${years} año${years > 1 ? 's' : ''}${months ? `, ${months} meses` : ''}`;
  };

  if (isLoading) return <p className="loading-message">Cargando perfil del paciente...</p>;
  if (!paciente) return <p className="error-message">No se encontró el paciente.</p>;

  const renderHistoria = () => (<div className="tab-content"><div className="history-controls"><input type="text" name="searchTerm" placeholder="Buscar en historia..." value={historyFilters.searchTerm} onChange={handleFilterChange} /><select name="sortOrder" value={historyFilters.sortOrder} onChange={handleFilterChange}><option value="newest">Más Recientes</option><option value="oldest">Más Antiguos</option></select></div>{filteredAndSortedHistory.length > 0 ? (<div className="clinical-history-list">{filteredAndSortedHistory.map((entry, idx) => (<div key={`${entry.date}-${idx}`} className="clinical-entry-card" onClick={() => handleViewNote(entry, idx)}><div className="entry-header"><div className="header-info"><span className="entry-date">{entry.date}</span><strong className="entry-reason">{entry.reason}</strong></div></div><div className="entry-body"><p><strong>Diagnóstico:</strong> {entry.diagnosis || 'N/A'}</p></div></div>))}</div>) : <p className="no-results-message">No hay entradas en la historia clínica.</p>}</div>);
  const renderCitas = () => (<div className="tab-content">{citas.length > 0 ? (citas.map(cita => (<div key={cita.id} className="cita-card"><p><strong>Fecha:</strong> {cita.startTime.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</p><p><strong>Servicios:</strong> {(cita.services || []).map(s => s.name || s.nombre).join(', ') || 'Consulta General'}</p><p><strong>Notas:</strong> {cita.notes || 'Sin notas.'}</p></div>))) : <p className="no-results-message">No hay citas registradas.</p>}</div>);

  return (
    <div className="profile-container paciente-profile">
      <CustomAlert message={alert.message} type={alert.type} onClose={handleAlertClose} />
      <ViewClinicalNoteModal isOpen={isViewModalOpen} onClose={handleCloseModals} onEdit={() => handleEditNote(selectedNote)} note={selectedNote} />
      <ClinicalNoteModal isOpen={isEditModalOpen} onClose={handleCloseModals} onSave={handleSaveClinicalNote} note={selectedNote} noteIndex={selectedNote?.originalIndex} pacienteId={id} />
      <AddVencimientoModal isOpen={isAddVencimientoModalOpen} onClose={() => setIsAddVencimientoModalOpen(false)} onSave={() => { setIsAddVencimientoModalOpen(false); fetchAllData(); }} pacienteId={id} tutorId={paciente.tutorId} tutorName={paciente.tutorName} pacienteName={paciente.name} />
      <div className="profile-header"><div className="profile-avatar">{paciente.species === 'Canino' ? <FaDog /> : paciente.species === 'Felino' ? <FaCat /> : null}</div><div className="profile-info"><h1>{paciente.name || 'Paciente'}</h1><p>Tutor: <Link to={`/admin/tutor-profile/${paciente.tutorId}`}>{paciente.tutorName || 'N/A'}</Link></p></div><div className="profile-actions"><Link to={`/admin/edit-paciente/${paciente.id}`} className="btn btn-secondary">Editar Paciente</Link><button className="btn btn-primary" onClick={handleAddNewNote}>+ Agregar Nota Clínica</button></div></div>
      <div className="details-bar"><div className="detail-chip"><strong>Especie:</strong> {paciente.species || 'N/A'}</div><div className="detail-chip"><strong>Raza:</strong> {paciente.breed || 'N/A'}</div><div className="detail-chip"><strong>Sexo:</strong> {paciente.gender || 'N/A'}</div><div className="detail-chip"><strong>Edad:</strong> {calculateAge(paciente.birthDate)}</div><div className="detail-chip"><strong>Peso:</strong> {paciente.weight ? `${paciente.weight} kg` : 'N/A'}</div><div className="detail-chip"><strong>Chip:</strong> {paciente.chipNumber || 'N/A'}</div></div>
      <div className="profile-nav"><button className={activeTab === 'historia' ? 'active' : ''} onClick={() => setActiveTab('historia')}>Historia Clínica</button><button className={activeTab === 'citas' ? 'active' : ''} onClick={() => setActiveTab('citas')}>Citas ({citas.length})</button><button className={activeTab === 'vencimientos' ? 'active' : ''} onClick={() => setActiveTab('vencimientos')}>Vencimientos ({vencimientos.length})</button></div>
      <div className="profile-content">
        {activeTab === 'historia' && renderHistoria()}
        {activeTab === 'citas' && renderCitas()}
        {activeTab === 'vencimientos' && (<VencimientosManager vencimientos={vencimientos} setVencimientos={setVencimientos} pacienteId={id} pacienteSpecies={paciente.species} pacienteTutorName={paciente.tutorName} onAlert={setAlert} onAdd={() => setIsAddVencimientoModalOpen(true)} />)}
      </div>
    </div>
  );
};

export default PacienteProfile;