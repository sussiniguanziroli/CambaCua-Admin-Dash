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
} from "react-icons/fa";
import AppointmentModal from "./AppointmentModal";

const AppointmentCard = ({ appointment, onClick, viewMode }) => {
  const getCardPosition = () => {
    const startHour = appointment.startTime.getHours();
    const startMinute = appointment.startTime.getMinutes();
    const top = (startHour - 8) * 60 + startMinute;
    let height = 60;
    if (appointment.endTime) {
      const durationMinutes =
        (appointment.endTime - appointment.startTime) / (1000 * 60);
      height = Math.max(30, durationMinutes);
    }
    return { top: `${top}px`, height: `${height}px` };
  };

  const tutor = appointment.tutorName || "Genérico";
  const paciente = appointment.pacienteName || "Genérico";

  return (
    <div
      className={`appointment-card view-${viewMode}`}
      style={viewMode === "day" ? getCardPosition() : {}}
      onClick={onClick}
    >
      <p className="patient-name">
        {paciente} ({tutor})
      </p>
      <p className="service-name">
        <FaStethoscope /> {appointment.services?.[0]?.nombre || "Consulta"}
      </p>
      <p className="time-range">
        <FaRegClock />{" "}
        {appointment.startTime.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
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

  const timeSlots = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`);

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

  return (
    <div className="agenda-container">
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        selectedDate={selectedDateForModal}
        appointmentData={selectedAppointment}
        onSave={handleSave}
        onDelete={handleDelete}
      />
      <div className="page-header">
        <h1>
          <FaRegCalendarAlt /> Agenda Clínica
        </h1>
        <div className="view-switcher">
          <button
            className={`btn ${viewMode === "day" ? "btn-primary" : ""}`}
            onClick={() => setViewMode("day")}
          >
            Día
          </button>
          <button
            className={`btn ${viewMode === "week" ? "btn-primary" : ""}`}
            onClick={() => setViewMode("week")}
          >
            Semana
          </button>
        </div>
        <div className="week-navigator">
          <button onClick={() => changeDate(-1)}>&lt;</button>
          <button
            className="today-btn"
            onClick={() => setCurrentDate(new Date())}
          >
            Hoy
          </button>
          <span className="week-display">{renderHeaderDate()}</span>
          <button onClick={() => changeDate(1)}>&gt;</button>
        </div>
      </div>
      {isLoading ? (
        <p>Cargando...</p>
      ) : (
        <div className={`agenda-grid view-${viewMode}`}>
          <div className="time-column">
            <div className="time-slot-header">Hora</div>
            {timeSlots.map((time) => (
              <div key={time} className="time-slot">
                {time}
              </div>
            ))}
          </div>
          {dateRange.map((day) => (
            <div key={day.toISOString()} className="day-column">
              <div
                className={`day-header ${isToday(day) ? "current-day" : ""}`}
                onClick={() => handleOpenModalForNew(day)}
              >
                <span className="day-name">
                  {day.toLocaleDateString("es-AR", { weekday: "short" })}
                </span>
                <span className="day-number">{day.getDate()}</span>
              </div>
              <div className="appointments-area">
                {appointments
                  .filter(
                    (a) => a.startTime.toDateString() === day.toDateString()
                  )
                  .sort((a, b) => a.startTime - b.startTime)
                  .map((app) => (
                    <AppointmentCard
                      key={app.id}
                      appointment={app}
                      onClick={() => handleOpenModalForEdit(app)}
                      viewMode={viewMode}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Agenda;