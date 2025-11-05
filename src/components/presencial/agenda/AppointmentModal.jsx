import React, { useState, useEffect } from "react";
import { db } from "../../../firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import Swal from "sweetalert2";
import { FaUser, FaDog, FaDownload } from "react-icons/fa";
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
        : [
            ...prev.services,
            {
              id: service.id,
              nombre: service.name || service.nombre,
              precio: service.price ?? null,
            },
          ],
    }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.isGeneric && (!formData.tutor || !formData.paciente)) {
      Swal.fire(
        "Datos incompletos",
        "Debe seleccionar un tutor y un paciente válidos.",
        "warning"
      );
      return;
    }
    if (
      formData.isGeneric &&
      (!formData.genericTutorName || !formData.genericPacienteName)
    ) {
      Swal.fire(
        "Datos incompletos",
        "Debe ingresar un nombre de tutor y paciente.",
        "warning"
      );
      return;
    }
    setIsSubmitting(true);
    onSave(formData, appointmentData?.id).finally(() => setIsSubmitting(false));
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const {
      date,
      startTime,
      endTime,
      services,
      notes,
      isGeneric,
      tutor,
      paciente,
      genericTutorName,
      genericPacienteName,
    } = formData;

    const tutorName = isGeneric ? genericTutorName : tutor?.name;
    const patientName = isGeneric ? genericPacienteName : paciente?.name;
    const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString(
      "es-AR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
    const time = endTime ? `${startTime} - ${endTime}` : `${startTime}`;
    let finalY = 70;

    doc.setFontSize(18);
    doc.text("Comprobante de Cita", 14, 22);
    doc.setFontSize(12);
    doc.text(`Tutor: ${tutorName}`, 14, 40);
    doc.text(`Paciente: ${patientName}`, 14, 48);
    doc.text(`Fecha: ${formattedDate}`, 14, 56);
    doc.text(`Hora: ${time}`, 14, 64);

    if (services && services.length > 0) {
      doc.setFontSize(14);
      doc.text("Servicios", 14, 80);
      autoTable(doc, {
        startY: 85,
        head: [["Servicio"]],
        body: services.map((s) => [
          s.nombre,
        ]),
        theme: "grid",
      });
      finalY = doc.lastAutoTable.finalY;
    }

    if (notes) {
      doc.setFontSize(14);
      doc.text("Notas", 14, finalY + 15);
      doc.setFontSize(12);
      const splitNotes = doc.splitTextToSize(notes, 180);
      doc.text(splitNotes, 14, finalY + 22);
    }

    doc.save(`cita-${patientName}-${formattedDate}.pdf`);
  };

  if (!isOpen) return null;

  return (
    <div className="agenda-modal-overlay">
      <div className="agenda-modal-content">
        <div className="modal-header">
          <h3>{appointmentData ? "Editar Cita" : "Agendar Nueva Cita"}</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group form-group-checkbox">
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
              <div className="form-group">
                <label>Buscar por</label>
                <div className="search-by-toggle">
                  <button
                    type="button"
                    className={`btn ${
                      searchBy === "tutor" ? "btn-primary" : "btn-outline"
                    }`}
                    onClick={searchBy === "tutor" ? null : handleSearchToggle}
                  >
                    <FaUser /> Tutor
                  </button>
                  <button
                    type="button"
                    className={`btn ${
                      searchBy === "patient" ? "btn-primary" : "btn-outline"
                    }`}
                    onClick={searchBy === "patient" ? null : handleSearchToggle}
                  >
                    <FaDog /> Paciente
                  </button>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group combobox-container">
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
                    <ul className="combobox-results">
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
                <div className="form-group combobox-container">
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
                    <ul className="combobox-results">
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
            <div className="form-row">
              <div className="form-group">
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
              <div className="form-group">
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

          <div className="form-row">
            <div className="form-group">
              <label>Fecha</label>
              <input
                type="date"
                name="date"
                value={formData.date || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Hora Inicio</label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Hora Fin</label>
              <input
                type="time"
                name="endTime"
                value={formData.endTime || ""}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Servicios</label>
            <div className="services-list">
              {availableServices.map((service) => (
                <button
                  type="button"
                  key={service.id}
                  className={`service-chip ${
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
          <div className="form-group">
            <label>Notas</label>
            <textarea
              name="notes"
              value={formData.notes || ""}
              onChange={handleChange}
            ></textarea>
          </div>
          <div className="modal-footer">
            <div className="modal-footer-left">
              {appointmentData && (
                <>
                  <button
                    type="button"
                    className="btn btn-danger-outline"
                    onClick={() => onDelete(appointmentData)}
                  >
                    Eliminar
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary-outline"
                    onClick={handleDownloadPDF}
                  >
                    <FaDownload /> PDF
                  </button>
                </>
              )}
            </div>
            <div className="modal-footer-right">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
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