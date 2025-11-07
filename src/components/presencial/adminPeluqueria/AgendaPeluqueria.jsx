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
  FaRegCalendarAlt,
  FaRegClock,
  FaDog,
  FaUser,
  FaCut,
  FaPlus,
} from "react-icons/fa";
import GroomingAppointmentModal from "./GroomingAppointmentModal";

const GroomingAppointmentCard = ({ appointment, onClick, viewMode }) => {
  const startTime = appointment.startTime.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const services =
    appointment.services && appointment.services.length > 0
      ? appointment.services.map((s) => s.name).join(", ")
      : "Turno";

  return (
    <div className={`peluqueria-appointment-card ${viewMode}`} onClick={onClick}>
      <div className="peluqueria-appointment-header">
        <span className="peluqueria-appointment-time">
          <FaRegClock />
          {startTime}
        </span>
      </div>
      <div className="peluqueria-appointment-body">
        <p className="peluqueria-appointment-patient">
          <FaDog />
          {appointment.pacienteName}
        </p>
        <p className="peluqueria-appointment-tutor">
          <FaUser />
          {appointment.tutorName}
        </p>
        {appointment.peluqueroName && (
          <p className="peluqueria-appointment-groomer">
            <FaCut />
            {appointment.peluqueroName}
          </p>
        )}
        <p className="peluqueria-appointment-service">{services}</p>
      </div>
    </div>
  );
};

const AgendaPeluqueria = () => {
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
        collection(db, "turnos_peluqueria"),
        where("startTime", ">=", Timestamp.fromDate(startDate)),
        where("startTime", "<=", Timestamp.fromDate(endDate))
      );
      const snapshot = await getDocs(q);
      const fetchedAppointments = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          peluqueroId: data.peluqueroId || data.peluqueroid,
          startTime: data.startTime.toDate(),
          endTime: data.endTime?.toDate(),
        };
      });
      setAppointments(fetchedAppointments);
    } catch (error) {
      Swal.fire("Error", "No se pudieron cargar los turnos.", "error");
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
    if (
      !formData.tutor ||
      !formData.paciente ||
      !formData.peluquero ||
      !formData.startTime
    ) {
      Swal.fire(
        "Campos incompletos",
        "Tutor, paciente, peluquero y hora son requeridos.",
        "warning"
      );
      return Promise.reject();
    }

    const appointment = {
      tutorId: formData.tutor.id,
      tutorName: formData.tutor.name,
      pacienteId: formData.paciente.id,
      pacienteName: formData.paciente.name,
      peluqueroId: formData.peluquero.id,
      peluqueroName: formData.peluquero.name,
      startTime: Timestamp.fromDate(
        new Date(`${formData.date}T${formData.startTime}`)
      ),
      services: formData.services,
      notes: formData.notes,
      status: "Agendado",
    };

    try {
      if (appointmentId) {
        await updateDoc(doc(db, "turnos_peluqueria", appointmentId), appointment);
      } else {
        await addDoc(collection(db, "turnos_peluqueria"), appointment);
      }
      Swal.fire("Éxito", "Turno guardado.", "success");
      handleCloseModal();
      fetchAppointments();
    } catch (error) {
      Swal.fire("Error", "No se pudo guardar el turno.", "error");
      return Promise.reject(error);
    }
  };

  const handleDelete = (appointment) => {
    Swal.fire({
      title: "¿Eliminar turno?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, "turnos_peluqueria", appointment.id));
          Swal.fire("Eliminado", "El turno ha sido eliminado.", "success");
          handleCloseModal();
          fetchAppointments();
        } catch (error) {
          Swal.fire("Error", "No se pudo eliminar el turno.", "error");
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
    <div className="peluqueria-main-container">
      <GroomingAppointmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        selectedDate={selectedDateForModal}
        appointmentData={selectedAppointment}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <div className="peluqueria-page-header">
        <div className="peluqueria-header-left">
          <h1 className="peluqueria-title">
            <FaRegCalendarAlt />
            Agenda de Peluquería
          </h1>
        </div>

        <div className="peluqueria-header-controls">
          <div className="peluqueria-view-switcher">
            <button
              className={`peluqueria-view-btn ${
                viewMode === "day" ? "active" : ""
              }`}
              onClick={() => setViewMode("day")}
            >
              Día
            </button>
            <button
              className={`peluqueria-view-btn ${
                viewMode === "week" ? "active" : ""
              }`}
              onClick={() => setViewMode("week")}
            >
              Semana
            </button>
          </div>

          <div className="peluqueria-navigator">
            <button
              className="peluqueria-nav-btn"
              onClick={() => changeDate(-1)}
              aria-label="Anterior"
            >
              ‹
            </button>
            <button
              className="peluqueria-today-btn"
              onClick={() => setCurrentDate(new Date())}
            >
              Hoy
            </button>
            <span className="peluqueria-date-display">{renderHeaderDate()}</span>
            <button
              className="peluqueria-nav-btn"
              onClick={() => changeDate(1)}
              aria-label="Siguiente"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="peluqueria-loading">
          <div className="peluqueria-spinner"></div>
          <p>Cargando turnos...</p>
        </div>
      ) : (
        <div className={`peluqueria-calendar-grid ${viewMode}`}>
          {dateRange.map((day) => {
            const dayKey = day.toDateString();
            const dayAppointments = groupedAppointments[dayKey] || [];
            const appointmentCount = dayAppointments.length;

            return (
              <div key={dayKey} className="peluqueria-day-container">
                <div
                  className={`peluqueria-day-header ${
                    isToday(day) ? "today" : ""
                  }`}
                >
                  <div className="peluqueria-day-info">
                    <span className="peluqueria-day-name">
                      {day.toLocaleDateString("es-AR", { weekday: "long" })}
                    </span>
                    <span className="peluqueria-day-number">{day.getDate()}</span>
                  </div>
                  <div className="peluqueria-day-stats">
                    <span className="peluqueria-appointment-count">
                      {appointmentCount}{" "}
                      {appointmentCount === 1 ? "turno" : "turnos"}
                    </span>
                    <button
                      className="peluqueria-add-btn"
                      onClick={() => handleOpenModalForNew(day)}
                      title="Agregar turno"
                    >
                      <FaPlus />
                    </button>
                  </div>
                </div>

                <div className="peluqueria-appointments-container">
                  {dayAppointments.length === 0 ? (
                    <div className="peluqueria-no-appointments">
                      <p>Sin turnos programados</p>
                      <button
                        className="peluqueria-add-first-btn"
                        onClick={() => handleOpenModalForNew(day)}
                      >
                        <FaPlus /> Agregar turno
                      </button>
                    </div>
                  ) : (
                    <div className="peluqueria-appointments-list">
                      {dayAppointments.map((app) => (
                        <GroomingAppointmentCard
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

export default AgendaPeluqueria;