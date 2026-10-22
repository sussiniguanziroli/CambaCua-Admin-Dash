import React from 'react';
import { Link } from 'react-router-dom';
import { FaDog, FaUser } from 'react-icons/fa';

const pacienteRoute = (id) => `/admin/paciente-profile/${id}`;
const tutorRoute = (id) => `/admin/tutor-profile/${id}`;

// Link de texto para tarjetas de agenda: no dispara el click de la tarjeta (abrir el turno).
export const ProfileLink = ({ to, children }) => (
    <Link to={to} className="agenda-profile-link" onClick={(e) => e.stopPropagation()}>{children}</Link>
);

export const PacienteLink = ({ id, name }) => (id ? <ProfileLink to={pacienteRoute(id)}>{name}</ProfileLink> : <>{name}</>);
export const TutorLink = ({ id, name }) => (id ? <ProfileLink to={tutorRoute(id)}>{name}</ProfileLink> : <>{name}</>);

// Franja dentro del modal de un turno existente. No se muestra para turnos genéricos (sin ficha).
export const AppointmentProfileLinks = ({ appointment }) => {
    if (!appointment || (!appointment.pacienteId && !appointment.tutorId)) return null;
    return (
        <div className="appointment-profile-links">
            <span>Ir al perfil:</span>
            {appointment.pacienteId && (
                <Link to={pacienteRoute(appointment.pacienteId)}><FaDog /> {appointment.pacienteName || 'Paciente'}</Link>
            )}
            {appointment.tutorId && (
                <Link to={tutorRoute(appointment.tutorId)}><FaUser /> {appointment.tutorName || 'Tutor'}</Link>
            )}
        </div>
    );
};
