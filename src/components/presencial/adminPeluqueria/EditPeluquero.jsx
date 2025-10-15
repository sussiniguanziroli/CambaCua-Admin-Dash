import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';

const EditPeluquero = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', specialties: '', isActive: true });
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const fetchPeluquero = useCallback(async () => {
        setIsLoading(true);
        try {
            const docRef = doc(db, 'peluqueros', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setFormData({ ...data, specialties: (data.specialties || []).join(', ') });
            } else {
                Swal.fire('Error', 'Peluquero no encontrado.', 'error').then(() => navigate('/admin/peluqueros'));
            }
        } catch (error) { Swal.fire('Error', 'No se pudieron cargar los datos.', 'error'); } 
        finally { setIsLoading(false); }
    }, [id, navigate]);

    useEffect(() => { fetchPeluquero(); }, [fetchPeluquero]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await updateDoc(doc(db, 'peluqueros', id), {
                ...formData,
                specialties: formData.specialties.split(',').map(s => s.trim()).filter(Boolean),
            });
            Swal.fire('Éxito', 'Peluquero actualizado.', 'success');
            navigate('/admin/peluqueros');
        } catch (error) { Swal.fire('Error', 'No se pudo actualizar.', 'error'); } 
        finally { setIsSubmitting(false); }
    };

    if (isLoading) return <p className="loading-message">Cargando...</p>;

    return (
        <div className="tutor-form-container">
            <h2 className="tutor-form-title">Editar Peluquero</h2>
            <form onSubmit={handleSubmit} className="tutor-styled-form">
                <fieldset className="tutor-form-fieldset">
                    <legend>Información del Profesional</legend>
                    <div className="tutor-form-group"><label htmlFor="name">Nombre</label><input id="name" name="name" type="text" value={formData.name} onChange={handleChange} required /></div>
                    <div className="tutor-form-row">
                        <div className="tutor-form-group"><label htmlFor="phone">Teléfono</label><input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} required /></div>
                        <div className="tutor-form-group"><label htmlFor="email">Email</label><input id="email" name="email" type="email" value={formData.email} onChange={handleChange} /></div>
                    </div>
                    <div className="tutor-form-group"><label htmlFor="specialties">Especialidades (separadas por coma)</label><input id="specialties" name="specialties" type="text" value={formData.specialties} onChange={handleChange} /></div>
                    <div className="tutor-form-group tutor-checkbox-group"><input id="isActive" name="isActive" type="checkbox" checked={formData.isActive} onChange={handleChange} /><label htmlFor="isActive">Activo</label></div>
                </fieldset>
                <div className="tutor-form-actions"><button type="submit" className="tutor-form-submit-btn" disabled={isSubmitting}>{isSubmitting ? 'Actualizando...' : 'Actualizar'}</button></div>
            </form>
        </div>
    );
};

export default EditPeluquero;