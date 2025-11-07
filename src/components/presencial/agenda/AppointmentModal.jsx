import React, { useState, useEffect } from "react";
import { db } from "../../../firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import Swal from "sweetalert2";
import { FaUser, FaDog, FaDownload, FaTimes } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const AppointmentModal = ({
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
    date: "",
    startTime: "",
    endTime: "",
    services: [],
    notes: "",
    isGeneric: false,
    genericTutorName: "",
    genericPacienteName: "",
  });

  const [allTutores, setAllTutores] = useState([]);
  const [allPacientes, setAllPacientes] = useState([]);
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
      const isGeneric = !appointmentData.tutorId;
      setFormData({
        tutor: isGeneric
          ? null
          : { id: appointmentData.tutorId, name: appointmentData.tutorName },
        paciente: isGeneric
          ? null
          : {
              id: appointmentData.pacienteId,
              name: appointmentData.pacienteName,
            },
        date: appointmentData.startTime.toISOString().split("T")[0],
        startTime: appointmentData.startTime.toTimeString().substring(0, 5),
        endTime: appointmentData.endTime
          ? appointmentData.endTime.toTimeString().substring(0, 5)
          : "",
        services: appointmentData.services || [],
        notes: appointmentData.notes || "",
        isGeneric: isGeneric,
        genericTutorName: isGeneric ? appointmentData.tutorName : "",
        genericPacienteName: isGeneric ? appointmentData.pacienteName : "",
      });
      setTutorInput(isGeneric ? "" : appointmentData.tutorName || "");
      setPacienteInput(isGeneric ? "" : appointmentData.pacienteName || "");
    } else {
      setFormData({
        tutor: null,
        paciente: null,
        date: initialDate,
        startTime: "",
        endTime: "",
        services: [],
        notes: "",
        isGeneric: false,
        genericTutorName: "",
        genericPacienteName: "",
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
        const [tutorsSnap, pacientesSnap, servicesSnap] = await Promise.all([
          getDocs(collection(db, "tutores")),
          getDocs(collection(db, "pacientes")),
          getDocs(
            query(
              collection(db, "productos_presenciales"),
              where("category", "!=", "peluqueria")
            )
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
        pacientesList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        setAllTutores(tutorsList);
        setAllPacientes(pacientesList);
        setFilteredTutores(tutorsList);
        setFilteredPacientes(pacientesList);

        setAvailableServices(
          servicesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
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
        setFormData((prev) => ({ ...prev, paciente, tutor: correspondingTutor }));
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

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
      tutor: null,
      paciente: null,
      genericTutorName: "",
      genericPacienteName: "",
    }));
    setTutorInput("");
    setPacienteInput("");
  };

  const handleServiceToggle = (service) =>
    setFormData((prev) => ({
      ...prev,
      services: prev.services.some((s) => s.id === service.id)
        ? prev.services.filter((s) => s.id !== service.id)
        : [...prev.services, { id: service.id, nombre: service.nombre || service.name }],
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

  const handleDownloadPDF = () => {
    if (!appointmentData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text("Comprobante de Cita", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("Información de la Cita", 14, 40);

    doc.setFont(undefined, "normal");
    doc.setFontSize(11);

    const appointmentInfo = [
      ["Fecha", formData.date],
      ["Hora Inicio", formData.startTime],
      ["Hora Fin", formData.endTime || "N/A"],
      [
        "Tutor",
        formData.isGeneric
          ? formData.genericTutorName
          : formData.tutor?.name || "N/A",
      ],
      [
        "Paciente",
        formData.isGeneric
          ? formData.genericPacienteName
          : formData.paciente?.name || "N/A",
      ],
    ];

    autoTable(doc, {
      startY: 45,
      head: [],
      body: appointmentInfo,
      theme: "grid",
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 40 },
        1: { cellWidth: "auto" },
      },
    });

    let finalY = doc.lastAutoTable.finalY + 10;

    if (formData.services && formData.services.length > 0) {
      doc.setFont(undefined, "bold");
      doc.text("Servicios Solicitados", 14, finalY);
      doc.setFont(undefined, "normal");

      const servicesData = formData.services.map((s, index) => [
        index + 1,
        s.nombre || s.name || "N/A",
      ]);

      autoTable(doc, {
        startY: finalY + 5,
        head: [["#", "Servicio"]],
        body: servicesData,
        theme: "striped",
        styles: { fontSize: 10 },
        headStyles: { fillColor: [52, 152, 219] },
      });

      finalY = doc.lastAutoTable.finalY + 10;
    }

    if (formData.notes) {
      doc.setFont(undefined, "bold");
      doc.text("Notas", 14, finalY);
      doc.setFont(undefined, "normal");
      const splitNotes = doc.splitTextToSize(formData.notes, pageWidth - 28);
      doc.text(splitNotes, 14, finalY + 5);
    }

    doc.save(
      `cita_${formData.date}_${formData.paciente?.name || formData.genericPacienteName || "paciente"}.pdf`
    );
  };

  if (!isOpen) return null;

  return (
    <div className="agenda-modal-overlay" onClick={onClose}>
      <div className="agenda-modal-wrapper" onClick={(e) => e.stopPropagation()}>
        <div className="agenda-modal-header">
          <h3>{appointmentData ? "Editar Cita" : "Nueva Cita"}</h3>
          <button
            type="button"
            className="agenda-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="agenda-modal-form">
          <div className="agenda-form-section">
            <div className="agenda-checkbox-group">
              <input
                type="checkbox"
                name="isGeneric"
                id="isGeneric"
                checked={formData.isGeneric}
                onChange={handleCheckboxChange}
              />
              <label htmlFor="isGeneric">Cita Genérica (Sin Ficha)</label>
            </div>

            {!formData.isGeneric ? (
              <>
                <div className="agenda-search-toggle">
                  <label>Buscar por</label>
                  <div className="agenda-toggle-buttons">
                    <button
                      type="button"
                      className={`agenda-toggle-btn ${
                        searchBy === "tutor" ? "active" : ""
                      }`}
                      onClick={searchBy === "tutor" ? null : handleSearchToggle}
                    >
                      <FaUser /> Tutor
                    </button>
                    <button
                      type="button"
                      className={`agenda-toggle-btn ${
                        searchBy === "patient" ? "active" : ""
                      }`}
                      onClick={searchBy === "patient" ? null : handleSearchToggle}
                    >
                      <FaDog /> Paciente
                    </button>
                  </div>
                </div>

                <div className="agenda-form-row">
                  <div className="agenda-form-field agenda-combobox">
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
                      required={!formData.isGeneric}
                      disabled={searchBy === "patient"}
                    />
                    {isTutorDropdownOpen && (
                      <ul className="agenda-dropdown-list">
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

                  <div className="agenda-form-field agenda-combobox">
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
                      required={!formData.isGeneric}
                      disabled={searchBy === "tutor" && !formData.tutor}
                    />
                    {isPacienteDropdownOpen && (
                      <ul className="agenda-dropdown-list">
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
              </>
            ) : (
              <div className="agenda-form-row">
                <div className="agenda-form-field">
                  <label>Nombre Tutor</label>
                  <input
                    type="text"
                    name="genericTutorName"
                    value={formData.genericTutorName}
                    onChange={handleChange}
                    placeholder="Nombre del tutor"
                    required={formData.isGeneric}
                  />
                </div>
                <div className="agenda-form-field">
                  <label>Nombre Paciente</label>
                  <input
                    type="text"
                    name="genericPacienteName"
                    value={formData.genericPacienteName}
                    onChange={handleChange}
                    placeholder="Nombre del paciente"
                    required={formData.isGeneric}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="agenda-form-section">
            <div className="agenda-form-row">
              <div className="agenda-form-field">
                <label>Fecha</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date || ""}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="agenda-form-field">
                <label>Hora Inicio</label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime || ""}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="agenda-form-field">
                <label>Hora Fin</label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime || ""}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="agenda-form-section">
            <div className="agenda-form-field">
              <label>Servicios</label>
              <div className="agenda-services-grid">
                {availableServices.map((service) => (
                  <button
                    type="button"
                    key={service.id}
                    className={`agenda-service-chip ${
                      formData.services?.some((s) => s.id === service.id)
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => handleServiceToggle(service)}
                  >
                    {service.name || service.nombre}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="agenda-form-section">
            <div className="agenda-form-field">
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

          <div className="agenda-modal-footer">
            <div className="agenda-modal-actions-left">
              {appointmentData && (
                <>
                  <button
                    type="button"
                    className="agenda-btn agenda-btn-danger"
                    onClick={() => onDelete(appointmentData)}
                  >
                    Eliminar
                  </button>
                  <button
                    type="button"
                    className="agenda-btn agenda-btn-outline"
                    onClick={handleDownloadPDF}
                  >
                    <FaDownload /> PDF
                  </button>
                </>
              )}
            </div>
            <div className="agenda-modal-actions-right">
              <button
                type="button"
                className="agenda-btn agenda-btn-secondary"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="agenda-btn agenda-btn-primary"
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

export default AppointmentModal;