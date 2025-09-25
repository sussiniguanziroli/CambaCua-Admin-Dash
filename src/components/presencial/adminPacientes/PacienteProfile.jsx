import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { FaDog, FaCat } from 'react-icons/fa';

// --- Helper: Custom Alert ---
const CustomAlert = ({ message, type, onClose }) => {
  if (!message) return null;
  return (
    <div className={`custom-alert ${type === 'error' ? 'alert-error' : 'alert-success'}`}>
      <span>{message}</span>
      <button onClick={onClose}>&times;</button>
    </div>
  );
};

// --- Clinical Note Modal ---
const ClinicalNoteModal = ({ isOpen, onClose, onSave, note, noteIndex }) => {
  const [noteData, setNoteData] = useState({ reason: '', diagnosis: '', treatment: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (note) {
      setNoteData({ reason: note.reason || '', diagnosis: note.diagnosis || '', treatment: note.treatment || '' });
    } else {
      setNoteData({ reason: '', diagnosis: '', treatment: '' });
    }
  }, [note, isOpen]);

  const handleChange = (e) => setNoteData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(noteData, note, noteIndex);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="agenda-modal-overlay">
      <div className="agenda-modal-content">
        <div className="modal-header">
          <h3>{note ? 'Editar Nota Clínica' : 'Agregar Nota a Historia Clínica'}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Motivo de la Consulta</label>
            <input type="text" name="reason" value={noteData.reason} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Diagnóstico</label>
            <textarea name="diagnosis" value={noteData.diagnosis} onChange={handleChange}></textarea>
          </div>
          <div className="form-group">
            <label>Tratamiento</label>
            <textarea name="treatment" value={noteData.treatment} onChange={handleChange}></textarea>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Nota'}</button>
          </div>
        </form>
      </div>
    </div>
  );
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
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [historyFilters, setHistoryFilters] = useState({ searchTerm: '', sortOrder: 'newest' });

  const handleAlertClose = () => setAlert({ message: '', type: '' });

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const pacienteRef = doc(db, 'pacientes', id);
      const pacienteSnap = await getDoc(pacienteRef);

      if (!pacienteSnap.exists()) {
        setAlert({ message: 'Paciente no encontrado.', type: 'error' });
        setTimeout(() => navigate('/admin/pacientes'), 1500);
        return;
      }

      const pacienteData = { id: pacienteSnap.id, ...pacienteSnap.data() };
      setPaciente(pacienteData);

      // Citas
      const citasQuery = query(collection(db, 'citas'), where('pacienteId', '==', id), orderBy('startTime', 'desc'));
      const citasSnap = await getDocs(citasQuery);
      const citasList = citasSnap.docs.map(d => {
        const data = d.data();
        const startTime = data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime || Date.now());
        return { id: d.id, ...data, startTime };
      });
      setCitas(citasList);

      // Vencimientos
      const vencQuery = query(collection(db, `pacientes/${id}/vencimientos`), orderBy('dueDate', 'asc'));
      const vencSnap = await getDocs(vencQuery);
      const vencList = vencSnap.docs.map(d => {
        const data = d.data();
        const dueDate = data.dueDate?.toDate ? data.dueDate.toDate() : (data.dueDate ? new Date(data.dueDate) : null);
        return { id: d.id, ...data, dueDate };
      });
      setVencimientos(vencList);

    } catch (err) {
      console.error(err);
      setAlert({ message: 'No se pudieron cargar los datos del paciente.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const handleSaveClinicalNote = async (noteData, originalNote, noteIndex) => {
    try {
      const pacienteRef = doc(db, 'pacientes', id);
      const history = paciente?.clinicalHistory || [];

      if (originalNote && typeof noteIndex === 'number' && noteIndex >= 0) {
        const updatedHistory = history.map((note, idx) => idx === noteIndex ? { ...note, ...noteData } : note);
        await updateDoc(pacienteRef, { clinicalHistory: updatedHistory });
        setAlert({ message: 'Nota clínica actualizada.', type: 'success' });
      } else {
        const newEntry = {
          ...noteData,
          date: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        };
        await updateDoc(pacienteRef, { clinicalHistory: arrayUnion(newEntry) });
        setAlert({ message: 'Nota agregada a la historia clínica.', type: 'success' });
      }

      setIsNoteModalOpen(false);
      setEditingNote(null);
      await fetchAllData();
    } catch (error) {
      console.error(error);
      setAlert({ message: 'No se pudo guardar la nota.', type: 'error' });
    }
  };

  const handleEditNoteClick = (note, indexInOriginal) => {
    setEditingNote({ note, index: indexInOriginal });
    setIsNoteModalOpen(true);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setHistoryFilters(prev => ({ ...prev, [name]: value }));
  };

  const filteredAndSortedHistory = useMemo(() => {
    const rawHistory = [...(paciente?.clinicalHistory || [])];
    const term = (historyFilters.searchTerm || '').toLowerCase();

    let list = rawHistory;
    if (term) {
      list = list.filter(entry => (
        (entry.reason || '').toLowerCase().includes(term) ||
        (entry.diagnosis || '').toLowerCase().includes(term) ||
        (entry.treatment || '').toLowerCase().includes(term)
      ));
    }

    list.sort((a, b) => {
      const dateA = a?.date ? new Date(a.date.split('/').reverse().join('-')) : new Date(0);
      const dateB = b?.date ? new Date(b.date.split('/').reverse().join('-')) : new Date(0);
      return historyFilters.sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return list;
  }, [paciente?.clinicalHistory, historyFilters]);

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'N/A';
    let bd;
    try { bd = birthDate?.toDate ? birthDate.toDate() : new Date(birthDate); } 
    catch { return 'N/A'; }
    if (!bd || isNaN(bd.getTime())) return 'N/A';
    const now = new Date();
    let years = now.getFullYear() - bd.getFullYear();
    let months = now.getMonth() - bd.getMonth();
    if (now.getDate() < bd.getDate()) months--;
    if (months < 0) { years--; months += 12; }
    if (years < 0) return 'N/A';
    return years === 0 ? `${months} meses` : `${years} año${years > 1 ? 's' : ''}${months ? `, ${months} meses` : ''}`;
  };

  const toggleSupplied = async (v) => {
    try {
      const vencRef = doc(db, `pacientes/${id}/vencimientos`, v.id);
      await updateDoc(vencRef, { supplied: !v.supplied });
      fetchAllData();
    } catch (error) {
      console.error(error);
      setAlert({ message: 'No se pudo actualizar el vencimiento.', type: 'error' });
    }
  };

  if (isLoading) return <p className="loading-message">Cargando perfil del paciente...</p>;
  if (!paciente) return <p className="error-message">No se encontró el paciente.</p>;

  const renderHistoria = () => (
    <div className="tab-content">
      <div className="history-controls">
        <input type="text" name="searchTerm" placeholder="Buscar en historia..." value={historyFilters.searchTerm} onChange={handleFilterChange} />
        <select name="sortOrder" value={historyFilters.sortOrder} onChange={handleFilterChange}>
          <option value="newest">Más Recientes</option>
          <option value="oldest">Más Antiguos</option>
        </select>
      </div>

      {filteredAndSortedHistory.length > 0 ? (
        <div className="clinical-history-list">
          {filteredAndSortedHistory.map((entry, idx) => {
            const originalIndex = (paciente.clinicalHistory || []).findIndex(n => n.date === entry.date && n.reason === entry.reason && n.diagnosis === entry.diagnosis);
            return (
              <div key={`${entry.date}-${idx}`} className="clinical-entry-card">
                <div className="entry-header">
                  <div className="header-info">
                    <span className="entry-date">{entry.date}</span>
                    <strong className="entry-reason">{entry.reason}</strong>
                  </div>
                  <button className="btn btn-edit-note" onClick={() => handleEditNoteClick(entry, originalIndex)}>Editar</button>
                </div>
                <div className="entry-body">
                  <p><strong>Diagnóstico:</strong> {entry.diagnosis || 'N/A'}</p>
                  <p><strong>Tratamiento:</strong> {entry.treatment || 'N/A'}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : <p className="no-results-message">No hay entradas en la historia clínica que coincidan con la búsqueda.</p>}
    </div>
  );

  const renderCitas = () => (
    <div className="tab-content">
      {citas.length > 0 ? (
        citas.map(cita => (
          <div key={cita.id} className="cita-card">
            <p><strong>Fecha:</strong> {cita.startTime.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</p>
            <p><strong>Servicios:</strong> {(cita.services || []).map(s => s.name || s.nombre).join(', ') || 'Consulta General'}</p>
            <p><strong>Notas:</strong> {cita.notes || 'Sin notas.'}</p>
          </div>
        ))
      ) : <p className="no-results-message">No hay citas registradas para este paciente.</p>}
    </div>
  );

  const renderVencimientos = () => {
    const today = new Date();
    return (
      <div className="tab-content">
        {vencimientos && vencimientos.length > 0 ? (
          <div className="vencimientos-list">
            {vencimientos.map(v => {
              const isOverdue = v.dueDate && v.dueDate < today;
              const daysDiff = v.dueDate ? Math.ceil((v.dueDate - today) / (1000 * 60 * 60 * 24)) : null;
              const isSoon = daysDiff !== null && !isOverdue && daysDiff <= 7;

              let status = 'pending';
              if (v.supplied) status = 'supplied';
              else if (isOverdue) status = 'overdue';
              else if (isSoon) status = 'soon';

              return (
                <div key={v.id} className={`vencimiento-card ${status}`}>
                  <div className="vencimiento-info">
                    <span className="vencimiento-product">
                      {paciente.species === 'Canino' ? <FaDog /> : paciente.species === 'Felino' ? <FaCat /> : null}
                      {v.productName || 'Producto'}
                      <span className={`badge ${status}`} style={{ marginLeft: '0.5rem' }}>
                        {status === 'supplied' ? 'Suministrado' : status === 'overdue' ? 'Vencido' : status === 'soon' ? 'Próximo' : 'Pendiente'}
                      </span>
                    </span>
                    <span className="vencimiento-tutor">Tutor: {v.tutorName || paciente.tutorName}</span>
                  </div>
                  <div className="vencimiento-date">
                    <span>Vence el:</span>
                    <strong>{v.dueDate ? v.dueDate.toLocaleDateString('es-AR') : '—'}</strong>
                    {!v.supplied && (
                      <button className="btn btn-primary btn-suministrado" onClick={() => toggleSupplied(v)}>Marcar suministrado</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="no-results-message">No hay vencimientos programados.</p>}
      </div>
    );
  };

  return (
    <div className="profile-container paciente-profile">
      <CustomAlert message={alert.message} type={alert.type} onClose={handleAlertClose} />

      <ClinicalNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => { setIsNoteModalOpen(false); setEditingNote(null); }}
        onSave={handleSaveClinicalNote}
        note={editingNote?.note}
        noteIndex={editingNote?.index}
      />

      <div className="profile-header">
        <div className="profile-avatar">{paciente.species === 'Canino' ? <FaDog /> : paciente.species === 'Felino' ? <FaCat /> : null}</div>
        <div className="profile-info">
          <h1>{paciente.name || 'Paciente'}</h1>
          <p>Tutor: <Link to={`/admin/tutor-profile/${paciente.tutorId}`}>{paciente.tutorName || 'N/A'}</Link></p>
        </div>
        <div className="profile-actions">
          <Link to={`/admin/edit-paciente/${paciente.id}`} className="btn btn-secondary">Editar Paciente</Link>
          <button className="btn btn-primary" onClick={() => { setEditingNote(null); setIsNoteModalOpen(true); }}>+ Agregar Nota Clínica</button>
        </div>
      </div>

      <div className="details-bar">
        <div className="detail-chip"><strong>Especie:</strong> {paciente.species || 'N/A'}</div>
        <div className="detail-chip"><strong>Raza:</strong> {paciente.breed || 'N/A'}</div>
        <div className="detail-chip"><strong>Sexo:</strong> {paciente.gender || 'N/A'}</div>
        <div className="detail-chip"><strong>Edad:</strong> {calculateAge(paciente.birthDate)}</div>
        <div className="detail-chip"><strong>Peso:</strong> {paciente.weight ? `${paciente.weight} kg` : 'N/A'}</div>
        <div className="detail-chip"><strong>Chip:</strong> {paciente.chipNumber || 'N/A'}</div>
      </div>

      <div className="profile-nav">
        <button className={activeTab === 'historia' ? 'active' : ''} onClick={() => setActiveTab('historia')}>Historia Clínica</button>
        <button className={activeTab === 'citas' ? 'active' : ''} onClick={() => setActiveTab('citas')}>Citas ({citas.length})</button>
        <button className={activeTab === 'vencimientos' ? 'active' : ''} onClick={() => setActiveTab('vencimientos')}>Vencimientos ({vencimientos ? vencimientos.length : 0})</button>
      </div>

      <div className="profile-content">
        {activeTab === 'historia' && renderHistoria()}
        {activeTab === 'citas' && renderCitas()}
        {activeTab === 'vencimientos' && renderVencimientos()}
      </div>
    </div>
  );
};

export default PacienteProfile;
