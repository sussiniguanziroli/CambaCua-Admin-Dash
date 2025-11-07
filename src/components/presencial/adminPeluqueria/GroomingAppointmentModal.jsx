import React, { useState, useEffect } from "react";
import { db } from "../../../firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import Swal from "sweetalert2";
import { FaUser, FaDog, FaCut, FaTimes } from "react-icons/fa";

const GroomingAppointmentModal = ({
  isOpen,
  onClose,
  selectedDate,
  appointmentData,
  onSave,
  onDelete,
}) => {
  const [formData, setFormData] = useState({
    tutor: null,
    paciente: null,
    peluquero: null,
    date: "",
    startTime: "",
    services: [],
    notes: "",
  });

  const [allTutores, setAllTutores] = useState([]);
  const [allPacientes, setAllPacientes] = useState([]);
  const [peluqueros, setPeluqueros] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);

  const [tutorInput, setTutorInput] = useState("");
  const [pacienteInput, setPacienteInput] = useState("");

  const [filteredTutores, setFilteredTutores] = useState([]);
  const [filteredPacientes, setFilteredPacientes] = useState([]);

  const [isTutorDropdownOpen, setIsTutorDropdownOpen] = useState(false);
  const [isPacienteDropdownOpen, setIsPacienteDropdownOpen] = useState(false);

  const [searchBy, setSearchBy] = useState("tutor");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const initialDate = selectedDate
      ? selectedDate.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    if (appointmentData) {
      setFormData({
        tutor: { id: appointmentData.tutorId, name: appointmentData.tutorName },
        paciente: {
          id: appointmentData.pacienteId,
          name: appointmentData.pacienteName,
        },
        peluquero: {
          id: appointmentData.peluqueroId,
          name: appointmentData.peluqueroName,
        },
        date: appointmentData.startTime.toISOString().split("T")[0],
        startTime: appointmentData.startTime.toTimeString().substring(0, 5),
        services: appointmentData.services || [],
        notes: appointmentData.notes || "",
      });
      setTutorInput(appointmentData.tutorName || "");
      setPacienteInput(appointmentData.pacienteName || "");
    } else {
      setFormData({
        tutor: null,
        paciente: null,
        peluquero: null,
        date: initialDate,
        startTime: "",
        services: [],
        notes: "",
      });
      setTutorInput("");
      setPacienteInput("");
    }
    setSearchBy("tutor");
  }, [isOpen, selectedDate, appointmentData]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchInitialData = async () => {
      try {
        const [tutorsSnap, pacientesSnap, servicesSnap, peluquerosSnap] =
          await Promise.all([
            getDocs(collection(db, "tutores")),
            getDocs(collection(db, "pacientes")),
            getDocs(
              query(
                collection(db, "productos_presenciales"),
                where("category", "==", "peluqueria")
              )
            ),
            getDocs(
              query(collection(db, "peluqueros"), where("isActive", "==", true))
            ),
          ]);

        const tutorsList = tutorsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const pacientesList = pacientesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        tutorsList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        pacientesList.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        );

        setAllTutores(tutorsList);
        setAllPacientes(pacientesList);
        setFilteredTutores(tutorsList);
        setFilteredPacientes(pacientesList);

        setAvailableServices(
          servicesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
        setPeluqueros(
          peluquerosSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      } catch (error) {
        console.error("Error fetching initial data: ", error);
      }
    };
    fetchInitialData();
  }, [isOpen]);

  const handleTutorInput = (e) => {
    const value = e.target.value;
    setTutorInput(value);
    setFormData((prev) => ({ ...prev, tutor: null, paciente: null }));
    setPacienteInput("");
    setIsTutorDropdownOpen(true);

    if (value) {
      setFilteredTutores(
        allTutores.filter((t) =>
          t.name.toLowerCase().includes(value.toLowerCase())
        )
      );
    } else {
      setFilteredTutores(allTutores);
    }
  };

  const handlePacienteInput = (e) => {
    const value = e.target.value;
    setPacienteInput(value);
    setFormData((prev) => ({ ...prev, paciente: null }));
    setIsPacienteDropdownOpen(true);

    const sourceList =
      searchBy === "tutor" && formData.tutor
        ? allPacientes.filter((p) => p.tutorId === formData.tutor.id)
        : allPacientes;

    if (value) {
      setFilteredPacientes(
        sourceList.filter((p) =>
          p.name.toLowerCase().includes(value.toLowerCase())
        )
      );
    } else {
      setFilteredPacientes(sourceList);
    }
  };

  const selectTutor = (tutor) => {
    setTutorInput(tutor.name);
    setFormData((prev) => ({ ...prev, tutor, paciente: null }));
    setPacienteInput("");
    setIsTutorDropdownOpen(false);

    setFilteredPacientes(allPacientes.filter((p) => p.tutorId === tutor.id));
  };

  const selectPaciente = (paciente) => {
    setPacienteInput(paciente.name);
    setIsPacienteDropdownOpen(false);

    if (searchBy === "patient") {
      const correspondingTutor = allTutores.find(
        (t) => t.id === paciente.tutorId
      );
      if (correspondingTutor) {
        setTutorInput(correspondingTutor.name);
        setFormData((prev) => ({
          ...prev,
          paciente,
          tutor: correspondingTutor,
        }));
      } else {
        setFormData((prev) => ({ ...prev, paciente, tutor: null }));
        setTutorInput("");
      }
    } else {
      setFormData((prev) => ({ ...prev, paciente }));
    }
  };

  const handleSearchToggle = () => {
    setSearchBy((prev) => (prev === "tutor" ? "patient" : "tutor"));
    setFormData({ ...formData, tutor: null, paciente: null });
    setTutorInput("");
    setPacienteInput("");
    setFilteredTutores(allTutores);
    setFilteredPacientes(allPacientes);
  };

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleServiceToggle = (service) =>
    setFormData((prev) => ({
      ...prev,
      services: prev.services.some((s) => s.id === service.id)
        ? prev.services.filter((s) => s.id !== service.id)
        : [...prev.services, { id: service.id, name: service.name }],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData, appointmentData?.id);
    } catch (error) {
      console.error("Error saving appointment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="peluqueria-modal-overlay" onClick={onClose}>
      <div
        className="peluqueria-modal-wrapper"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="peluqueria-modal-header">
          <h3>{appointmentData ? "Editar Turno" : "Nuevo Turno"}</h3>
          <button
            type="button"
            className="peluqueria-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="peluqueria-modal-form">
          <div className="peluqueria-form-section">
            <div className="peluqueria-search-toggle">
              <label>Buscar por</label>
              <div className="peluqueria-toggle-buttons">
                <button
                  type="button"
                  className={`peluqueria-toggle-btn ${
                    searchBy === "tutor" ? "active" : ""
                  }`}
                  onClick={searchBy === "tutor" ? null : handleSearchToggle}
                >
                  <FaUser /> Tutor
                </button>
                <button
                  type="button"
                  className={`peluqueria-toggle-btn ${
                    searchBy === "patient" ? "active" : ""
                  }`}
                  onClick={searchBy === "patient" ? null : handleSearchToggle}
                >
                  <FaDog /> Paciente
                </button>
              </div>
            </div>

            <div className="peluqueria-form-row">
              <div className="peluqueria-form-field peluqueria-combobox">
                <label>Tutor</label>
                <input
                  type="text"
                  value={tutorInput}
                  onChange={handleTutorInput}
                  onFocus={() => {
                    handleTutorInput({ target: { value: tutorInput } });
                    setIsTutorDropdownOpen(true);
                  }}
                  onBlur={() =>
                    setTimeout(() => setIsTutorDropdownOpen(false), 200)
                  }
                  placeholder="Buscar o seleccionar tutor..."
                  required
                  disabled={searchBy === "patient"}
                />
                {isTutorDropdownOpen && (
                  <ul className="peluqueria-dropdown-list">
                    {filteredTutores.length > 0 ? (
                      filteredTutores.map((t) => (
                        <li key={t.id} onMouseDown={() => selectTutor(t)}>
                          {t.name}
                        </li>
                      ))
                    ) : (
                      <li className="no-results">No se encontraron tutores</li>
                    )}
                  </ul>
                )}
              </div>

              <div className="peluqueria-form-field peluqueria-combobox">
                <label>Paciente</label>
                <input
                  type="text"
                  value={pacienteInput}
                  onChange={handlePacienteInput}
                  onFocus={() => {
                    handlePacienteInput({ target: { value: pacienteInput } });
                    setIsPacienteDropdownOpen(true);
                  }}
                  onBlur={() =>
                    setTimeout(() => setIsPacienteDropdownOpen(false), 200)
                  }
                  placeholder={
                    searchBy === "tutor" && !formData.tutor
                      ? "Seleccione un tutor"
                      : "Buscar o seleccionar paciente..."
                  }
                  required
                  disabled={searchBy === "tutor" && !formData.tutor}
                />
                {isPacienteDropdownOpen && (
                  <ul className="peluqueria-dropdown-list">
                    {filteredPacientes.length > 0 ? (
                      filteredPacientes.map((p) => (
                        <li key={p.id} onMouseDown={() => selectPaciente(p)}>
                          {p.name}
                        </li>
                      ))
                    ) : (
                      <li className="no-results">
                        No se encontraron pacientes
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="peluqueria-form-section">
            <div className="peluqueria-form-row">
              <div className="peluqueria-form-field">
                <label>
                  <FaCut /> Peluquero
                </label>
                <select
                  name="peluquero"
                  value={formData.peluquero?.id || ""}
                  onChange={(e) => {
                    const selected = peluqueros.find(
                      (p) => p.id === e.target.value
                    );
                    setFormData((prev) => ({ ...prev, peluquero: selected }));
                  }}
                  required
                >
                  <option value="">Seleccionar peluquero...</option>
                  {peluqueros.map((peluquero) => (
                    <option key={peluquero.id} value={peluquero.id}>
                      {peluquero.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="peluqueria-form-section">
            <div className="peluqueria-form-row">
              <div className="peluqueria-form-field">
                <label>Fecha</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date || ""}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="peluqueria-form-field">
                <label>Hora</label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime || ""}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="peluqueria-form-section">
            <div className="peluqueria-form-field">
              <label>Servicios</label>
              <div className="peluqueria-services-grid">
                {availableServices.map((service) => (
                  <button
                    type="button"
                    key={service.id}
                    className={`peluqueria-service-chip ${
                      formData.services?.some((s) => s.id === service.id)
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => handleServiceToggle(service)}
                  >
                    {service.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="peluqueria-form-section">
            <div className="peluqueria-form-field">
              <label>Notas</label>
              <textarea
                name="notes"
                value={formData.notes || ""}
                onChange={handleChange}
                rows="4"
                placeholder="Agregar notas adicionales..."
              ></textarea>
            </div>
          </div>

          <div className="peluqueria-modal-footer">
            <div className="peluqueria-modal-actions-left">
              {appointmentData && (
                <button
                  type="button"
                  className="peluqueria-btn peluqueria-btn-danger"
                  onClick={() => onDelete(appointmentData)}
                >
                  Eliminar
                </button>
              )}
            </div>
            <div className="peluqueria-modal-actions-right">
              <button
                type="button"
                className="peluqueria-btn peluqueria-btn-secondary"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="peluqueria-btn peluqueria-btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroomingAppointmentModal;