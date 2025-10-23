import React, { useState, useEffect } from 'react';
import { storage } from '../../../firebase/config';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import Swal from 'sweetalert2';

const CreateNotaPeluqueriaModal = ({ isOpen, onClose, onSave, pacienteId }) => {
    const [formData, setFormData] = useState({ title: '', description: '' });
    const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
    const [filesToUpload, setFilesToUpload] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setFormData({ title: '', description: '' });
            setNoteDate(new Date().toISOString().split('T')[0]);
            setFilesToUpload([]);
        }
    }, [isOpen]);

    const handleFileChange = (e) => {
        setFilesToUpload(prev => [...prev, ...Array.from(e.target.files)]);
    };

    const removeNewFile = (index) => {
        setFilesToUpload(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setUploadProgress(0);

        try {
            const uploadPromises = filesToUpload.map(file => {
                const noteId = `${Date.now()}`;
                const storageRef = ref(storage, `peluqueria_notas_files/${pacienteId}/${noteId}/${file.name}`);
                const uploadTask = uploadBytesResumable(storageRef, file);
                
                return new Promise((resolve, reject) => {
                    uploadTask.on('state_changed', 
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setUploadProgress(progress / filesToUpload.length + (uploadPromises.indexOf(this) * (100 / filesToUpload.length)));
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
            
            await onSave({ ...formData, media: newMediaFiles, date: noteDate });

        } catch (error) {
            Swal.fire('Error', 'No se pudo guardar la nota o subir los archivos.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="agenda-modal-overlay">
            <div className="agenda-modal-content">
                <div className="modal-header"><h3>Agregar Nota de Peluquería</h3><button className="close-btn" onClick={onClose}>&times;</button></div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group"><label>Título</label><input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required /></div>
                    <div className="form-group">
                        <label>Fecha de Nota</label>
                        <input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} required />
                    </div>
                    <div className="form-group"><label>Descripción</label><textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}></textarea></div>
                    <div className="form-group"><label>Adjuntar Archivos</label><input type="file" multiple onChange={handleFileChange} /></div>
                    
                    {filesToUpload.length > 0 && (
                        <div className="file-preview-list">
                            {filesToUpload.map((file, i) => <div key={i} className="file-preview-item new"><span>{file.name}</span><button type="button" onClick={() => removeNewFile(i)}>&times;</button></div>)}
                        </div>
                    )}
                    
                    {isSubmitting && <div className="upload-progress-bar"><div style={{ width: `${uploadProgress}%` }}></div></div>}
                    
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Nota'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateNotaPeluqueriaModal;