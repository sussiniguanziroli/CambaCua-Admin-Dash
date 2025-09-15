import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';

const EditTutor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tutorData, setTutorData] = useState({ name: '', email: '', phone: '', address: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchTutor = useCallback(async () => {
        setIsLoading(true);
        try {
            const tutorRef = doc(db, 'tutores', id);
            const tutorSnap = await getDoc(tutorRef);
            if (tutorSnap.exists()) {
                setTutorData(tutorSnap.data());
            } else {
                Swal.fire('Error', 'Tutor no encontrado.', 'error');
                navigate('/admin/tutores');
            }
        } catch (error) {
            Swal.fire('Error', 'No se pudieron cargar los datos del tutor.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchTutor();
    }, [fetchTutor]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setTutorData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await updateDoc(doc(db, 'tutores', id), tutorData);
            Swal.fire('Éxito', 'Tutor actualizado correctamente.', 'success');
            navigate('/admin/tutores');
        } catch (error) {
            console.error("Error updating tutor: ", error);
            Swal.fire('Error', 'No se pudo actualizar el tutor.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <p className="loading-message">Cargando datos del tutor...</p>;
    }

    return (
        <div className="presential-form-container">
            <h2>Editar Tutor</h2>
            <form onSubmit={handleSubmit} className="presential-form">
                <div className="form-group">
                    <label htmlFor="name">Nombre Completo</label>
                    <input id="name" name="name" type="text" value={tutorData.name} onChange={handleChange} required />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input id="email" name="email" type="email" value={tutorData.email} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="phone">Teléfono</label>
                        <input id="phone" name="phone" type="tel" value={tutorData.phone} onChange={handleChange} required />
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="address">Dirección</label>
                    <input id="address" name="address" type="text" value={tutorData.address} onChange={handleChange} />
                </div>
                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Actualizando...' : 'Actualizar Tutor'}
                </button>
            </form>
        </div>
    );
};

export default EditTutor;
