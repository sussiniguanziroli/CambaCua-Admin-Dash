import React, { useState, useEffect } from 'react';

const EditPeluqueroNoteModal = ({ isOpen, onClose, note, onSave }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (note) {
            setTitle(note.title);
            setDescription(note.description);
        }
    }, [note]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ title, description }, note);
    };

    if (!isOpen) return null;

    return (
        <div className="agenda-modal-overlay">
            <div className="agenda-modal-content">
                <div className="modal-header">
                    <h3>Editar Nota</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Título</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Descripción</label>
                        <textarea rows="5" value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary">Actualizar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditPeluqueroNoteModal;