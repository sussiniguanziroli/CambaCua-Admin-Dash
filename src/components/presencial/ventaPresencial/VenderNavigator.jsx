import React, { useState } from 'react';
import { db } from '../../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Swal from 'sweetalert2';

import SeleccionarTutor from './SeleccionarTutor';
import SeleccionarPaciente from './SeleccionarPaciente';
import SeleccionarProducto from './SeleccionarProducto';
import MetodoPago from './MetodoPago';
import ConfirmarVenta from './ConfirmarVenta';
import ResumenVenta from './ResumenVenta';

const VenderNavigator = () => {
    const [step, setStep] = useState(1);
    const [saleData, setSaleData] = useState({
        cart: [],
        tutor: null,
        patient: null,
        paymentMethod: '',
        total: 0,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const updateSaleData = (data) => {
        setSaleData(prev => ({ ...prev, ...data }));
    };

    const handleSelectTutor = (tutor) => {
        updateSaleData({ tutor, patient: null, cart: [], total: 0 });
        nextStep();
    };

    const handleSelectPatient = (patient) => {
        updateSaleData({ patient });
        nextStep();
    };
    
    const handleSelectProducts = (cart, total) => {
        updateSaleData({ cart, total });
        nextStep();
    };

    const handleSelectPaymentMethod = (paymentMethod) => {
        updateSaleData({ paymentMethod });
        nextStep();
    };
    
    const handleConfirmSale = async () => {
        setIsSubmitting(true);
        try {
            const finalSaleData = {
                createdAt: serverTimestamp(),
                tutorInfo: saleData.tutor ? { id: saleData.tutor.id, name: saleData.tutor.name } : null,
                patientInfo: saleData.patient ? { id: saleData.patient.id, name: saleData.patient.name } : null,
                paymentMethod: saleData.paymentMethod,
                total: saleData.total,
                items: saleData.cart.map(item => ({
                    id: item.id,
                    name: item.name || item.nombre,
                    price: item.price,
                    quantity: item.quantity,
                    source: item.source,
                })),
            };

            await addDoc(collection(db, 'ventas_presenciales'), finalSaleData);
            nextStep();
        } catch (error) {
            Swal.fire('Error', 'No se pudo registrar la venta.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setStep(1);
        setSaleData({
            cart: [],
            tutor: null,
            patient: null,
            paymentMethod: '',
            total: 0,
        });
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return <SeleccionarTutor onTutorSelected={handleSelectTutor} />;
            case 2:
                return <SeleccionarPaciente onPatientSelected={handleSelectPatient} prevStep={prevStep} tutor={saleData.tutor} />;
            case 3:
                return <SeleccionarProducto onProductsSelected={handleSelectProducts} prevStep={prevStep} initialCart={saleData.cart} saleData={saleData} />;
            case 4:
                return <MetodoPago onPaymentMethodSelected={handleSelectPaymentMethod} prevStep={prevStep} />;
            case 5:
                return <ConfirmarVenta saleData={saleData} onConfirm={handleConfirmSale} prevStep={prevStep} isSubmitting={isSubmitting} />;
            case 6:
                return <ResumenVenta saleData={saleData} onReset={handleReset} />;
            default:
                return <div>Paso desconocido</div>;
        }
    };

    return (
        <div className="vender-navigator-container">
            <div className="step-indicator">
                <div className="step-indicator-bar" style={{ width: `${(step - 1) / 5 * 100}%` }}></div>
            </div>
             <div className="step-content">
                {renderStep()}
            </div>
        </div>
    );
};

export default VenderNavigator;