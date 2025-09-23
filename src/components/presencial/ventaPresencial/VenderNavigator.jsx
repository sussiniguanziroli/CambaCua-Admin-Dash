import React, { useState } from 'react';
import SeleccionarTutor from './SeleccionarTutor';
import SeleccionarPaciente from './SeleccionarPaciente';
import SeleccionarProducto from './SeleccionarProducto';
import MetodoPago from './MetodoPago';
import ConfirmarVenta from './ConfirmarVenta';
import ResumenVenta from './ResumenVenta';
import { db } from '../../../firebase/config';
import { collection, doc, writeBatch, arrayUnion, increment } from 'firebase/firestore';
import Swal from 'sweetalert2';

const VenderNavigator = () => {
    const [step, setStep] = useState(1);
    const [saleData, setSaleData] = useState({
        cart: [],
        tutor: null,
        patient: null,
        payments: [],
        debt: 0,
        total: 0,
        clinicalHistoryItems: [],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const updateSaleData = (data) => {
        setSaleData(prev => ({ ...prev, ...data }));
    };

    const handleSelectTutor = (tutor) => {
        updateSaleData({ tutor, patient: null, cart: [], total: 0, clinicalHistoryItems: [], payments: [], debt: 0 });
        nextStep();
    };

    const handleSelectPatient = (patient) => {
        updateSaleData({ patient });
        nextStep();
    };

    const handleSelectProducts = (cart, total) => {
        const serviceItems = cart.filter(item => item.tipo === 'servicio').map(item => item.id);
        updateSaleData({ cart, total, clinicalHistoryItems: serviceItems });
        nextStep();
    };

    const handlePaymentSelected = (payments, debt) => {
        updateSaleData({ payments, debt });
        nextStep();
    };
    
    const handleToggleClinicalHistoryItem = (itemId) => {
        setSaleData(prev => {
            const newItems = prev.clinicalHistoryItems.includes(itemId)
                ? prev.clinicalHistoryItems.filter(id => id !== itemId)
                : [...prev.clinicalHistoryItems, itemId];
            return { ...prev, clinicalHistoryItems: newItems };
        });
    };

    const handleConfirmSale = async () => {
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const saleRef = doc(collection(db, 'ventas_presenciales'));
            
            batch.set(saleRef, {
                createdAt: new Date(),
                tutorInfo: saleData.tutor ? { id: saleData.tutor.id, name: saleData.tutor.name } : null,
                patientInfo: saleData.patient ? { id: saleData.patient.id, name: saleData.patient.name } : null,
                payments: saleData.payments,
                total: saleData.total,
                debt: saleData.debt,
                items: saleData.cart.map(item => ({
                    id: item.id, name: item.name || item.nombre, price: item.price,
                    quantity: item.quantity, source: item.source, tipo: item.tipo,
                })),
            });

            const itemsForHistory = saleData.cart.filter(item => saleData.clinicalHistoryItems.includes(item.id));
            if (itemsForHistory.length > 0 && saleData.patient?.id) {
                const clinicalNoteEntry = {
                    date: new Date().toISOString().split('T')[0],
                    reason: "Productos/servicios de venta",
                    treatment: itemsForHistory.map(s => `${s.quantity} x ${s.name || s.nombre}`).join(', '),
                    saleId: saleRef.id
                };
                const patientRef = doc(db, 'pacientes', saleData.patient.id);
                batch.update(patientRef, { clinicalHistory: arrayUnion(clinicalNoteEntry) });
            }
            
            if (saleData.debt > 0 && saleData.tutor?.id) {
                const tutorRef = doc(db, 'tutores', saleData.tutor.id);
                batch.update(tutorRef, { accountBalance: increment(saleData.debt * -1) });
            }

            await batch.commit();
            nextStep();

        } catch (error) {
            console.error("Error confirming sale:", error);
            Swal.fire('Error', 'No se pudo registrar la venta.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setStep(1);
        setSaleData({ cart: [], tutor: null, patient: null, payments: [], debt: 0, total: 0, clinicalHistoryItems: [] });
    };

    const renderStep = () => {
        switch (step) {
            case 1: return <SeleccionarTutor onTutorSelected={handleSelectTutor} />;
            case 2: return <SeleccionarPaciente onPatientSelected={handleSelectPatient} prevStep={prevStep} tutor={saleData.tutor} />;
            case 3: return <SeleccionarProducto onProductsSelected={handleSelectProducts} prevStep={prevStep} initialCart={saleData.cart} saleData={saleData} />;
            case 4: return <MetodoPago onPaymentSelected={handlePaymentSelected} prevStep={prevStep} saleData={saleData} />;
            case 5: return <ConfirmarVenta saleData={saleData} onConfirm={handleConfirmSale} prevStep={prevStep} isSubmitting={isSubmitting} onToggleClinicalHistory={handleToggleClinicalHistoryItem} />;
            case 6: return <ResumenVenta saleData={saleData} onReset={handleReset} />;
            default: return <div>Paso desconocido</div>;
        }
    };

    return (
        <div className="venta-navigator-container">
            <div className="venta-step-indicator"><div className="venta-step-indicator-bar" style={{ width: `${(step - 1) / 5 * 100}%` }}></div></div>
            <div className="venta-step-content">{renderStep()}</div>
        </div>
    );
};

export default VenderNavigator;

