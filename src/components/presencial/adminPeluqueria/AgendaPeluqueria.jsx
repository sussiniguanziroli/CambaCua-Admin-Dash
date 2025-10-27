import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../../firebase/config';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, Timestamp, query, where } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { FaRegCalendarAlt, FaRegClock, FaDog, FaUser } from 'react-icons/fa';

const GroomingAppointmentCard = ({ appointment, onClick, viewMode }) => {
    const getCardPosition = () => {
        if (viewMode !== 'day' || !appointment.startTime) return {};
        const startHour = appointment.startTime.getHours();
        const startMinute = appointment.startTime.getMinutes();
        const top = (startHour - 8) * 60 + startMinute;
        return { top: `${top}px`, height: '60px' }; // Default height for grooming appointments
    };

    return (
        <div
            className={`appointment-card view-${viewMode}`}
            style={getCardPosition()}
            onClick={onClick}
        >
            <p className="patient-name">{appointment.pacienteName}</p>
            <p className="service-name">
                <FaDog /> {(appointment.services && appointment.services.length > 0) ? appointment.services.map(s => s.name).join(', ') : 'Turno'}
            </p>
            <p className="time-range">
                <FaRegClock /> {appointment.startTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </p>
        </div>
    );
};

const GroomingAppointmentModal = ({ isOpen, onClose, selectedDate, appointmentData, onSave, onDelete }) => {
    const [formData, setFormData] = useState({ tutor: null, paciente: null, peluquero: null, date: '', startTime: '', services: [], notes: '' });
    
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
        const initialDate = selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        if (appointmentData) {
            setFormData({
                tutor: { id: appointmentData.tutorId, name: appointmentData.tutorName },
                paciente: { id: appointmentData.pacienteId, name: appointmentData.pacienteName },
                peluquero: { id: appointmentData.peluqueroId, name: appointmentData.peluqueroName },
                date: appointmentData.startTime.toISOString().split('T')[0],
                startTime: appointmentData.startTime.toTimeString().substring(0, 5),
                services: appointmentData.services || [],
                notes: appointmentData.notes || '',
            });
            setTutorInput(appointmentData.tutorName || "");
            setPacienteInput(appointmentData.pacienteName || "");
        } else { 
            setFormData({ tutor: null, paciente: null, peluquero: null, date: initialDate, startTime: '', services: [], notes: '' }); 
            setTutorInput("");
            setPacienteInput("");
        }
        setSearchBy("tutor");
    }, [isOpen, selectedDate, appointmentData]);
    
    useEffect(() => {
        if (!isOpen) return;
        const fetchInitialData = async () => {
            try {
                const [tutorsSnap, pacientesSnap, servicesSnap, peluquerosSnap] = await Promise.all([
                    getDocs(collection(db, 'tutores')),
                    getDocs(collection(db, 'pacientes')),
                    getDocs(query(collection(db, 'productos_presenciales'), where('category', '==', 'peluqueria'))),
                    getDocs(query(collection(db, 'peluqueros'), where('isActive', '==', true)))
                ]);
                
                const tutorsList = tutorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const pacientesList = pacientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                tutorsList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                pacientesList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

                setAllTutores(tutorsList);
                setAllPacientes(pacientesList);
                setFilteredTutores(tutorsList);
                setFilteredPacientes(pacientesList);

                setAvailableServices(servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setPeluqueros(peluquerosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) { console.error("Error fetching initial data: ", error); }
        };
        fetchInitialData();
    }, [isOpen]);

    const handleTutorInput = (e) => {
        const value = e.target.value;
        setTutorInput(value);
        setFormData(prev => ({...prev, tutor: null, paciente: null}));
        setPacienteInput("");
        setIsTutorDropdownOpen(true);
        
        if (value) {
            setFilteredTutores(
                allTutores.filter(t => t.name.toLowerCase().includes(value.toLowerCase()))
            );
        } else {
            setFilteredTutores(allTutores);
        }
    };
    
    const handlePacienteInput = (e) => {
        const value = e.target.value;
        setPacienteInput(value);
        setFormData(prev => ({...prev, paciente: null}));
        setIsPacienteDropdownOpen(true);

        const sourceList = (searchBy === 'tutor' && formData.tutor)
            ? allPacientes.filter(p => p.tutorId === formData.tutor.id)
            : allPacientes;

        if (value) {
            setFilteredPacientes(
                sourceList.filter(p => p.name.toLowerCase().includes(value.toLowerCase()))
            );
        } else {
            setFilteredPacientes(sourceList);
        }
    };

    const selectTutor = (tutor) => {
        setTutorInput(tutor.name);
        setFormData(prev => ({ ...prev, tutor, paciente: null }));
        setPacienteInput("");
        setIsTutorDropdownOpen(false);
        setFilteredPacientes(allPacientes.filter(p => p.tutorId === tutor.id));
    };
    
    const selectPaciente = (paciente) => {
        setPacienteInput(paciente.name);
        setIsPacienteDropdownOpen(false);
        
        if (searchBy === 'patient') {
            const correspondingTutor = allTutores.find(t => t.id === paciente.tutorId);
            if (correspondingTutor) {
                setTutorInput(correspondingTutor.name);
                setFormData(prev => ({ ...prev, paciente, tutor: correspondingTutor }));
            } else {
                setFormData(prev => ({ ...prev, paciente, tutor: null }));
                setTutorInput("");
            }
        } else {
            setFormData(prev => ({ ...prev, paciente }));
        }
    };

    const handleSearchToggle = () => {
        setSearchBy(prev => (prev === 'tutor' ? 'patient' : 'tutor'));
        setFormData({ ...formData, tutor: null, paciente: null });
        setTutorInput("");
        setPacienteInput("");
        setFilteredTutores(allTutores);
        setFilteredPacientes(allPacientes);
    };

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handlePeluqueroChange = (e) => setFormData(prev => ({ ...prev, peluquero: peluqueros.find(p => p.id === e.target.value) }));
    const handleServiceToggle = (service) => setFormData(prev => ({...prev, services: prev.services.some(s => s.id === service.id) ? prev.services.filter(s => s.id !== service.id) : [...prev.services, { id: service.id, name: service.name }] }));
    
    const handleSubmit = (e) => { 
        e.preventDefault(); 
        if (!formData.tutor || !formData.paciente) {
            Swal.fire("Datos incompletos", "Debe seleccionar un tutor y un paciente válidos.", "warning");
            return;
        }
        setIsSubmitting(true); 
        onSave(formData, appointmentData?.id).finally(() => setIsSubmitting(false)); 
    };
    
    if (!isOpen) return null;

    return (
        <div className="agenda-modal-overlay">
            <div className="agenda-modal-content">
                <div className="modal-header"><h3>{appointmentData ? 'Editar Turno' : 'Nuevo Turno de Peluquería'}</h3><button className="close-btn" onClick={onClose}>&times;</button></div>
                <form onSubmit={handleSubmit} autoComplete="off">
                    
                    <div className="form-group">
                        <label>Buscar por</label>
                        <div className="search-by-toggle">
                            <button type="button" className={`btn ${searchBy === 'tutor' ? 'btn-primary' : 'btn-outline'}`} onClick={searchBy === 'tutor' ? null : handleSearchToggle}><FaUser/> Tutor</button>
                            <button type="button" className={`btn ${searchBy === 'patient' ? 'btn-primary' : 'btn-outline'}`} onClick={searchBy === 'patient' ? null : handleSearchToggle}><FaDog/> Paciente</button>
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
                                onBlur={() => setTimeout(() => setIsTutorDropdownOpen(false), 200)}
                                placeholder="Buscar o seleccionar tutor..."
                                required
                                disabled={searchBy === 'patient'}
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
                                onBlur={() => setTimeout(() => setIsPacienteDropdownOpen(false), 200)}
                                placeholder={searchBy === 'tutor' && !formData.tutor ? "Seleccione un tutor" : "Buscar o seleccionar paciente..."}
                                required
                                disabled={searchBy === 'tutor' && !formData.tutor}
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
                                    <li className="no-results">No se encontraron pacientes</li>
                                )}
                                </ul>
                            )}
                        </div>
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label>Peluquero/a</label>
                            <select value={formData.peluquero?.id || ''} onChange={handlePeluqueroChange} required>
                                <option value="">Seleccionar</option>
                                {peluqueros.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label>Fecha</label>
                            <input type="date" name="date" value={formData.date || ''} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Hora</label>
                            <input type="time" name="startTime" value={formData.startTime || ''} onChange={handleChange} required />
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label>Servicios</label>
                        <div className="services-list">
                            {availableServices.map(service => (
                                <button type="button" key={service.id} className={`service-chip ${formData.services?.some(s => s.id === service.id) ? 'selected' : ''}`} onClick={() => handleServiceToggle(service)}>
                                    {service.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label>Notas</label>
                        <textarea name="notes" value={formData.notes || ''} onChange={handleChange}></textarea>
                    </div>
                    
                    <div className="modal-footer">
                        <div>{appointmentData && <button type="button" className="btn btn-danger-outline" onClick={() => onDelete(appointmentData)}>Eliminar</button>}</div>
                        <div style={{display: 'flex', gap: '1rem'}}>
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AgendaPeluqueria = () => {
    const [viewMode, setViewMode] = useState('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDateForModal, setSelectedDateForModal] = useState(null);
    const [selectedAppointment, setSelectedAppointment] = useState(null);

    const timeSlots = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`);

    const dateRange = useMemo(() => {
        const start = new Date(currentDate);
        if (viewMode === 'week') { const day = start.getDay(); const diff = start.getDate() - day + (day === 0 ? -6 : 1); const monday = new Date(start.setDate(diff)); monday.setHours(0, 0, 0, 0); return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; }); }
        start.setHours(0,0,0,0); return [start];
    }, [currentDate, viewMode]);

    const fetchAppointments = useCallback(async () => {
        setIsLoading(true);
        try {
            const startDate = dateRange[0]; const endDate = new Date(dateRange[dateRange.length - 1]); endDate.setHours(23, 59, 59, 999);
            const q = query(collection(db, 'turnos_peluqueria'), where('startTime', '>=', Timestamp.fromDate(startDate)), where('startTime', '<=', Timestamp.fromDate(endDate)));
            const snapshot = await getDocs(q);
            const fetchedAppointments = snapshot.docs.map(doc => {
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
        } catch (error) { Swal.fire('Error', 'No se pudieron cargar los turnos.', 'error'); } 
        finally { setIsLoading(false); }
    }, [dateRange]);

    useEffect(() => { fetchAppointments(); }, [fetchAppointments]);
    
    const handleOpenModalForNew = (date) => { setSelectedDateForModal(date); setSelectedAppointment(null); setIsModalOpen(true); };
    const handleOpenModalForEdit = (appointment) => { setSelectedAppointment(appointment); setSelectedDateForModal(appointment.startTime); setIsModalOpen(true); };
    const handleCloseModal = () => setIsModalOpen(false);

    const handleSave = async (formData, appointmentId) => {
        if (!formData.tutor || !formData.paciente || !formData.peluquero || !formData.startTime) { Swal.fire('Campos incompletos', 'Tutor, paciente, peluquero y hora son requeridos.', 'warning'); return Promise.reject(); }
        const appointment = {
            tutorId: formData.tutor.id, tutorName: formData.tutor.name,
            pacienteId: formData.paciente.id, pacienteName: formData.paciente.name,
            peluqueroId: formData.peluquero.id, peluqueroName: formData.peluquero.name,
            startTime: Timestamp.fromDate(new Date(`${formData.date}T${formData.startTime}`)),
            services: formData.services, notes: formData.notes, status: 'Agendado'
        };
        try {
            if (appointmentId) { await updateDoc(doc(db, 'turnos_peluqueria', appointmentId), appointment); } 
            else { await addDoc(collection(db, 'turnos_peluqueria'), appointment); }
            Swal.fire('Éxito', 'Turno guardado.', 'success');
            handleCloseModal(); fetchAppointments();
        } catch (error) { Swal.fire('Error', 'No se pudo guardar el turno.', 'error'); return Promise.reject(error); }
    };

    const handleDelete = (appointment) => {
        Swal.fire({ title: '¿Eliminar turno?', text: "Esta acción no se puede deshacer.", icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' })
        .then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await deleteDoc(doc(db, "turnos_peluqueria", appointment.id));
                    Swal.fire('Eliminado', 'El turno ha sido eliminado.', 'success');
                    handleCloseModal(); fetchAppointments();
                } catch (error) { Swal.fire('Error', 'No se pudo eliminar el turno.', 'error'); }
            }
        });
    };

    const changeDate = (amount) => setCurrentDate(prev => { const newDate = new Date(prev); newDate.setDate(prev.getDate() + (viewMode === 'week' ? 7 : 1) * amount); return newDate; });
    const isToday = (someDate) => new Date().toDateString() === someDate.toDateString();
    const renderHeaderDate = () => viewMode === 'week' ? `${dateRange[0].toLocaleDateString('es-AR')} - ${dateRange[6].toLocaleDateString('es-AR')}` : dateRange[0].toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="agenda-container">
            <GroomingAppointmentModal isOpen={isModalOpen} onClose={handleCloseModal} selectedDate={selectedDateForModal} appointmentData={selectedAppointment} onSave={handleSave} onDelete={handleDelete} />
            <div className="page-header"><h1><FaRegCalendarAlt /> Agenda de Peluquería</h1><div className="view-switcher"><button className={`btn ${viewMode === 'day' ? 'btn-primary' : ''}`} onClick={() => setViewMode('day')}>Día</button><button className={`btn ${viewMode === 'week' ? 'btn-primary' : ''}`} onClick={() => setViewMode('week')}>Semana</button></div><div className="week-navigator"><button onClick={() => changeDate(-1)}>&lt;</button><button className="today-btn" onClick={() => setCurrentDate(new Date())}>Hoy</button><span className="week-display">{renderHeaderDate()}</span><button onClick={() => changeDate(1)}>&gt;</button></div></div>
            {isLoading ? <p>Cargando...</p> : (
                <div className={`agenda-grid view-${viewMode}`}>
                    <div className="time-column"><div className="time-slot-header">Hora</div>{timeSlots.map(time => <div key={time} className="time-slot">{time}</div>)}</div>
                    {dateRange.map(day => (
                        <div key={day.toISOString()} className="day-column">
                            <div className={`day-header ${isToday(day) ? 'current-day' : ''}`} onClick={() => handleOpenModalForNew(day)}><span className="day-name">{day.toLocaleDateString('es-AR', { weekday: 'short' })}</span><span className="day-number">{day.getDate()}</span></div>
                            <div className="appointments-area">
                                {appointments
                                    .filter(a => a.startTime.toDateString() === day.toDateString())
                                    .sort((a, b) => a.startTime - b.startTime)
                                    .map(app => (
                                        <GroomingAppointmentCard
                                            key={app.id}
                                            appointment={app}
                                            onClick={() => handleOpenModalForEdit(app)}
                                            viewMode={viewMode}
                                        />
                                    ))
                                }
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AgendaPeluqueria;