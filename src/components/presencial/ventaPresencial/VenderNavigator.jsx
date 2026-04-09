// VenderNavigator.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SeleccionarTutor from "./SeleccionarTutor";
import SeleccionarPacientes from "./SeleccionarPacientes";
import SeleccionarProducto from "./SeleccionarProducto";
import DistribuirItems from "./DistribuirItems";
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
    distributionByPatient: {},
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
        const { tutor, patient, cart, savedSale } = location.state;

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
                distributionByPatient: savedSale.distributionByPatient || {},
                payments: [],
                debt: 0,
                saleTimestamp,
            });
            setLoadedSaleId(savedSale.id);
            setStep(5);
        } else if (cart) {
            const total = cart.reduce((sum, item) => sum + item.price, 0);
            const patients = patient ? [patient] : [];
            setSaleData(prev => ({ ...prev, tutor, patients, cart, total, clinicalHistoryItems: {}, suministroItems: {}, distributionByPatient: {}, saleTimestamp: Timestamp.now() }));
            setStep(patients.length > 0 ? 4 : 5);
        } else if (tutor && patient) {
            setSaleData(prev => ({ ...prev, tutor, patients: [patient], saleTimestamp: Timestamp.now() }));
            setStep(2);
        } else if (tutor) {
            setSaleData(prev => ({ ...prev, tutor, saleTimestamp: Timestamp.now() }));
            setStep(2);
        }
    }, [location.state]);

    const updateSaleData = (data) => setSaleData(prev => ({ ...prev, ...data }));

    const handleSelectTutor = (tutor) => {
        updateSaleData({ tutor, patients: [], cart: [], total: 0, clinicalHistoryItems: {}, suministroItems: {}, distributionByPatient: {}, payments: [], debt: 0, saleTimestamp: Timestamp.now() });
        setStep(2);
    };

    const handleGenericSale = () => {
        updateSaleData({ tutor: null, patients: [], cart: [], total: 0, clinicalHistoryItems: {}, suministroItems: {}, distributionByPatient: {}, payments: [], debt: 0, saleTimestamp: Timestamp.now() });
        setStep(3);
    };

    const handleSelectPatients = (patients) => { updateSaleData({ patients }); setStep(3); };
    const handleSkipPatients = () => { updateSaleData({ patients: [] }); setStep(3); };

    const handleSelectProducts = (cart, total) => {
        updateSaleData({ cart, total, clinicalHistoryItems: {}, suministroItems: {}, distributionByPatient: {} });
        if (saleData.patients.length === 0) setStep(5);
        else setStep(4);
    };

    const handleDistribution = (distributionByPatient, clinicalHistoryItems, suministroItems) => {
        updateSaleData({ distributionByPatient, clinicalHistoryItems, suministroItems });
        setStep(5);
    };

    const handleSaleDateChange = (ts) => updateSaleData({ saleTimestamp: ts });

    const handlePaymentSelected = (payments, debt, totalWithSurcharges) => {
        updateSaleData({ payments, debt, total: totalWithSurcharges });
        setStep(6);
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
        if (saleData.patients.length > 0 && hasPatientsWithClinicalItems()) setStep(7);
        else handleConfirmSaleAndSchedule({}, {});
    };

    const getDistributedQty = (patientId, itemId, fallback) => {
        const val = saleData.distributionByPatient?.[patientId]?.[itemId];
        return (val !== undefined && val !== null) ? val : fallback;
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
                tutorInfo: saleData.tutor ? { id: saleData.tutor.id, name: saleData.tutor.name } : { id: "generic", name: "Cliente Genérico" },
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
                if (item.source === "online" && !item.isDoseable)
                    batch.update(doc(db, "productos", item.id), { stock: increment(-item.quantity) });
            });

            for (const patient of saleData.patients) {
                const patientCHItems = saleData.clinicalHistoryItems[patient.id] || [];
                const itemsForHistory = saleData.cart.filter(item => patientCHItems.includes(item.id));

                if (itemsForHistory.length > 0) {
                    const treatmentText = itemsForHistory.map(s => {
                        const qty = getDistributedQty(patient.id, s.id, s.quantity);
                        return s.isDoseable ? `${s.name} (${qty} ${s.unit})` : `${qty} x ${s.name}`;
                    }).join(", ");

                    batch.set(doc(collection(db, `pacientes/${patient.id}/clinical_history`)), {
                        createdAt: saleTimestamp,
                        reason: "Productos/servicios de venta",
                        treatment: treatmentText,
                        saleId: saleRef.id,
                    });
                }

                const patientSchedule = scheduleByPatient[patient.id] || {};
                const patientLinks = linksByPatient[patient.id] || {};
                const patientSumItems = saleData.suministroItems[patient.id] || [];

                Object.keys(patientSchedule).forEach(itemId => {
                    const days = patientSchedule[itemId];
                    if (days > 0) {
                        const item = saleData.cart.find(i => i.id === itemId);
                        if (!item) return;
                        const dueDate = new Date(saleTimestamp.toDate());
                        dueDate.setDate(dueDate.getDate() + days);
                        const distributedQty = getDistributedQty(patient.id, itemId, item.quantity);
                        const vencData = {
                            productId: item.originalProductId || item.id,
                            productName: item.name,
                            tutorId: saleData.tutor?.id || null,
                            tutorName: saleData.tutor?.name || "Cliente Genérico",
                            pacienteId: patient.id,
                            pacienteName: patient.name,
                            appliedDate: saleTimestamp,
                            appliedDosage: item.isDoseable ? `${distributedQty} ${item.unit}` : null,
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
                            supplied: true, suppliedDate: saleTimestamp, status: "suministrado",
                        });
                    }
                });
            }

            if (saleData.debt > 0 && saleData.tutor?.id)
                batch.update(doc(db, "tutores", saleData.tutor.id), { accountBalance: increment(saleData.debt * -1) });

            if (loadedSaleId)
                batch.delete(doc(db, "ventas_guardadas", loadedSaleId));

            await batch.commit();
            updateSaleData({ id: saleRef.id, createdAt: saleTimestamp, subtotal: totalSubtotal, discount: totalDiscount });
            setStep(8);
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

    const hasPatients = saleData.patients.length > 0;
    const progressPercent = ((step - 1) / 7) * 100;

    const renderStep = () => {
        switch (step) {
            case 1: return <SeleccionarTutor onTutorSelected={handleSelectTutor} onGenericSelected={handleGenericSale} />;
            case 2: return <SeleccionarPacientes onPatientsSelected={handleSelectPatients} onSkipPatients={handleSkipPatients} prevStep={() => setStep(1)} tutor={saleData.tutor} />;
            case 3: return <SeleccionarProducto onProductsSelected={handleSelectProducts} prevStep={saleData.tutor ? () => setStep(2) : handleReset} initialCart={saleData.cart} saleData={saleData} onSaleDateChange={handleSaleDateChange} />;
            case 4: return <DistribuirItems saleData={saleData} onDistributionConfirmed={handleDistribution} prevStep={() => setStep(3)} />;
            case 5: return <MetodoPago onPaymentSelected={handlePaymentSelected} prevStep={() => setStep(hasPatients ? 4 : 3)} saleData={saleData} />;
            case 6: return <ConfirmarVenta saleData={saleData} onConfirm={handleConfirmAndProceed} prevStep={() => setStep(5)} onToggleClinicalHistory={handleToggleClinicalHistoryItem} onToggleSuministro={handleToggleSuministroItem} isSubmitting={isSubmitting} onSaleReset={handleReset} />;
            case 7: return <ProgramarVencimientos saleData={saleData} onConfirmAndSchedule={handleConfirmSaleAndSchedule} prevStep={() => setStep(6)} isSubmitting={isSubmitting} />;
            case 8: return <ResumenVenta saleData={saleData} onReset={handleReset} />;
            default: return null;
        }
    };

    return (
        <div className="venta-navigator-container">
            <div className="venta-step-indicator">
                <div className="venta-step-indicator-bar" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="venta-step-content">
                {renderStep()}
            </div>
        </div>
    );
};

export default VenderNavigator;