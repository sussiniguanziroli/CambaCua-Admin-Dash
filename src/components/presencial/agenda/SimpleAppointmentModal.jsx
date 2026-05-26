import React, { useState, useEffect } from "react";
import { db } from "../../../firebase/config";
import { collection, addDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { FaTimes } from "react-icons/fa";

const SimpleAppointmentModal = ({ isOpen, onClose, onSave, tutor, paciente: pacienteProp }) => {
  const [pacientes, setPacientes] = useState([]);
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDate("");
    setStartTime("");
    setNotes("");
    if (pacienteProp) {
      setSelectedPaciente(pacienteProp);
      setPacientes([]);
    } else if (tutor) {
      setSelectedPaciente(null);
      const fetchPacientes = async () => {
        const snap = await getDocs(query(collection(db, "pacientes"), where("tutorId", "==", tutor.id)));
        setPacientes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      };
      fetchPacientes();
    }
  }, [isOpen, tutor, pacienteProp]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPaciente) return;
    setIsSubmitting(true);
    try {
      const appointment = {
        tutorId: tutor.id,
        tutorName: tutor.name,
        pacienteId: selectedPaciente.id,
        pacienteName: selectedPaciente.name,
        startTime: Timestamp.fromDate(new Date(`${date}T${startTime}`)),
        endTime: null,
        services: [],
        notes,
      };
      await addDoc(collection(db, "citas"), appointment);
      onSave();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="simple-appointment-modal-overlay" onClick={onClose}>
      <div className="simple-appointment-modal-wrapper" onClick={(e) => e.stopPropagation()}>
        <div className="simple-appointment-modal-header">
          <h3>Nueva Cita</h3>
          <button type="button" className="simple-appointment-modal-header-close" onClick={onClose} aria-label="Cerrar">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="simple-appointment-modal-form">
          <div className="simple-appointment-modal-field">
            <label>Tutor</label>
            <input type="text" value={tutor?.name || ""} disabled />
          </div>

          <div className="simple-appointment-modal-field">
            <label>Paciente</label>
            {pacienteProp ? (
              <input type="text" value={pacienteProp.name} disabled />
            ) : (
              <select
                value={selectedPaciente?.id || ""}
                onChange={(e) => setSelectedPaciente(pacientes.find((p) => p.id === e.target.value) || null)}
                required
              >
                <option value="">Seleccionar paciente...</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="simple-appointment-modal-row">
            <div className="simple-appointment-modal-field">
              <label>Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="simple-appointment-modal-field">
              <label>Hora</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
          </div>

          <div className="simple-appointment-modal-field">
            <label>Razón de visita</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describí el motivo de la consulta..."
            />
          </div>

          <div className="simple-appointment-modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-save" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SimpleAppointmentModal;