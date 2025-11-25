import React from 'react';
import { FaFilePdf, FaFileWord, FaFileAlt, FaImage } from 'react-icons/fa';

const ViewClinicalNoteModal = ({ isOpen, onClose, onEdit, note, patientName, tutorName }) => {
    if (!isOpen || !note) return null;

    // Lógica robusta: Toma el nombre de las props (si viene de Perfil) o de la nota (si viene de Monitor)
    const displayPatient = patientName || note.pacienteName;
    const displayTutor = tutorName || note.tutorName;

    const getFileIcon = (fileType) => {
        if (fileType.startsWith('image/')) return <FaImage />;
        if (fileType === 'application/pdf') return <FaFilePdf />;
        if (fileType.includes('wordprocessing')) return <FaFileWord />;
        return <FaFileAlt />;
    };

    return (
        <div className="agenda-modal-overlay">
            <div className="agenda-modal-content view-note-modal">
                <div className="modal-header">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <h3 style={{ margin: 0 }}>Detalle de Nota Clínica</h3>
                        {/* AQUI ESTÁ EL NOMBRE Y TUTOR SIEMPRE VISIBLE */}
                        {displayPatient && (
                            <span style={{ fontSize: '0.9em', color: '#4a4a4a', fontWeight: '500' }}>
                                {displayPatient} {displayTutor ? <span style={{ color: '#888', fontWeight: 'normal' }}>({displayTutor})</span> : ''}
                            </span>
                        )}
                    </div>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="view-note-body">
                    <div className="info-section">
                        <small>Fecha</small>
                        <p>{note.date}</p>
                    </div>
                    <div className="info-section">
                        <small>Motivo de Consulta</small>
                        <p>{note.reason || 'N/A'}</p>
                    </div>
                    <div className="info-section">
                        <small>Diagnóstico</small>
                        <p>{note.diagnosis || 'N/A'}</p>
                    </div>
                    <div className="info-section">
                        <small>Tratamiento</small>
                        <p>{note.treatment || 'N/A'}</p>
                    </div>
                    {note.media && note.media.length > 0 && (
                        <div className="info-section">
                            <small>Archivos Adjuntos</small>
                            <div className="media-gallery">
                                {note.media.map((file, index) => (
                                    <a href={file.url} target="_blank" rel="noopener noreferrer" key={index} className="media-item">
                                        {file.type.startsWith('image/') ? (
                                            <img src={file.url} alt={file.name} className="media-thumbnail" />
                                        ) : (
                                            <div className="media-file-icon">{getFileIcon(file.type)}</div>
                                        )}
                                        <span className="media-name">{file.name}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
                    <button type="button" className="btn btn-primary" onClick={onEdit}>Editar Nota</button>
                </div>
            </div>
        </div>
    );
};

export default ViewClinicalNoteModal;