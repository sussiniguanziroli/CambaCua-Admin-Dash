import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../../firebase/config'; // Corrected import path
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, Timestamp, query, where } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { FaStethoscope, FaRegCalendarAlt, FaRegClock } from 'react-icons/fa';

// --- Internal Component: AppointmentCard ---
const AppointmentCard = ({ appointment, onClick, viewMode }) => {
    const getCardPosition = () => {
        const startHour = appointment.startTime.getHours();
        const startMinute = appointment.startTime.getMinutes();
        const top = ((startHour - 8) * 60) + startMinute;
        let height = 60;

        if (appointment.endTime) {
            const durationMinutes = (appointment.endTime - appointment.startTime) / (1000 * 60);
            height = Math.max(30, durationMinutes);
        }
        return { top: `${top}px`, height: `${height}px` };
    };

    return (
        <div className={`appointment-card view-${viewMode}`} style={viewMode === 'day' ? getCardPosition() : {}} onClick={onClick}>
            <p className="patient-name">{appointment.pacienteName}</p>
            <p className="service-name">
                <FaStethoscope /> {appointment.services?.[0]?.nombre || 'Consulta'}
            </p>
            <p className="time-range">
                <FaRegClock /> {appointment.startTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </p>
        </div>
    );
};

// --- Internal Component: AppointmentModal ---
const AppointmentModal = ({ isOpen, onClose, selectedDate, appointmentData, onSave, onDelete }) => {
    const [formData, setFormData] = useState({
        tutor: null, paciente: null, date: '', startTime: '', endTime: '', services: [], notes: ''
    });
    const [tutores, setTutores] = useState([]);
    const [pacientes, setPacientes] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const initialDate = selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        
        if (appointmentData) {
            setFormData({
                tutor: { id: appointmentData.tutorId, name: appointmentData.tutorName },
                paciente: { id: appointmentData.pacienteId, name: appointmentData.pacienteName },
                date: appointmentData.startTime.toISOString().split('T')[0],
                startTime: appointmentData.startTime.toTimeString().substring(0, 5),
                endTime: appointmentData.endTime ? appointmentData.endTime.toTimeString().substring(0, 5) : '',
                services: appointmentData.services || [],
                notes: appointmentData.notes || '',
            });
        } else {
            setFormData({
                tutor: null, paciente: null, date: initialDate, startTime: '',
                endTime: '', services: [], notes: '',
            });
        }
    }, [isOpen, selectedDate, appointmentData]);
    
    useEffect(() => {
        if (!isOpen) return;
        const fetchInitialData = async () => {
            try {
                const [tutorsSnap, servicesSnap] = await Promise.all([
                    getDocs(collection(db, 'tutores')),
                    getDocs(query(collection(db, 'productos_presenciales'), where('tipo', '==', 'servicio')))
                ]);
                setTutores(tutorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setAvailableServices(servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) { console.error("Error fetching initial data: ", error); }
        };
        fetchInitialData();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !formData.tutor?.id) { setPacientes([]); return; }
        const fetchPacientes = async () => {
            const q = query(collection(db, 'pacientes'), where('tutorId', '==', formData.tutor.id));
            const snap = await getDocs(q);
            setPacientes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchPacientes();
    }, [isOpen, formData.tutor]);
    
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleTutorChange = (e) => setFormData(prev => ({ ...prev, tutor: tutores.find(t => t.id === e.target.value), paciente: null }));
    const handlePacienteChange = (e) => setFormData(prev => ({ ...prev, paciente: pacientes.find(p => p.id === e.target.value) }));
    const handleServiceToggle = (service) => setFormData(prev => ({
        ...prev,
        services: prev.services.some(s => s.id === service.id)
            ? prev.services.filter(s => s.id !== service.id)
            : [...prev.services, { id: service.id, nombre: service.name || service.nombre, precio: service.price ?? null }]
    }));
    
    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        onSave(formData, appointmentData?.id).finally(() => setIsSubmitting(false));
    };

    if (!isOpen) return null;

    return (
        <div className="agenda-modal-overlay">
            <div className="agenda-modal-content">
                <div className="modal-header">
                    <h3>{appointmentData ? 'Editar Cita' : 'Agendar Nueva Cita'}</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group"><label>Tutor</label><select value={formData.tutor?.id || ''} onChange={handleTutorChange} required><option value="">Seleccionar tutor</option>{tutores.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                        <div className="form-group"><label>Paciente</label><select value={formData.paciente?.id || ''} onChange={handlePacienteChange} required disabled={!formData.tutor}><option value="">Seleccionar paciente</option>{pacientes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label>Fecha</label><input type="date" name="date" value={formData.date || ''} onChange={handleChange} required /></div>
                        <div className="form-group"><label>Hora Inicio</label><input type="time" name="startTime" value={formData.startTime || ''} onChange={handleChange} required /></div>
                        <div className="form-group"><label>Hora Fin (Opcional)</label><input type="time" name="endTime" value={formData.endTime || ''} onChange={handleChange} /></div>
                    </div>
                    <div className="form-group"><label>Servicios</label><div className="services-list">{availableServices.map(service => (<button type="button" key={service.id} className={`service-chip ${formData.services?.some(s => s.id === service.id) ? 'selected' : ''}`} onClick={() => handleServiceToggle(service)}>{service.name || service.nombre}</button>))}</div></div>
                    <div className="form-group"><label>Notas</label><textarea name="notes" value={formData.notes || ''} onChange={handleChange} placeholder="Añadir notas..."></textarea></div>
                    <div className="modal-footer">
                        <div>{appointmentData && <button type="button" className="btn btn-danger-outline" onClick={() => onDelete(appointmentData.id)}>Eliminar</button>}</div>
                        <div style={{display: 'flex', gap: '1rem'}}>
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Cita'}</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Main Agenda Component ---
const Agenda = () => {
    const [viewMode, setViewMode] = useState('week'); // 'week' or 'day'
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDateForModal, setSelectedDateForModal] = useState(null);
    const [selectedAppointment, setSelectedAppointment] = useState(null);

    const timeSlots = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`); // 8 AM to 8 PM

    const dateRange = useMemo(() => {
        const start = new Date(currentDate);
        if (viewMode === 'week') {
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(start.setDate(diff));
            monday.setHours(0, 0, 0, 0);
            return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
        }
        // Day view
        start.setHours(0,0,0,0);
        return [start];
    }, [currentDate, viewMode]);

    const fetchAppointments = useCallback(async () => {
        setIsLoading(true);
        try {
            const startDate = dateRange[0];
            const endDate = new Date(dateRange[dateRange.length - 1]);
            endDate.setHours(23, 59, 59, 999);
            
            const q = query(collection(db, 'citas'), where('startTime', '>=', Timestamp.fromDate(startDate)), where('startTime', '<=', Timestamp.fromDate(endDate)));
            const snapshot = await getDocs(q);
            setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), startTime: doc.data().startTime.toDate(), endTime: doc.data().endTime?.toDate() })));
        } catch (error) {
            Swal.fire('Error', 'No se pudieron cargar las citas.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [dateRange]);

    useEffect(() => { fetchAppointments(); }, [fetchAppointments]);
    
    const handleOpenModalForNew = (date) => { setSelectedDateForModal(date); setSelectedAppointment(null); setIsModalOpen(true); };
    const handleOpenModalForEdit = (appointment) => { setSelectedAppointment(appointment); setSelectedDateForModal(appointment.startTime); setIsModalOpen(true); };
    const handleCloseModal = () => setIsModalOpen(false);

    const handleSave = async (formData, appointmentId) => {
        if (!formData.tutor || !formData.paciente || !formData.startTime) {
            Swal.fire('Campos incompletos', 'Por favor, seleccione tutor, paciente y hora de inicio.', 'warning');
            return Promise.reject(new Error('Campos incompletos'));
        }
        const appointment = {
            tutorId: formData.tutor.id, tutorName: formData.tutor.name,
            pacienteId: formData.paciente.id, pacienteName: formData.paciente.name,
            startTime: Timestamp.fromDate(new Date(`${formData.date}T${formData.startTime}`)),
            endTime: formData.endTime ? Timestamp.fromDate(new Date(`${formData.date}T${formData.endTime}`)) : null,
            services: formData.services, notes: formData.notes
        };
        try {
            if (appointmentId) {
                await updateDoc(doc(db, 'citas', appointmentId), appointment);
                Swal.fire('Éxito', 'Cita actualizada correctamente.', 'success');
            } else {
                await addDoc(collection(db, 'citas'), appointment);
                Swal.fire('Éxito', 'Cita agendada correctamente.', 'success');
            }
            handleCloseModal();
            fetchAppointments();
        } catch (error) {
            console.error("Error saving appointment: ", error);
            Swal.fire('Error', 'No se pudo guardar la cita.', 'error');
            return Promise.reject(error);
        }
    };

    const handleDelete = (appointmentId) => {
        Swal.fire({
            title: '¿Eliminar esta cita?', text: "Esta acción no se puede deshacer.", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#e74c3c', cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await deleteDoc(doc(db, "citas", appointmentId));
                    Swal.fire('Eliminada', 'La cita ha sido eliminada.', 'success');
                    handleCloseModal();
                    fetchAppointments();
                } catch (error) {
                    Swal.fire('Error', 'No se pudo eliminar la cita.', 'error');
                }
            }
        });
    };

    const changeDate = (amount) => setCurrentDate(prev => { 
        const newDate = new Date(prev);
        const increment = viewMode === 'week' ? 7 : 1;
        newDate.setDate(prev.getDate() + amount * increment); 
        return newDate; 
    });

    const isToday = (someDate) => new Date().toDateString() === someDate.toDateString();

    const renderHeaderDate = () => {
        if (viewMode === 'week') {
            return `${dateRange[0].toLocaleDateString('es-AR')} - ${dateRange[6].toLocaleDateString('es-AR')}`;
        }
        return dateRange[0].toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <div className="agenda-container">
            <AppointmentModal isOpen={isModalOpen} onClose={handleCloseModal} selectedDate={selectedDateForModal} appointmentData={selectedAppointment} onSave={handleSave} onDelete={handleDelete} />
            
            <div className="page-header">
                <h1><FaRegCalendarAlt /> Agenda de Citas</h1>
                <div className="view-switcher">
                    <button className={`btn ${viewMode === 'day' ? 'btn-primary' : ''}`} onClick={() => setViewMode('day')}>Día</button>
                    <button className={`btn ${viewMode === 'week' ? 'btn-primary' : ''}`} onClick={() => setViewMode('week')}>Semana</button>
                </div>
                <div className="week-navigator">
                    <button onClick={() => changeDate(-1)}>&lt;</button>
                    <button className="today-btn" onClick={() => setCurrentDate(new Date())}>Hoy</button>
                    <span className="week-display">{renderHeaderDate()}</span>
                    <button onClick={() => changeDate(1)}>&gt;</button>
                </div>
            </div>

            {isLoading ? <p>Cargando...</p> : (
                <div className={`agenda-grid view-${viewMode}`}>
                    <div className="time-column">
                        <div className="time-slot-header">Hora</div>
                        {timeSlots.map(time => <div key={time} className="time-slot">{time}</div>)}
                    </div>
                    {dateRange.map(day => (
                        <div key={day.toISOString()} className="day-column">
                            <div className={`day-header ${isToday(day) ? 'current-day' : ''}`} onClick={() => handleOpenModalForNew(day)}>
                                <span className="day-name">{day.toLocaleDateString('es-AR', { weekday: 'short' })}</span>
                                <span className="day-number">{day.getDate()}</span>
                            </div>
                            <div className="appointments-area">
                                {appointments
                                    .filter(a => a.startTime.toDateString() === day.toDateString())
                                    .sort((a, b) => a.startTime - b.startTime)
                                    .map(app => <AppointmentCard key={app.id} appointment={app} onClick={() => handleOpenModalForEdit(app)} viewMode={viewMode}/>)
                                }
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Agenda;

