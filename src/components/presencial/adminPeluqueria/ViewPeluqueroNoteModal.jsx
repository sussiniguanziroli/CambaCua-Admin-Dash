import React from 'react';

const ViewPeluqueroNoteModal = ({ isOpen, onClose, note, onEdit }) => {
    if (!isOpen || !note) return null;

    return (
        <div className="agenda-modal-overlay">
            <div className="agenda-modal-content view-note-modal">
                <div className="modal-header">
                    <h3>{note.title}</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="note-details">
                    <p className="note-date"><strong>Fecha:</strong> {note.createdAt.toDate().toLocaleString('es-AR')}</p>
                    <div className="note-section">
                        <h4>Descripción</h4>
                        <p>{note.description || 'Sin descripción.'}</p>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
                    <button type="button" className="btn btn-primary" onClick={onEdit}>Editar</button>
                </div>
            </div>
        </div>
    );
};

export default ViewPeluqueroNoteModal;