import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';

const EditTutor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tutorData, setTutorData] = useState({
        name: '', email: '', phone: '', secondaryPhone: '', address: '', dni: '',
        billingInfo: { razonSocial: '', cuit: '', condicionFiscal: '' },
        preferredContactMethod: '', receivesReminders: true,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const fetchTutor = useCallback(async () => {
        setIsLoading(true);
        try {
            const tutorRef = doc(db, 'tutores', id);
            const tutorSnap = await getDoc(tutorRef);
            if (tutorSnap.exists()) {
                const data = tutorSnap.data();
                setTutorData({
                    ...data,
                    billingInfo: data.billingInfo || { razonSocial: '', cuit: '', condicionFiscal: 'Consumidor Final' }
                });
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
        const { name, value, type, checked } = e.target;
        if (name.startsWith('billingInfo.')) {
            const field = name.split('.')[1];
            setTutorData(prev => ({ ...prev, billingInfo: { ...prev.billingInfo, [field]: value } }));
        } else {
            setTutorData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await updateDoc(doc(db, 'tutores', id), tutorData);
            Swal.fire('Éxito', 'Tutor actualizado correctamente.', 'success');
            navigate(`/admin/tutor-profile/${id}`);
        } catch (error) {
            Swal.fire('Error', 'No se pudo actualizar el tutor.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <p className="loading-message">Cargando...</p>;

    return (
        <div className="tutor-form-container">
            <h2 className="tutor-form-title">Editar Tutor</h2>
            <form onSubmit={handleSubmit} className="tutor-styled-form">
                 <fieldset className="tutor-form-fieldset">
                    <legend>Información Personal</legend>
                    <div className="tutor-form-group">
                        <label htmlFor="name">Nombre Completo</label>
                        <input id="name" name="name" type="text" value={tutorData.name} onChange={handleChange} required />
                    </div>
                    <div className="tutor-form-row">
                        <div className="tutor-form-group"><label htmlFor="dni">DNI</label><input id="dni" name="dni" type="text" value={tutorData.dni} onChange={handleChange} /></div>
                        <div className="tutor-form-group"><label htmlFor="email">Email</label><input id="email" name="email" type="email" value={tutorData.email} onChange={handleChange} /></div>
                    </div>
                     <div className="tutor-form-row">
                        <div className="tutor-form-group"><label htmlFor="phone">Teléfono Principal</label><input id="phone" name="phone" type="tel" value={tutorData.phone} onChange={handleChange} required /></div>
                         <div className="tutor-form-group"><label htmlFor="secondaryPhone">Teléfono Secundario</label><input id="secondaryPhone" name="secondaryPhone" type="tel" value={tutorData.secondaryPhone} onChange={handleChange} /></div>
                    </div>
                    <div className="tutor-form-group"><label htmlFor="address">Dirección</label><input id="address" name="address" type="text" value={tutorData.address} onChange={handleChange} /></div>
                </fieldset>
                <fieldset className="tutor-form-fieldset">
                    <legend>Preferencias y Facturación</legend>
                     <div className="tutor-form-row">
                        <div className="tutor-form-group">
                            <label htmlFor="preferredContactMethod">Contacto Preferido</label>
                            <select id="preferredContactMethod" name="preferredContactMethod" value={tutorData.preferredContactMethod} onChange={handleChange}>
                                <option value="WhatsApp">WhatsApp</option><option value="Llamada">Llamada</option><option value="Email">Email</option>
                            </select>
                        </div>
                         <div className="tutor-form-group tutor-checkbox-group">
                             <input id="receivesReminders" name="receivesReminders" type="checkbox" checked={tutorData.receivesReminders} onChange={handleChange} />
                            <label htmlFor="receivesReminders">Acepta recibir recordatorios</label>
                        </div>
                    </div>
                    <div className="tutor-form-group"><label htmlFor="razonSocial">Razón Social</label><input id="razonSocial" name="billingInfo.razonSocial" type="text" value={tutorData.billingInfo?.razonSocial || ''} onChange={handleChange} /></div>
                     <div className="tutor-form-row">
                        <div className="tutor-form-group"><label htmlFor="cuit">CUIT/CUIL</label><input id="cuit" name="billingInfo.cuit" type="text" value={tutorData.billingInfo?.cuit || ''} onChange={handleChange} /></div>
                        <div className="tutor-form-group">
                            <label htmlFor="condicionFiscal">Condición Fiscal</label>
                            <select id="condicionFiscal" name="billingInfo.condicionFiscal" value={tutorData.billingInfo?.condicionFiscal || 'Consumidor Final'} onChange={handleChange}>
                                <option value="Consumidor Final">Consumidor Final</option><option value="Monotributista">Monotributista</option><option value="Responsable Inscripto">Responsable Inscripto</option><option value="Exento">Exento</option>
                            </select>
                        </div>
                    </div>
                </fieldset>
                 <div className="tutor-form-actions">
                    <button type="submit" className="tutor-form-submit-btn" disabled={isSubmitting}>{isSubmitting ? 'Actualizando...' : 'Actualizar Tutor'}</button>
                </div>
            </form>
        </div>
    );
};

export default EditTutor;

