import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Swal from 'sweetalert2';

const AddTutor = () => {
    const navigate = useNavigate();
    const [tutorData, setTutorData] = useState({
        name: '', email: '', phone: '', secondaryPhone: '', address: '', dni: '',
        billingInfo: { razonSocial: '', cuit: '', condicionFiscal: 'Consumidor Final' },
        preferredContactMethod: 'WhatsApp', receivesReminders: true, serviceTypes: [],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name.startsWith('billingInfo.')) {
            const field = name.split('.')[1];
            setTutorData(prev => ({ ...prev, billingInfo: { ...prev.billingInfo, [field]: value } }));
        } else {
            setTutorData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }
    };

    const handleNameChange = (e) => {
        const { value } = e.target;
        setTutorData(prev => ({
            ...prev,
            name: value,
            billingInfo: { ...prev.billingInfo, razonSocial: value }
        }));
    };

    const handleServiceTypeChange = (e) => {
        const { value, checked } = e.target;
        setTutorData(prev => {
            const currentServices = prev.serviceTypes || [];
            if (checked) {
                return { ...prev, serviceTypes: [...currentServices, value] };
            } else {
                return { ...prev, serviceTypes: currentServices.filter(service => service !== value) };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'tutores'), {
                ...tutorData, accountBalance: 0, createdAt: serverTimestamp(), pacienteIds: []
            });
            Swal.fire('Éxito', 'Tutor agregado correctamente.', 'success');
            navigate('/admin/tutores');
        } catch (error) {
            Swal.fire('Error', 'No se pudo agregar el tutor.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="tutor-form-container">
            <h2 className="tutor-form-title">Agregar Nuevo Tutor</h2>
            <form onSubmit={handleSubmit} className="tutor-styled-form">
                <fieldset className="tutor-form-fieldset">
                    <legend>Información Personal</legend>
                    <div className="tutor-form-group"><label htmlFor="name">Nombre Completo</label><input id="name" name="name" type="text" value={tutorData.name} onChange={handleNameChange} required /></div>
                    <div className="tutor-form-row"><div className="tutor-form-group"><label htmlFor="dni">DNI</label><input id="dni" name="dni" type="text" value={tutorData.dni} onChange={handleChange} /></div><div className="tutor-form-group"><label htmlFor="email">Email</label><input id="email" name="email" type="email" value={tutorData.email} onChange={handleChange} /></div></div>
                    <div className="tutor-form-row"><div className="tutor-form-group"><label htmlFor="phone">Teléfono Principal</label><input id="phone" name="phone" type="tel" value={tutorData.phone} onChange={handleChange} required /></div><div className="tutor-form-group"><label htmlFor="secondaryPhone">Teléfono Secundario</label><input id="secondaryPhone" name="secondaryPhone" type="tel" value={tutorData.secondaryPhone} onChange={handleChange} /></div></div>
                    <div className="tutor-form-group"><label htmlFor="address">Dirección</label><input id="address" name="address" type="text" value={tutorData.address} onChange={handleChange} /></div>
                </fieldset>
                <fieldset className="tutor-form-fieldset">
                    <legend>Preferencias y Facturación</legend>
                    <div className="tutor-form-row"><div className="tutor-form-group"><label htmlFor="preferredContactMethod">Contacto Preferido</label><select id="preferredContactMethod" name="preferredContactMethod" value={tutorData.preferredContactMethod} onChange={handleChange}><option value="WhatsApp">WhatsApp</option><option value="Llamada">Llamada</option><option value="Email">Email</option></select></div><div className="tutor-form-group tutor-checkbox-group"><input id="receivesReminders" name="receivesReminders" type="checkbox" checked={tutorData.receivesReminders} onChange={handleChange} /><label htmlFor="receivesReminders">Acepta recibir recordatorios</label></div></div>
                    <div className="tutor-form-group"><label>Tipos de Servicio</label><div className="tutor-checkbox-group-horizontal"><div className="tutor-checkbox-item"><input id="serviceClinical" type="checkbox" value="clinical" checked={(tutorData.serviceTypes || []).includes('clinical')} onChange={handleServiceTypeChange} /><label htmlFor="serviceClinical">Clínica</label></div><div className="tutor-checkbox-item"><input id="serviceGrooming" type="checkbox" value="grooming" checked={(tutorData.serviceTypes || []).includes('grooming')} onChange={handleServiceTypeChange} /><label htmlFor="serviceGrooming">Peluquería</label></div></div></div>
                    <div className="tutor-form-group"><label htmlFor="razonSocial">Razón Social</label><input id="razonSocial" name="billingInfo.razonSocial" type="text" value={tutorData.billingInfo.razonSocial} onChange={handleChange} /></div>
                    <div className="tutor-form-row"><div className="tutor-form-group"><label htmlFor="cuit">CUIT/CUIL</label><input id="cuit" name="billingInfo.cuit" type="text" value={tutorData.billingInfo.cuit} onChange={handleChange} /></div><div className="tutor-form-group"><label htmlFor="condicionFiscal">Condición Fiscal</label><select id="condicionFiscal" name="billingInfo.condicionFiscal" value={tutorData.billingInfo.condicionFiscal} onChange={handleChange}><option value="Consumidor Final">Consumidor Final</option><option value="Monotributista">Monotributista</option><option value="Responsable Inscripto">Responsable Inscripto</option><option value="Exento">Exento</option></select></div></div>
                </fieldset>
                <div className="tutor-form-actions"><button type="submit" className="tutor-form-submit-btn" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Agregar Tutor'}</button></div>
            </form>
        </div>
    );
};

export default AddTutor;