import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';

const AddTutor = () => {
    const navigate = useNavigate();
    const [tutorData, setTutorData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setTutorData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'tutores'), {
                ...tutorData,
                createdAt: serverTimestamp(),
                pacienteIds: []
            });
            Swal.fire('Éxito', 'Tutor agregado correctamente.', 'success');
            navigate('/admin/tutores');
        } catch (error) {
            console.error("Error adding tutor: ", error);
            Swal.fire('Error', 'No se pudo agregar el tutor.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="presential-form-container">
            <h2>Agregar Nuevo Tutor</h2>
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
                    {isSubmitting ? 'Agregando...' : 'Agregar Tutor'}
                </button>
            </form>
        </div>
    );
};

export default AddTutor;
