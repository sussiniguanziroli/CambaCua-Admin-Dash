import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';

const AddPeluquero = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', specialties: '', isActive: true,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'peluqueros'), {
                ...formData,
                specialties: formData.specialties.split(',').map(s => s.trim()).filter(Boolean),
                createdAt: serverTimestamp(),
            });
            Swal.fire('Éxito', 'Peluquero agregado correctamente.', 'success');
            navigate('/admin/peluqueros');
        } catch (error) {
            Swal.fire('Error', 'No se pudo agregar el peluquero.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="tutor-form-container">
            <h2 className="tutor-form-title">Agregar Nuevo Peluquero</h2>
            <form onSubmit={handleSubmit} className="tutor-styled-form">
                <fieldset className="tutor-form-fieldset">
                    <legend>Información del Profesional</legend>
                    <div className="tutor-form-group"><label htmlFor="name">Nombre Completo</label><input id="name" name="name" type="text" value={formData.name} onChange={handleChange} required /></div>
                    <div className="tutor-form-row">
                        <div className="tutor-form-group"><label htmlFor="phone">Teléfono</label><input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} required /></div>
                        <div className="tutor-form-group"><label htmlFor="email">Email (Opcional)</label><input id="email" name="email" type="email" value={formData.email} onChange={handleChange} /></div>
                    </div>
                    <div className="tutor-form-group"><label htmlFor="specialties">Especialidades (separadas por coma)</label><input id="specialties" name="specialties" type="text" value={formData.specialties} onChange={handleChange} placeholder="Ej: Corte de raza, Peluquería felina"/></div>
                    <div className="tutor-form-group tutor-checkbox-group"><input id="isActive" name="isActive" type="checkbox" checked={formData.isActive} onChange={handleChange} /><label htmlFor="isActive">Activo</label></div>
                </fieldset>
                <div className="tutor-form-actions"><button type="submit" className="tutor-form-submit-btn" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Agregar Peluquero'}</button></div>
            </form>
        </div>
    );
};

export default AddPeluquero;