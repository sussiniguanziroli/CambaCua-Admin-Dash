import React, { useState, useEffect } from 'react';
import { storage } from '../../../firebase/config';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import Swal from 'sweetalert2';

import { NOTE_TYPE_NOVEDAD, NOTE_TYPE_CLINICA, isNovedad } from '../../utils/noteTypes';

const ClinicalNoteModal = ({ isOpen, onClose, onSave, note, noteIndex, pacienteId, patientName, tutorName }) => {
    const [noteType, setNoteType] = useState(NOTE_TYPE_CLINICA);
    const [formData, setFormData] = useState({ reason: '', diagnosis: '', treatment: '', comment: '' });
    const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
    const [existingMedia, setExistingMedia] = useState([]);
    const [filesToUpload, setFilesToUpload] = useState([]);
    const [filesToDelete, setFilesToDelete] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Lógica de respaldo para mostrar nombres si vienen dentro del objeto nota (caso Monitor)
    const displayPatient = patientName || note?.pacienteName;
    const displayTutor = tutorName || note?.tutorName;

    const novedad = noteType === NOTE_TYPE_NOVEDAD;

    useEffect(() => {
        if (isOpen) {
            let defaultDate = new Date().toISOString().split('T')[0];

            if (note) {
                // Prioridad: Si existe el Timestamp original de Firebase
                if (note.createdAt && typeof note.createdAt.toDate === 'function') {
                    defaultDate = note.createdAt.toDate().toISOString().split('T')[0];
                }
                // Respaldo: Si viene como string formateado "DD/MM/YYYY"
                else if (typeof note.date === 'string' && note.date.includes('/')) {
                    const parts = note.date.split('/');
                    if (parts.length === 3) {
                        defaultDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                }
            }

            setNoteType(isNovedad(note) ? NOTE_TYPE_NOVEDAD : NOTE_TYPE_CLINICA);
            setFormData({
                reason: note?.reason || '',
                diagnosis: note?.diagnosis || '',
                treatment: note?.treatment || '',
                comment: note?.comment || '',
            });
            setNoteDate(defaultDate);
            setExistingMedia(note?.media || []);
            setFilesToUpload([]);
            setFilesToDelete([]);
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    }, [isOpen, note]);

    const handleFileChange = (e) => {
        if (e.target.files) {
            setFilesToUpload(prev => [...prev, ...Array.from(e.target.files)]);
        }
    };

    const removeNewFile = (index) => {
        setFilesToUpload(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingFile = (file) => {
        setFilesToDelete(prev => [...prev, file]);
        setExistingMedia(prev => prev.filter(mediaFile => mediaFile.url !== file.url));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setUploadProgress(0);

        try {
            for (const fileToDelete of filesToDelete) {
                try {
                    const fileRef = ref(storage, fileToDelete.url);
                    await deleteObject(fileRef);
                } catch (error) {
                    console.warn("No se pudo eliminar archivo físico:", error);
                }
            }

            const uploadPromises = filesToUpload.map(file => {
                const noteId = note?.id || `${Date.now()}`;
                const storageRef = ref(storage, `clinicalHistory/${pacienteId}/${noteId}/${file.name}`);
                const uploadTask = uploadBytesResumable(storageRef, file);

                return new Promise((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setUploadProgress(progress);
                        },
                        (error) => reject(error),
                        async () => {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve({ url: downloadURL, name: file.name, type: file.type });
                        }
                    );
                });
            });

            const newMediaFiles = await Promise.all(uploadPromises);
            const finalMedia = [...existingMedia, ...newMediaFiles];

            const [year, month, day] = noteDate.split('-').map(Number);
            const dateToSave = new Date(year, month - 1, day, 12, 0, 0);

            const fields = novedad
                ? { reason: formData.reason, comment: formData.comment }
                : { reason: formData.reason, diagnosis: formData.diagnosis, treatment: formData.treatment };

            await onSave({
                ...fields,
                type: noteType,
                media: finalMedia,
                createdAt: dateToSave
            }, note, noteIndex);

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo guardar la nota.', 'error');
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const typeLabel = novedad ? 'Novedad' : 'Nota';

    return (
        <div className="agenda-modal-overlay">
            <div className="agenda-modal-content">
                <div className="modal-header">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <h3 style={{ margin: 0 }}>{note ? `Editar ${typeLabel}` : `Agregar ${typeLabel}`}</h3>
                        {/* AQUI ESTÁ EL NOMBRE Y TUTOR EN EL MODAL DE EDICIÓN */}
                        {displayPatient && (
                            <span style={{ fontSize: '0.9em', color: '#4a4a4a', fontWeight: '500' }}>
                                {displayPatient} {displayTutor ? <span style={{ color: '#888', fontWeight: 'normal' }}>({displayTutor})</span> : ''}
                            </span>
                        )}
                    </div>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="note-type-toggle" role="tablist">
                    <button type="button" role="tab" aria-selected={!novedad} className={!novedad ? 'active' : ''} disabled={!!note || isSubmitting} onClick={() => setNoteType(NOTE_TYPE_CLINICA)}>Nota clínica</button>
                    <button type="button" role="tab" aria-selected={novedad} className={novedad ? 'active novedad' : ''} disabled={!!note || isSubmitting} onClick={() => setNoteType(NOTE_TYPE_NOVEDAD)}>Comentario / Novedades</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>{novedad ? 'Título' : 'Motivo'}</label>
                        <input type="text" value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} placeholder={novedad ? 'Ej: Come mejor, sigue con vómitos...' : ''} required />
                    </div>
                    <div className="form-group">
                        <label>{novedad ? 'Fecha' : 'Fecha de Nota'}</label>
                        <input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} required />
                    </div>
                    {novedad ? (
                        <div className="form-group">
                            <label>Comentario / Novedad</label>
                            <textarea value={formData.comment} onChange={(e) => setFormData({...formData, comment: e.target.value})} placeholder="Lo que cuenta el tutor sobre cómo evoluciona la mascota" required></textarea>
                        </div>
                    ) : (
                        <>
                            <div className="form-group">
                                <label>Diagnóstico</label>
                                <textarea value={formData.diagnosis} onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}></textarea>
                            </div>
                            <div className="form-group">
                                <label>Tratamiento</label>
                                <textarea value={formData.treatment} onChange={(e) => setFormData({...formData, treatment: e.target.value})}></textarea>
                            </div>
                        </>
                    )}
                    <div className="form-group">
                        <label>Adjuntar Archivos</label>
                        <input type="file" multiple onChange={handleFileChange} />
                    </div>

                    {(existingMedia.length > 0 || filesToUpload.length > 0) && (
                        <div className="file-preview-list">
                            {existingMedia.map((file, i) => (
                                <div key={`existing-${i}`} className="file-preview-item">
                                    <span>{file.name}</span>
                                    <button type="button" onClick={() => removeExistingFile(file)}>&times;</button>
                                </div>
                            ))}
                            {filesToUpload.map((file, i) => (
                                <div key={`new-${i}`} className="file-preview-item new">
                                    <span>{file.name} (Nuevo)</span>
                                    <button type="button" onClick={() => removeNewFile(i)}>&times;</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {isSubmitting && (
                        <div className="upload-progress-bar">
                            <div style={{ width: `${uploadProgress}%`, transition: 'width 0.3s' }}></div>
                        </div>
                    )}

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Guardando...' : `Guardar ${typeLabel}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClinicalNoteModal;
