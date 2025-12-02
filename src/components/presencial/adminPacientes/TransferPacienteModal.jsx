import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, writeBatch, doc, arrayRemove, arrayUnion, query, where } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';

const TransferPacienteModal = ({ isOpen, onClose, paciente, onTransferComplete }) => {
  const [tutores, setTutores] = useState([]);
  const [filteredTutores, setFilteredTutores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchTutores();
      setSearchTerm('');
      setSelectedTutor(null);
      setIsDropdownOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTutores([]);
      setIsDropdownOpen(false);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = tutores.filter(t => 
        t.name.toLowerCase().includes(term) ||
        (t.email && t.email.toLowerCase().includes(term)) ||
        (t.phone && t.phone.includes(term))
      );
      setFilteredTutores(filtered);
      setIsDropdownOpen(true);
    }
  }, [searchTerm, tutores]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const fetchTutores = async () => {
    setIsLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'tutores'));
      const tutoresList = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(t => t.id !== paciente.tutorId)
        .sort((a, b) => a.name.localeCompare(b.name));
      setTutores(tutoresList);
    } catch (error) {
      Swal.fire('Error', 'No se pudieron cargar los tutores.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const recalculateTutorServiceTypes = async (tutorId) => {
    if (!tutorId) return [];
    try {
      const q = query(collection(db, 'pacientes'), where('tutorId', '==', tutorId));
      const pacSnap = await getDocs(q);
      const allServices = new Set();
      pacSnap.docs.forEach(d => {
        const services = d.data().serviceTypes || [];
        services.forEach(s => allServices.add(s));
      });
      return Array.from(allServices);
    } catch (error) {
      console.error('Error recalculating service types:', error);
      return [];
    }
  };

  const handleSelectTutor = (tutor) => {
    setSelectedTutor(tutor);
    setSearchTerm(tutor.name);
    setIsDropdownOpen(false);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setSelectedTutor(null);
  };

  const handleTransfer = async () => {
    if (!selectedTutor) {
      Swal.fire('Error', 'Debe seleccionar un tutor destino.', 'warning');
      return;
    }

    if (!paciente?.id || !paciente?.tutorId) {
      Swal.fire('Error', 'Datos del paciente incompletos.', 'error');
      return;
    }

    const result = await Swal.fire({
      title: '¿Confirmar transferencia?',
      html: `Se transferirá <strong>${paciente.name}</strong><br/>de <strong>${paciente.tutorName}</strong><br/>a <strong>${selectedTutor.name}</strong>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, transferir',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);

      const pacienteRef = doc(db, 'pacientes', paciente.id);
      batch.update(pacienteRef, {
        tutorId: selectedTutor.id,
        tutorName: selectedTutor.name
      });

      const oldTutorRef = doc(db, 'tutores', paciente.tutorId);
      batch.update(oldTutorRef, {
        pacienteIds: arrayRemove(paciente.id)
      });

      const newTutorRef = doc(db, 'tutores', selectedTutor.id);
      batch.update(newTutorRef, {
        pacienteIds: arrayUnion(paciente.id)
      });

      await batch.commit();

      const [oldTutorServices, newTutorServices] = await Promise.all([
        recalculateTutorServiceTypes(paciente.tutorId),
        recalculateTutorServiceTypes(selectedTutor.id)
      ]);

      const batch2 = writeBatch(db);
      batch2.update(oldTutorRef, { serviceTypes: oldTutorServices });
      batch2.update(newTutorRef, { serviceTypes: newTutorServices });
      await batch2.commit();

      await Swal.fire('Éxito', 'Paciente transferido correctamente.', 'success');
      
      if (onTransferComplete) {
        await onTransferComplete();
      }
      
      onClose();
    } catch (error) {
      console.error('Error transferring patient:', error);
      Swal.fire('Error', 'No se pudo completar la transferencia.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="transfer-paciente-modal-overlay" onClick={onClose}>
      <div className="transfer-paciente-modal" onClick={(e) => e.stopPropagation()}>
        <button className="transfer-paciente-modal__close" onClick={onClose}>×</button>
        
        <h2 className="transfer-paciente-modal__title">Transferir Paciente</h2>
        
        <div className="transfer-paciente-modal__info">
          <p><strong>Paciente:</strong> {paciente.name}</p>
          <p><strong>Tutor Actual:</strong> {paciente.tutorName}</p>
        </div>

        <div className="transfer-paciente-modal__form">
          <label htmlFor="searchTutor">Buscar Nuevo Tutor</label>
          {isLoading ? (
            <p className="transfer-paciente-modal__loading">Cargando tutores...</p>
          ) : (
            <div className="transfer-paciente-modal__combobox">
              <input
                ref={searchInputRef}
                id="searchTutor"
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => searchTerm && setIsDropdownOpen(true)}
                placeholder="Escriba nombre, email o teléfono..."
                disabled={isSubmitting}
                autoComplete="off"
              />
              
              {isDropdownOpen && filteredTutores.length > 0 && (
                <div ref={dropdownRef} className="transfer-paciente-modal__dropdown">
                  {filteredTutores.map(tutor => (
                    <div
                      key={tutor.id}
                      className="transfer-paciente-modal__dropdown-item"
                      onClick={() => handleSelectTutor(tutor)}
                    >
                      <div className="transfer-paciente-modal__dropdown-item-name">
                        {tutor.name}
                      </div>
                      <div className="transfer-paciente-modal__dropdown-item-details">
                        {tutor.email && <span>{tutor.email}</span>}
                        {tutor.phone && <span>{tutor.phone}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isDropdownOpen && searchTerm && filteredTutores.length === 0 && (
                <div ref={dropdownRef} className="transfer-paciente-modal__dropdown">
                  <div className="transfer-paciente-modal__dropdown-empty">
                    No se encontraron tutores
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedTutor && (
            <div className="transfer-paciente-modal__selected">
              <span>✓</span>
              <div>
                <strong>{selectedTutor.name}</strong>
                {selectedTutor.email && <p>{selectedTutor.email}</p>}
                {selectedTutor.phone && <p>{selectedTutor.phone}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="transfer-paciente-modal__actions">
          <button
            className="transfer-paciente-modal__btn transfer-paciente-modal__btn--secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            className="transfer-paciente-modal__btn transfer-paciente-modal__btn--primary"
            onClick={handleTransfer}
            disabled={isSubmitting || !selectedTutor}
          >
            {isSubmitting ? 'Transfiriendo...' : 'Transferir Paciente'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferPacienteModal;