import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SeleccionarTutor from "./SeleccionarTutor";
import SeleccionarPacientes from "./SeleccionarPacientes";
import SeleccionarProducto from "./SeleccionarProducto";
import MetodoPago from "./MetodoPago";
import ConfirmarVenta from "./ConfirmarVenta";
import ResumenVenta from "./ResumenVenta";
import ProgramarVencimientos from "./ProgramarVencimientos";
import { db } from "../../../firebase/config";
import { collection, doc, writeBatch, increment, Timestamp } from "firebase/firestore";

const INITIAL_SALE_DATA = {
    cart: [],
    tutor: null,
    patients: [],
    payments: [],
    debt: 0,
    total: 0,
    clinicalHistoryItems: {},
    suministroItems: {},
    saleTimestamp: Timestamp.now(),
};

const VenderNavigator = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [saleData, setSaleData] = useState(INITIAL_SALE_DATA);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadedSaleId, setLoadedSaleId] = useState(null);

    useEffect(() => {
        if (!location.state) return;
        const { tutor, patient, cart, savedSale, loadStep } = location.state;

        if (savedSale) {
            const total = savedSale.cart.reduce((sum, item) => sum + item.price, 0);
            let saleTimestamp;
            if (savedSale.saleTimestamp?.toDate) saleTimestamp = savedSale.saleTimestamp;
            else if (savedSale.saleTimestamp?.seconds) saleTimestamp = new Timestamp(savedSale.saleTimestamp.seconds, savedSale.saleTimestamp.nanoseconds || 0);
            else saleTimestamp = Timestamp.now();
            const patients = savedSale.patients || (savedSale.patient ? [savedSale.patient] : []);
            setSaleData({
                cart: savedSale.cart,
                tutor: savedSale.tutor,
                patients,
                total,
                clinicalHistoryItems: savedSale.clinicalHistoryItems || {},
                suministroItems: savedSale.suministroItems || {},
                payments: [],
                debt: 0,
                saleTimestamp,
            });
            setLoadedSaleId(savedSale.id);
            setStep(loadStep || 4);
        } else if (cart) {
            const total = cart.reduce((sum, item) => sum + item.price, 0);
            const patients = patient ? [patient] : [];
            const autoItems = cart.filter(i => i.tipo === "servicio" || i.isDoseable).map(i => i.id);
            const clinicalHistoryItems = {};
            const suministroItems = {};
            patients.forEach(p => {
                clinicalHistoryItems[p.id] = autoItems;
                suministroItems[p.id] = autoItems;
            });
            setSaleData(prev => ({ ...prev, tutor, patients, cart, total, clinicalHistoryItems, suministroItems, saleTimestamp: Timestamp.now() }));
            setStep(3);
        } else if (tutor && patient) {
            setSaleData(prev => ({ ...prev, tutor, patients: [patient], saleTimestamp: Timestamp.now() }));
            setStep(2);
        } else if (tutor) {
            setSaleData(prev => ({ ...prev, tutor, saleTimestamp: Timestamp.now() }));
            setStep(2);
        }
    }, [location.state]);

    const nextStep = () => setStep(p => p + 1);
    const prevStep = () => setStep(p => p - 1);
    const updateSaleData = (data) => setSaleData(prev => ({ ...prev, ...data }));

    const handleSelectTutor = (tutor) => {
        updateSaleData({ tutor, patients: [], cart: [], total: 0, clinicalHistoryItems: {}, suministroItems: {}, payments: [], debt: 0, saleTimestamp: Timestamp.now() });
        nextStep();
    };

    const handleGenericSale = () => {
        updateSaleData({ tutor: null, patients: [], cart: [], total: 0, clinicalHistoryItems: {}, suministroItems: {}, payments: [], debt: 0, saleTimestamp: Timestamp.now() });
        setStep(3);
    };

    const handleSelectPatients = (patients) => {
        updateSaleData({ patients });
        nextStep();
    };

    const handleSkipPatients = () => {
        updateSaleData({ patients: [] });
        nextStep();
    };

    const handleSelectProducts = (cart, total) => {
        const autoItems = cart.filter(i => i.tipo === "servicio" || i.isDoseable).map(i => i.id);
        const clinicalHistoryItems = {};
        const suministroItems = {};
        saleData.patients.forEach(p => {
            clinicalHistoryItems[p.id] = [...autoItems];
            suministroItems[p.id] = [...autoItems];
        });
        updateSaleData({ cart, total, clinicalHistoryItems, suministroItems });
        nextStep();
    };

    const handleSaleDateChange = (newTimestamp) => updateSaleData({ saleTimestamp: newTimestamp });

    const handlePaymentSelected = (payments, debt, totalWithSurcharges) => {
        updateSaleData({ payments, debt, total: totalWithSurcharges });
        nextStep();
    };

    const handleToggleClinicalHistoryItem = (patientId, itemId) => {
        setSaleData(prev => {
            const current = prev.clinicalHistoryItems[patientId] || [];
            const isIn = current.includes(itemId);
            const newItems = isIn ? current.filter(id => id !== itemId) : [...current, itemId];
            const currentSum = prev.suministroItems[patientId] || [];
            const newSum = isIn ? currentSum.filter(id => id !== itemId) : [...currentSum, itemId];
            return {
                ...prev,
                clinicalHistoryItems: { ...prev.clinicalHistoryItems, [patientId]: newItems },
                suministroItems: { ...prev.suministroItems, [patientId]: newSum },
            };
        });
    };

    const handleToggleSuministroItem = (patientId, itemId) => {
        setSaleData(prev => {
            const current = prev.suministroItems[patientId] || [];
            const newItems = current.includes(itemId) ? current.filter(id => id !== itemId) : [...current, itemId];
            return { ...prev, suministroItems: { ...prev.suministroItems, [patientId]: newItems } };
        });
    };

    const hasPatientsWithClinicalItems = () =>
        saleData.patients.some(p => (saleData.clinicalHistoryItems[p.id] || []).length > 0);

    const handleConfirmAndProceed = () => {
        if (saleData.patients.length > 0 && hasPatientsWithClinicalItems()) nextStep();
        else handleConfirmSaleAndSchedule({}, {});
    };

    const handleConfirmSaleAndSchedule = async (scheduleByPatient, linksByPatient) => {
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const saleRef = doc(collection(db, "ventas_presenciales"));
            const { saleTimestamp } = saleData;
            const totalSubtotal = saleData.cart.reduce((sum, item) => sum + (item.priceBeforeDiscount || item.price), 0);
            const totalDiscount = saleData.cart.reduce((sum, item) => sum + (item.discountAmount || 0), 0);

            batch.set(saleRef, {
                createdAt: saleTimestamp,
                tutorInfo: saleData.tutor
                    ? { id: saleData.tutor.id, name: saleData.tutor.name }
                    : { id: "generic", name: "Cliente Genérico" },
                patientsInfo: saleData.patients.map(p => ({ id: p.id, name: p.name })),
                payments: saleData.payments,
                debtPayments: [],
                subtotal: totalSubtotal,
                discount: totalDiscount,
                total: saleData.total,
                debt: saleData.debt,
                items: saleData.cart.map(item => ({
                    id: item.originalProductId || item.id,
                    name: item.name,
                    quantity: item.quantity,
                    source: item.source,
                    tipo: item.tipo || null,
                    isDoseable: item.isDoseable || false,
                    unit: item.unit || null,
                    originalPrice: item.originalPrice,
                    priceBeforeDiscount: item.priceBeforeDiscount,
                    discountType: item.discountType || null,
                    discountValue: item.discountValue || 0,
                    discountAmount: item.discountAmount || 0,
                    price: item.price,
                })),
            });

            saleData.cart.forEach(item => {
                if (item.source === "online" && !item.isDoseable) {
                    batch.update(doc(db, "productos", item.id), { stock: increment(-item.quantity) });
                }
            });

            for (const patient of saleData.patients) {
                const patientCHItems = saleData.clinicalHistoryItems[patient.id] || [];
                const itemsForHistory = saleData.cart.filter(item => patientCHItems.includes(item.id));

                if (itemsForHistory.length > 0) {
                    const treatmentText = itemsForHistory
                        .map(s => s.isDoseable ? `${s.name} (${s.quantity} ${s.unit})` : `${s.quantity} x ${s.name}`)
                        .join(", ");
                    batch.set(doc(collection(db, `pacientes/${patient.id}/clinical_history`)), {
                        createdAt: saleTimestamp,
                        reason: "Productos/servicios de venta",
                        treatment: treatmentText,
                        saleId: saleRef.id,
                    });
                }

                const patientSchedule = scheduleByPatient[patient.id] || {};
                const patientLinks = linksByPatient[patient.id] || {};

                Object.keys(patientSchedule).forEach(itemId => {
                    const days = patientSchedule[itemId];
                    if (days > 0) {
                        const item = saleData.cart.find(i => i.id === itemId);
                        if (!item) return;
                        const dueDate = new Date(saleTimestamp.toDate());
                        dueDate.setDate(dueDate.getDate() + days);
                        const patientSumItems = saleData.suministroItems[patient.id] || [];
                        const vencData = {
                            productId: item.originalProductId || item.id,
                            productName: item.name,
                            tutorId: saleData.tutor?.id || null,
                            tutorName: saleData.tutor?.name || "Cliente Genérico",
                            pacienteId: patient.id,
                            pacienteName: patient.name,
                            appliedDate: saleTimestamp,
                            appliedDosage: item.isDoseable ? `${item.quantity} ${item.unit}` : null,
                            saleId: saleRef.id,
                        };
                        batch.set(doc(collection(db, `pacientes/${patient.id}/vencimientos`)), {
                            ...vencData,
                            dueDate: Timestamp.fromDate(dueDate),
                            status: "pendiente",
                            supplied: false,
                            suppliedDate: null,
                        });
                        if (patientSumItems.includes(itemId)) {
                            batch.set(doc(collection(db, `pacientes/${patient.id}/vencimientos`)), {
                                ...vencData,
                                dueDate: saleTimestamp,
                                status: "suministrado",
                                supplied: true,
                                suppliedDate: saleTimestamp,
                            });
                        }
                    }
                });

                Object.keys(patientLinks).forEach(itemId => {
                    const oldVencId = patientLinks[itemId];
                    if (oldVencId) {
                        batch.update(doc(db, `pacientes/${patient.id}/vencimientos`, oldVencId), {
                            supplied: true,
                            suppliedDate: saleTimestamp,
                            status: "suministrado",
                        });
                    }
                });
            }

            if (saleData.debt > 0 && saleData.tutor?.id) {
                batch.update(doc(db, "tutores", saleData.tutor.id), { accountBalance: increment(saleData.debt * -1) });
            }

            if (loadedSaleId) {
                batch.delete(doc(db, "ventas_guardadas", loadedSaleId));
            }

            await batch.commit();
            updateSaleData({ id: saleRef.id, createdAt: saleTimestamp, subtotal: totalSubtotal, discount: totalDiscount });
            setStep(7);
        } catch (error) {
            console.error("Error confirming sale:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setStep(1);
        setSaleData({ ...INITIAL_SALE_DATA, saleTimestamp: Timestamp.now() });
        setLoadedSaleId(null);
        navigate("/admin/vender");
    };

    const renderStep = () => {
        switch (step) {
            case 1: return <SeleccionarTutor onTutorSelected={handleSelectTutor} onGenericSelected={handleGenericSale} />;
            case 2: return <SeleccionarPacientes onPatientsSelected={handleSelectPatients} onSkipPatients={handleSkipPatients} prevStep={prevStep} tutor={saleData.tutor} />;
            case 3: return <SeleccionarProducto onProductsSelected={handleSelectProducts} prevStep={saleData.tutor ? prevStep : handleReset} initialCart={saleData.cart} saleData={saleData} onSaleDateChange={handleSaleDateChange} />;
            case 4: return <MetodoPago onPaymentSelected={handlePaymentSelected} prevStep={prevStep} saleData={saleData} />;
            case 5: return <ConfirmarVenta saleData={saleData} onConfirm={handleConfirmAndProceed} prevStep={prevStep} onToggleClinicalHistory={handleToggleClinicalHistoryItem} onToggleSuministro={handleToggleSuministroItem} isSubmitting={isSubmitting} onSaleReset={handleReset} />;
            case 6: return <ProgramarVencimientos saleData={saleData} onConfirmAndSchedule={handleConfirmSaleAndSchedule} prevStep={prevStep} isSubmitting={isSubmitting} />;
            case 7: return <ResumenVenta saleData={saleData} onReset={handleReset} />;
            default: return null;
        }
    };

    return (
        <div className="venta-navigator-container">
            <div className="venta-step-indicator">
                <div className="venta-step-indicator-bar" style={{ width: `${((step - 1) / 6) * 100}%` }} />
            </div>
            <div className="venta-step-content">
                {renderStep()}
            </div>
        </div>
    );
};

export default VenderNavigator;