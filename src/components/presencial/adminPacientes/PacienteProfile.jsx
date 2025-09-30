import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, getDocs, orderBy, updateDoc, addDoc, Timestamp, deleteDoc, where } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { FaDog, FaCat, FaTrash } from 'react-icons/fa';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import VencimientosManager from './VencimientosManager';
import AddVencimientoModal from './AddVencimientoModal';
import ClinicalNoteModal from './ClinicalNoteModal';
import ViewClinicalNoteModal from './ViewClinicalNoteModal';
import CreateRecipeModal from './CreateRecipeModal';
import ViewRecipeModal from './ViewRecipeModal';
import LoaderSpinner from '../../utils/LoaderSpinner';

const CustomAlert = ({ message, type, onClose }) => {
  if (!message) return null;
  return (
    <div className={`custom-alert ${type === 'error' ? 'alert-error' : 'alert-success'}`}>
      <span>{message}</span>
      <button onClick={onClose}>&times;</button>
    </div>
  );
};

const PacienteProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState(null);
  const [citas, setCitas] = useState([]);
  const [vencimientos, setVencimientos] = useState([]);
  const [clinicalHistory, setClinicalHistory] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('historia');
  const [alert, setAlert] = useState({ message: '', type: '' });

  const [historyFilters, setHistoryFilters] = useState({ searchTerm: '', startDate: '', endDate: '', sortOrder: 'date-desc' });
  const [recipeFilters, setRecipeFilters] = useState({ searchTerm: '', startDate: '', endDate: '', sortOrder: 'date-desc' });

  const [isAddVencimientoModalOpen, setIsAddVencimientoModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateRecipeModalOpen, setIsCreateRecipeModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const handleAlertClose = () => setAlert({ message: '', type: '' });
  const handleCloseModals = () => {
    setIsViewModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedNote(null);
    setIsCreateRecipeModalOpen(false);
    setSelectedRecipe(null);
  };

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const pacienteRef = doc(db, 'pacientes', id);
      const historyQuery = query(collection(db, `pacientes/${id}/clinical_history`), orderBy('createdAt', 'desc'));
      const recipesQuery = query(collection(db, `pacientes/${id}/clinical_recipes`), orderBy('createdAt', 'desc'));
      const citasQuery = query(collection(db, 'citas'), where('pacienteId', '==', id), orderBy('startTime', 'desc'));
      const vencQuery = query(collection(db, `pacientes/${id}/vencimientos`), orderBy('dueDate', 'asc'));

      const [pacienteSnap, historySnap, recipesSnap, citasSnap, vencSnap] = await Promise.all([
        getDoc(pacienteRef),
        getDocs(historyQuery),
        getDocs(recipesQuery),
        getDocs(citasQuery),
        getDocs(vencQuery),
      ]);

      if (!pacienteSnap.exists()) {
        setPaciente(null);
        setAlert({ message: 'Paciente no encontrado.', type: 'error' });
        return;
      }

      setPaciente({ id: pacienteSnap.id, ...pacienteSnap.data() });
      setClinicalHistory(
        historySnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          date: d.data().createdAt.toDate().toLocaleDateString('es-AR'),
        }))
      );
      setRecipes(recipesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setCitas(citasSnap.docs.map((d) => ({ id: d.id, ...d.data(), startTime: d.data().startTime?.toDate() })));
      setVencimientos(
        vencSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          dueDate: d.data().dueDate?.toDate(),
          suppliedDate: d.data().suppliedDate?.toDate(),
        }))
      );
    } catch (err) {
      console.error('Error fetching patient data:', err);
      setAlert({ message: 'No se pudieron cargar los datos del paciente.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleSaveClinicalNote = async (formData, originalNote) => {
    try {
      if (originalNote) {
        await updateDoc(doc(db, `pacientes/${id}/clinical_history`, originalNote.id), formData);
        setAlert({ message: 'Nota clínica actualizada.', type: 'success' });
      } else {
        await addDoc(collection(db, `pacientes/${id}/clinical_history`), {
          ...formData,
          createdAt: Timestamp.now(),
        });
        setAlert({ message: 'Nota agregada.', type: 'success' });
      }
      handleCloseModals();
      await fetchAllData();
    } catch (error) {
      setAlert({ message: 'No se pudo guardar la nota.', type: 'error' });
    }
  };

  const handleSaveRecipe = async (recipeData) => {
    try {
      await addDoc(collection(db, `pacientes/${id}/clinical_recipes`), {
        ...recipeData,
        createdAt: Timestamp.now(),
      });
      setAlert({ message: 'Receta guardada.', type: 'success' });
      handleCloseModals();
      await fetchAllData();
    } catch (error) {
      setAlert({ message: 'No se pudo guardar la receta.', type: 'error' });
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Eliminar Receta?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, `pacientes/${id}/clinical_recipes`, recipeId));
        setAlert({ message: 'Receta eliminada.', type: 'success' });
        await fetchAllData();
      } catch (error) {
        setAlert({ message: 'No se pudo eliminar la receta.', type: 'error' });
      }
    }
  };

  const handlePrintRecipe = async (elementId) => {
    const input = document.getElementById(elementId);
    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`receta_${paciente.name}_${new Date().toLocaleDateString('es-AR')}.pdf`);
  };

  const handleViewNote = (note) => {
    setSelectedNote(note);
    setIsViewModalOpen(true);
  };
  const handleEditNote = (note) => {
    setSelectedNote(note);
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };
  const handleAddNewNote = () => {
    setSelectedNote(null);
    setIsEditModalOpen(true);
  };

  const handleHistoryFilterChange = (e) => {
    const { name, value } = e.target;
    setHistoryFilters((prev) => ({ ...prev, [name]: value }));
  };
  const handleRecipeFilterChange = (e) => {
    const { name, value } = e.target;
    setRecipeFilters((prev) => ({ ...prev, [name]: value }));
  };

  const filteredAndSortedHistory = useMemo(() => {
    let filtered = [...clinicalHistory];
    if (historyFilters.startDate) {
      const start = new Date(historyFilters.startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((e) => e.createdAt.toDate() >= start);
    }
    if (historyFilters.endDate) {
      const end = new Date(historyFilters.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((e) => e.createdAt.toDate() <= end);
    }
    if (historyFilters.searchTerm) {
      const term = historyFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          (e.reason || '').toLowerCase().includes(term) ||
          (e.diagnosis || '').toLowerCase().includes(term) ||
          (e.treatment || '').toLowerCase().includes(term)
      );
    }
    filtered.sort((a, b) => {
      if (historyFilters.sortOrder === 'date-desc') return b.createdAt.toMillis() - a.createdAt.toMillis();
      return a.createdAt.toMillis() - b.createdAt.toMillis();
    });
    return filtered;
  }, [clinicalHistory, historyFilters]);

  const filteredAndSortedRecipes = useMemo(() => {
    let filtered = [...recipes];
    if (recipeFilters.startDate) {
      const start = new Date(recipeFilters.startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((r) => r.createdAt.toDate() >= start);
    }
    if (recipeFilters.endDate) {
      const end = new Date(recipeFilters.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => r.createdAt.toDate() <= end);
    }
    if (recipeFilters.searchTerm) {
      const term = recipeFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.prescribedBy || '').toLowerCase().includes(term) ||
          (r.prescriptions || []).some((p) => (p.productName || '').toLowerCase().includes(term))
      );
    }
    filtered.sort((a, b) => {
      if (recipeFilters.sortOrder === 'date-desc') return b.createdAt.toMillis() - a.createdAt.toMillis();
      return a.createdAt.toMillis() - b.createdAt.toMillis();
    });
    return filtered;
  }, [recipes, recipeFilters]);

  const calculateAge = (birthDateStr) => {
    if (!birthDateStr) return 'N/A';
    const bd = new Date(birthDateStr);
    if (isNaN(bd.getTime())) return 'N/A';
    const now = new Date();
    let years = now.getFullYear() - bd.getFullYear();
    let months = now.getMonth() - bd.getMonth();
    if (now.getDate() < bd.getDate()) months--;
    if (months < 0) {
      years--;
      months += 12;
    }
    if (years < 0) return 'N/A';
    return years === 0 ? `${months} meses` : `${years} año${years > 1 ? 's' : ''}${months ? `, ${months} meses` : ''}`;
  };

  const handleStartSale = () => {
    navigate('/admin/vender', { state: { tutor: { id: paciente.tutorId, name: paciente.tutorName }, patient: { id: paciente.id, name: paciente.name } } });
  };

  if (isLoading)
    return (
      <div className="loading-message">
        <LoaderSpinner />
        <p>Cargando perfil del paciente...</p>
      </div>
    );

  if (!paciente)
    return (
      <div className="error-message-container">
        <p className="error-message">No se encontró el paciente.</p>
        <button onClick={() => navigate('/admin/pacientes')} className="btn btn-primary">
          Volver
        </button>
      </div>
    );

  const renderHistoria = () => (
    <div className="tab-content">
      <div className="history-controls">
        <input type="text" name="searchTerm" placeholder="Buscar en historia..." value={historyFilters.searchTerm} onChange={handleHistoryFilterChange} />
        <input type="date" name="startDate" value={historyFilters.startDate} onChange={handleHistoryFilterChange} />
        <input type="date" name="endDate" value={historyFilters.endDate} onChange={handleHistoryFilterChange} />
        <select name="sortOrder" value={historyFilters.sortOrder} onChange={handleHistoryFilterChange}>
          <option value="date-desc">Más Recientes</option>
          <option value="date-asc">Más Antiguas</option>
        </select>
      </div>
      {filteredAndSortedHistory.length > 0 ? (
        <div className="clinical-history-list">
          {filteredAndSortedHistory.map((entry) => (
            <div key={entry.id} className="clinical-entry-card" onClick={() => handleViewNote(entry)}>
              <div className="entry-header">
                <div className="header-info">
                  <span className="entry-date">{entry.date}</span>
                  <strong className="entry-reason">{entry.reason}</strong>
                </div>
              </div>
              <div className="entry-body">
                <p>
                  <strong>Diagnóstico:</strong> {entry.diagnosis || 'N/A'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-results-message">No hay entradas.</p>
      )}
    </div>
  );

  const renderCitas = () => (
    <div className="tab-content">
      {citas.length > 0 ? (
        citas.map((cita) => (
          <div key={cita.id} className="cita-card">
            <p>
              <strong>Fecha:</strong> {cita.startTime.toLocaleString('es-AR')}
            </p>
            <p>
              <strong>Servicios:</strong> {(cita.services || []).map((s) => s.name || s.nombre).join(', ')}
            </p>
          </div>
        ))
      ) : (
        <p className="no-results-message">No hay citas.</p>
      )}
    </div>
  );

  const renderRecetas = () => (
    <div className="tab-content">
      <div className="recipe-controls">
        <button className="btn btn-primary" onClick={() => setIsCreateRecipeModalOpen(true)}>
          + Nueva Receta
        </button>
        <div className="filters-group">
          <input type="text" name="searchTerm" placeholder="Buscar por doctor o producto..." value={recipeFilters.searchTerm} onChange={handleRecipeFilterChange} />
          <input type="date" name="startDate" value={recipeFilters.startDate} onChange={handleRecipeFilterChange} />
          <input type="date" name="endDate" value={recipeFilters.endDate} onChange={handleRecipeFilterChange} />
          <select name="sortOrder" value={recipeFilters.sortOrder} onChange={handleRecipeFilterChange}>
            <option value="date-desc">Más Recientes</option>

            <option value="date-asc">Más Antiguas</option>
          </select>
        </div>
      </div>
      <div className="recipe-list">
        {filteredAndSortedRecipes.length > 0 ? (
          filteredAndSortedRecipes.map((recipe) => (
            <div key={recipe.id} className="recipe-list-item">
              <span>
                Receta del{" "}
                {recipe.createdAt.toDate().toLocaleDateString("es-AR")}
              </span>
              <div className="recipe-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  Ver/Imprimir
                </button>
                <button
                  className="btn btn-delete-small"
                  onClick={() => handleDeleteRecipe(recipe.id)}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="no-results-message">No hay recetas.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="profile-container paciente-profile">
      <CustomAlert
        message={alert.message}
        type={alert.type}
        onClose={handleAlertClose}
      />
      <ViewClinicalNoteModal
        isOpen={isViewModalOpen}
        onClose={handleCloseModals}
        onEdit={() => handleEditNote(selectedNote)}
        note={selectedNote}
      />
      <ClinicalNoteModal
        isOpen={isEditModalOpen}
        onClose={handleCloseModals}
        onSave={handleSaveClinicalNote}
        note={selectedNote}
        pacienteId={id}
      />
      <AddVencimientoModal
        isOpen={isAddVencimientoModalOpen}
        onClose={() => setIsAddVencimientoModalOpen(false)}
        onSave={() => {
          setIsAddVencimientoModalOpen(false);
          fetchAllData();
        }}
        pacienteId={id}
        tutorId={paciente.tutorId}
        tutorName={paciente.tutorName}
        pacienteName={paciente.name}
      />
      <CreateRecipeModal
        isOpen={isCreateRecipeModalOpen}
        onClose={handleCloseModals}
        onSave={handleSaveRecipe}
        paciente={paciente}
      />
      <ViewRecipeModal
        isOpen={!!selectedRecipe}
        onClose={handleCloseModals}
        onPrint={handlePrintRecipe}
        recipe={selectedRecipe}
        paciente={paciente}
      />

      <div className="profile-header">
        <div className="profile-avatar">
          {paciente.species === "Canino" ? <FaDog /> : <FaCat />}
        </div>
        <div className="profile-info">
          <h1>{paciente.name}</h1>
          <p>
            Tutor:{" "}
            <Link to={`/admin/tutores/${paciente.tutorId}`}>
              {paciente.tutorName}
            </Link>
          </p>
        </div>
        <div className="profile-actions">
          <button className="btn btn-primary" onClick={handleStartSale}>Vender</button>
          <Link to={`/admin/edit-paciente/${id}`} className="btn btn-secondary">
            Editar Paciente
          </Link>
          <button className="btn btn-primary" onClick={handleAddNewNote}>
            + Nota Clínica
          </button>
        </div>
      </div>
      <div className="details-bar">
        <div className="detail-chip">
          <strong>Especie:</strong> {paciente.species}
        </div>
        <div className="detail-chip">
          <strong>Raza:</strong> {paciente.breed}
        </div>
        <div className="detail-chip">
          <strong>Sexo:</strong> {paciente.gender}
        </div>
        <div className="detail-chip">
          <strong>Edad:</strong> {calculateAge(paciente.birthDate)}
        </div>
        <div className="detail-chip">
          <strong>Peso:</strong>{" "}
          {paciente.weight ? `${paciente.weight} kg` : "N/A"}
        </div>
        <div className="detail-chip">
          <strong>Chip:</strong> {paciente.chipNumber || "N/A"}
        </div>
      </div>
      <div className="profile-nav">
        <button
          className={activeTab === "historia" ? "active" : ""}
          onClick={() => setActiveTab("historia")}
        >
          Historia Clínica
        </button>
        <button
          className={activeTab === "recetas" ? "active" : ""}
          onClick={() => setActiveTab("recetas")}
        >
          Recetas
        </button>
        <button
          className={activeTab === "citas" ? "active" : ""}
          onClick={() => setActiveTab("citas")}
        >
          Citas
        </button>
        <button
          className={activeTab === "vencimientos" ? "active" : ""}
          onClick={() => setActiveTab("vencimientos")}
        >
          Vencimientos
        </button>
      </div>
      <div className="profile-content">
        {activeTab === "historia" && renderHistoria()}
        {activeTab === "recetas" && renderRecetas()}
        {activeTab === "citas" && renderCitas()}
        {activeTab === "vencimientos" && (
          <VencimientosManager
            vencimientos={vencimientos}
            setVencimientos={setVencimientos}
            pacienteId={id}
            pacienteSpecies={paciente.species}
            pacienteTutorName={paciente.tutorName}
            onAlert={setAlert}
            onAdd={() => setIsAddVencimientoModalOpen(true)}
          />
        )}
      </div>
    </div>
  );
};

export default PacienteProfile;
