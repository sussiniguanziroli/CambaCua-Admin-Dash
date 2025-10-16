import React from 'react';
import { FaFilePdf, FaFileWord, FaFileAlt } from 'react-icons/fa';

const FilePreview = ({ file }) => {
    const isImage = file.type && file.type.startsWith('image/');
    
    if (isImage) {
        return <a href={file.url} target="_blank" rel="noopener noreferrer"><img src={file.url} alt={file.name} className="file-thumbnail" /></a>;
    }

    const getFileIcon = () => {
        if (file.type === 'application/pdf') return <FaFilePdf />;
        if (file.type.includes('word')) return <FaFileWord />;
        return <FaFileAlt />;
    };

    return (
        <a href={file.url} target="_blank" rel="noopener noreferrer" className="file-icon-link">
            <div className="file-icon">{getFileIcon()}</div>
            <span>{file.name}</span>
        </a>
    );
};

const ViewNotaPeluqueriaModal = ({ isOpen, onClose, onEdit, note }) => {
    if (!isOpen || !note) return null;

    return (
        <div className="agenda-modal-overlay">
            <div className="agenda-modal-content view-note-modal">
                <div className="modal-header">
                    <h3>{note.title}</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="note-details">
                    <p className="note-date"><strong>Fecha:</strong> {note.date}</p>
                    <div className="note-section">
                        <h4>Descripción</h4>
                        <p>{note.description || 'Sin descripción.'}</p>
                    </div>

                    {note.media && note.media.length > 0 && (
                        <div className="note-section">
                            <h4>Archivos Adjuntos</h4>
                            <div className="media-gallery">
                                {note.media.map((file, index) => (
                                    <FilePreview key={index} file={file} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
                    <button type="button" className="btn btn-primary" onClick={onEdit}>Editar</button>
                </div>
            </div>
        </div>
    );
};

export default ViewNotaPeluqueriaModal;