import React, { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../../../firebase/config";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  where,
} from "firebase/firestore";
import Swal from "sweetalert2";
import {
  FaStethoscope,
  FaRegCalendarAlt,
  FaRegClock,
  FaUser,
  FaPlus,
} from "react-icons/fa";
import AppointmentModal from "./AppointmentModal";

const AppointmentCard = ({ appointment, onClick, viewMode }) => {
  const tutor = appointment.tutorName || "Genérico";
  const paciente = appointment.pacienteName || "Genérico";
  const startTime = appointment.startTime.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = appointment.endTime
    ? appointment.endTime.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className={`agenda-appointment-card ${viewMode}`} onClick={onClick}>
      <div className="agenda-appointment-header">
        <span className="agenda-appointment-time">
          <FaRegClock />
          {startTime}
          {endTime && ` - ${endTime}`}
        </span>
      </div>
      <div className="agenda-appointment-body">
        <p className="agenda-appointment-patient">
          <FaUser />
          {paciente}
        </p>
        <p className="agenda-appointment-tutor">{tutor}</p>
        <p className="agenda-appointment-service">
          <FaStethoscope />
          {appointment.services?.[0]?.nombre || "Consulta"}
        </p>
      </div>
    </div>
  );
};

const Agenda = () => {
  const [viewMode, setViewMode] = useState("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    if (viewMode === "week") {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(start.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
      });
    }
    start.setHours(0, 0, 0, 0);
    return [start];
  }, [currentDate, viewMode]);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const startDate = dateRange[0];
      const endDate = new Date(dateRange[dateRange.length - 1]);
      endDate.setHours(23, 59, 59, 999);
      const q = query(
        collection(db, "citas"),
        where("startTime", ">=", Timestamp.fromDate(startDate)),
        where("startTime", "<=", Timestamp.fromDate(endDate))
      );
      const snapshot = await getDocs(q);
      setAppointments(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          startTime: doc.data().startTime.toDate(),
          endTime: doc.data().endTime?.toDate(),
        }))
      );
    } catch (error) {
      Swal.fire("Error", "No se pudieron cargar las citas.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleOpenModalForNew = (date) => {
    setSelectedDateForModal(date);
    setSelectedAppointment(null);
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (appointment) => {
    setSelectedAppointment(appointment);
    setSelectedDateForModal(appointment.startTime);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSave = async (formData, appointmentId) => {
    const isGeneric = formData.isGeneric;
    let appointmentData;

    if (isGeneric) {
      if (!formData.genericTutorName || !formData.genericPacienteName) {
        Swal.fire(
          "Campos incompletos",
          "Tutor y paciente son requeridos.",
          "warning"
        );
        return Promise.reject();
      }
      appointmentData = {
        tutorId: null,
        tutorName: formData.genericTutorName,
        pacienteId: null,
        pacienteName: formData.genericPacienteName,
      };
    } else {
      if (!formData.tutor || !formData.paciente) {
        Swal.fire(
          "Campos incompletos",
          "Tutor y paciente son requeridos.",
          "warning"
        );
        return Promise.reject();
      }
      appointmentData = {
        tutorId: formData.tutor.id,
        tutorName: formData.tutor.name,
        pacienteId: formData.paciente.id,
        pacienteName: formData.paciente.name,
      };
    }

    const appointment = {
      ...appointmentData,
      startTime: Timestamp.fromDate(
        new Date(`${formData.date}T${formData.startTime}`)
      ),
      endTime: formData.endTime
        ? Timestamp.fromDate(new Date(`${formData.date}T${formData.endTime}`))
        : null,
      services: formData.services,
      notes: formData.notes,
    };

    try {
      if (appointmentId) {
        await updateDoc(doc(db, "citas", appointmentId), appointment);
      } else {
        await addDoc(collection(db, "citas"), appointment);
      }
      Swal.fire("Éxito", "Cita guardada.", "success");
      handleCloseModal();
      fetchAppointments();
    } catch (error) {
      Swal.fire("Error", "No se pudo guardar la cita.", "error");
      return Promise.reject(error);
    }
  };

  const handleDelete = (appointment) => {
    Swal.fire({
      title: "¿Eliminar cita?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, "citas", appointment.id));
          Swal.fire("Eliminada", "La cita ha sido eliminada.", "success");
          handleCloseModal();
          fetchAppointments();
        } catch (error) {
          Swal.fire("Error", "No se pudo eliminar la cita.", "error");
        }
      }
    });
  };

  const changeDate = (amount) =>
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (viewMode === "week" ? 7 : 1) * amount);
      return newDate;
    });

  const isToday = (someDate) =>
    new Date().toDateString() === someDate.toDateString();

  const renderHeaderDate = () =>
    viewMode === "week"
      ? `${dateRange[0].toLocaleDateString(
          "es-AR"
        )} - ${dateRange[6].toLocaleDateString("es-AR")}`
      : dateRange[0].toLocaleDateString("es-AR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

  const groupedAppointments = useMemo(() => {
    const grouped = {};
    dateRange.forEach((day) => {
      const dayKey = day.toDateString();
      grouped[dayKey] = appointments
        .filter((a) => a.startTime.toDateString() === dayKey)
        .sort((a, b) => a.startTime - b.startTime);
    });
    return grouped;
  }, [appointments, dateRange]);

  return (
    <div className="agenda-main-container">
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        selectedDate={selectedDateForModal}
        appointmentData={selectedAppointment}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <div className="agenda-page-header">
        <div className="agenda-header-left">
          <h1 className="agenda-title">
            <FaRegCalendarAlt />
            Agenda Clínica
          </h1>
        </div>

        <div className="agenda-header-controls">
          <div className="agenda-view-switcher">
            <button
              className={`agenda-view-btn ${
                viewMode === "day" ? "active" : ""
              }`}
              onClick={() => setViewMode("day")}
            >
              Día
            </button>
            <button
              className={`agenda-view-btn ${
                viewMode === "week" ? "active" : ""
              }`}
              onClick={() => setViewMode("week")}
            >
              Semana
            </button>
          </div>

          <div className="agenda-navigator">
            <button
              className="agenda-nav-btn"
              onClick={() => changeDate(-1)}
              aria-label="Anterior"
            >
              ‹
            </button>
            <button
              className="agenda-today-btn"
              onClick={() => setCurrentDate(new Date())}
            >
              Hoy
            </button>
            <span className="agenda-date-display">{renderHeaderDate()}</span>
            <button
              className="agenda-nav-btn"
              onClick={() => changeDate(1)}
              aria-label="Siguiente"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="agenda-loading">
          <div className="agenda-spinner"></div>
          <p>Cargando citas...</p>
        </div>
      ) : (
        <div className={`agenda-calendar-grid ${viewMode}`}>
          {dateRange.map((day) => {
            const dayKey = day.toDateString();
            const dayAppointments = groupedAppointments[dayKey] || [];
            const appointmentCount = dayAppointments.length;

            return (
              <div key={dayKey} className="agenda-day-container">
                <div
                  className={`agenda-day-header ${
                    isToday(day) ? "today" : ""
                  }`}
                >
                  <div className="agenda-day-info">
                    <span className="agenda-day-name">
                      {day.toLocaleDateString("es-AR", { weekday: "long" })}
                    </span>
                    <span className="agenda-day-number">{day.getDate()}</span>
                  </div>
                  <div className="agenda-day-stats">
                    <span className="agenda-appointment-count">
                      {appointmentCount}{" "}
                      {appointmentCount === 1 ? "cita" : "citas"}
                    </span>
                    <button
                      className="agenda-add-btn"
                      onClick={() => handleOpenModalForNew(day)}
                      title="Agregar cita"
                    >
                      <FaPlus />
                    </button>
                  </div>
                </div>

                <div className="agenda-appointments-container">
                  {dayAppointments.length === 0 ? (
                    <div className="agenda-no-appointments">
                      <p>Sin citas programadas</p>
                      <button
                        className="agenda-add-first-btn"
                        onClick={() => handleOpenModalForNew(day)}
                      >
                        <FaPlus /> Agregar cita
                      </button>
                    </div>
                  ) : (
                    <div className="agenda-appointments-list">
                      {dayAppointments.map((app) => (
                        <AppointmentCard
                          key={app.id}
                          appointment={app}
                          onClick={() => handleOpenModalForEdit(app)}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Agenda;