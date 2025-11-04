import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SeleccionarTutor from "./SeleccionarTutor";
import SeleccionarPaciente from "./SeleccionarPaciente";
import SeleccionarProducto from "./SeleccionarProducto";
import MetodoPago from "./MetodoPago";
import ConfirmarVenta from "./ConfirmarVenta";
import ResumenVenta from "./ResumenVenta";
import ProgramarVencimientos from "./ProgramarVencimientos";
import { db } from "../../../firebase/config";
import { collection, doc, writeBatch, increment, Timestamp } from "firebase/firestore";



const VenderNavigator = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [saleData, setSaleData] = useState({
    cart: [],
    tutor: null,
    patient: null,
    payments: [],
    debt: 0,
    total: 0,
    clinicalHistoryItems: [],
    suministroItems: [],
    saleTimestamp: Timestamp.now(),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (location.state) {
      const { tutor, patient, cart } = location.state;

      if (cart) {
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        const serviceItems = cart
          .filter((item) => item.tipo === "servicio" || item.isDoseable)
          .map((item) => item.id);
        
        setSaleData((prev) => ({ 
            ...prev, 
            tutor, 
            patient, 
            cart, 
            total, 
            clinicalHistoryItems: serviceItems,
            suministroItems: serviceItems,
            saleTimestamp: Timestamp.now(),
        }));
        setStep(3);
      
      } else if (tutor && patient) {
        setSaleData((prev) => ({ ...prev, tutor, patient, saleTimestamp: Timestamp.now() }));
        setStep(3);
      } else if (tutor) {
        setSaleData((prev) => ({ ...prev, tutor, saleTimestamp: Timestamp.now() }));
        setStep(2);
      }
    }
  }, [location.state]);

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const updateSaleData = (data) =>
    setSaleData((prev) => ({ ...prev, ...data }));

  const handleSelectTutor = (tutor) => {
    updateSaleData({
      tutor,
      patient: null,
      cart: [],
      total: 0,
      clinicalHistoryItems: [],
      suministroItems: [],
      payments: [],
      debt: 0,
      saleTimestamp: Timestamp.now(),
    });
    nextStep();
  };

  const handleGenericSale = () => {
    updateSaleData({
      tutor: null,
      patient: null,
      cart: [],
      total: 0,
      clinicalHistoryItems: [],
      suministroItems: [],
      payments: [],
      debt: 0,
      saleTimestamp: Timestamp.now(),
    });
    setStep(3);
  };

  const handleSelectPatient = (patient) => {
    updateSaleData({ patient });
    nextStep();
  };

  const handleSkipPatient = () => {
    updateSaleData({ patient: null });
    nextStep();
  };

  const handleSelectProducts = (cart, total) => {
    const serviceItems = cart
      .filter((item) => item.tipo === "servicio" || item.isDoseable)
      .map((item) => item.id);

    updateSaleData({ cart, total, clinicalHistoryItems: serviceItems, suministroItems: serviceItems });
    nextStep();
  };
  
  const handleSaleDateChange = (newTimestamp) => {
    updateSaleData({ saleTimestamp: newTimestamp });
  };

  const handlePaymentSelected = (payments, debt, totalWithSurcharges) => {
    updateSaleData({ payments, debt, total: totalWithSurcharges });
    nextStep();
  };

  const handleToggleClinicalHistoryItem = (itemId) => {
    setSaleData((prev) => {
      const newItems = prev.clinicalHistoryItems.includes(itemId)
        ? prev.clinicalHistoryItems.filter((id) => id !== itemId)
        : [...prev.clinicalHistoryItems, itemId];
      
      const newSuministroItems = newItems.includes(itemId)
        ? [...prev.suministroItems, itemId]
        : prev.suministroItems.filter((id) => id !== itemId);

      return { ...prev, clinicalHistoryItems: newItems, suministroItems: newSuministroItems };
    });
  };

  const handleToggleSuministroItem = (itemId) => {
    setSaleData((prev) => {
      const newItems = prev.suministroItems.includes(itemId)
        ? prev.suministroItems.filter((id) => id !== itemId)
        : [...prev.suministroItems, itemId];
      return { ...prev, suministroItems: newItems };
    });
  };

  const handleConfirmAndProceed = () => {
    if (!!saleData.patient && saleData.clinicalHistoryItems.length > 0) {
      nextStep();
    } else {
      handleConfirmSaleAndSchedule({});
    }
  };

  const handleConfirmSaleAndSchedule = async (schedule) => {
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
        patientInfo: saleData.patient
          ? { id: saleData.patient.id, name: saleData.patient.name }
          : null,
        payments: saleData.payments,
        subtotal: totalSubtotal,
        discount: totalDiscount,
        total: saleData.total,
        debt: saleData.debt,
        items: saleData.cart.map((item) => ({
          id: item.id,
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
          if (item.source === 'online' && !item.isDoseable) {
              const productRef = doc(db, 'productos', item.id);
              batch.update(productRef, { stock: increment(-item.quantity) });
          }
      });

      const itemsForHistory = saleData.cart.filter((item) =>
        saleData.clinicalHistoryItems.includes(item.id)
      );

      if (itemsForHistory.length > 0 && saleData.patient?.id) {
        const treatmentText = itemsForHistory
          .map((s) =>
            s.isDoseable
              ? `${s.name} (${s.quantity} ${s.unit})`
              : `${s.quantity} x ${s.name}`
          )
          .join(", ");

        const clinicalNoteRef = doc(
          collection(db, `pacientes/${saleData.patient.id}/clinical_history`)
        );

        batch.set(clinicalNoteRef, {
          createdAt: saleTimestamp,
          reason: "Productos/servicios de venta",
          treatment: treatmentText,
          saleId: saleRef.id,
        });
      }

      if (saleData.debt > 0 && saleData.tutor?.id) {
        const tutorRef = doc(db, "tutores", saleData.tutor.id);
        batch.update(tutorRef, {
          accountBalance: increment(saleData.debt * -1),
        });
      }

      Object.keys(schedule).forEach((itemId) => {
        const days = schedule[itemId];
        if (days > 0 && saleData.patient?.id) {
          const item = saleData.cart.find((i) => i.id === itemId);
          const dueDate = new Date(saleTimestamp.toDate());
          dueDate.setDate(dueDate.getDate() + days);

          const vencimientoRef = doc(
            collection(db, `pacientes/${saleData.patient.id}/vencimientos`)
          );

          const vencimientoData = {
            productId: item.id,
            productName: item.name,
            tutorId: saleData.tutor.id,
            tutorName: saleData.tutor.name,
            pacienteId: saleData.patient.id,
            pacienteName: saleData.patient.name,
            appliedDate: saleTimestamp,
            appliedDosage: item.isDoseable
              ? `${item.quantity} ${item.unit}`
              : null,
            saleId: saleRef.id,
          };
          
          batch.set(vencimientoRef, {
            ...vencimientoData,
            dueDate: Timestamp.fromDate(dueDate),
            status: "pendiente",
            supplied: false,
            suppliedDate: null,
          });

          if (saleData.suministroItems.includes(itemId)) {
            const suministroRef = doc(
              collection(db, `pacientes/${saleData.patient.id}/vencimientos`)
            );
            batch.set(suministroRef, {
              ...vencimientoData,
              dueDate: saleTimestamp,
              status: "suministrado",
              supplied: true,
              suppliedDate: saleTimestamp,
            });
          }
        }
      });

      await batch.commit();
      updateSaleData({ 
        id: saleRef.id, 
        createdAt: saleTimestamp,
        subtotal: totalSubtotal,
        discount: totalDiscount
      });
      setStep(7);
    } catch (error) {
      console.error("Error confirming sale:", error);
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
      payments: [],
      debt: 0,
      total: 0,
      clinicalHistoryItems: [],
      suministroItems: [],
      saleTimestamp: Timestamp.now(),
    });
    navigate("/admin/vender");
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <SeleccionarTutor
            onTutorSelected={handleSelectTutor}
            onGenericSelected={handleGenericSale}
          />
        );
      case 2:
        return (
          <SeleccionarPaciente
            onPatientSelected={handleSelectPatient}
            onSkipPatient={handleSkipPatient}
            prevStep={prevStep}
            tutor={saleData.tutor}
          />
        );
      case 3:
        return (
          <SeleccionarProducto
            onProductsSelected={handleSelectProducts}
            prevStep={saleData.tutor ? prevStep : handleReset}
            initialCart={saleData.cart}
            saleData={saleData}
            onSaleDateChange={handleSaleDateChange}
          />
        );
      case 4:
        return (
          <MetodoPago
            onPaymentSelected={handlePaymentSelected}
            prevStep={prevStep}
            saleData={saleData}
          />
        );
      case 5:
        return (
          <ConfirmarVenta
            saleData={saleData}
            onConfirm={handleConfirmAndProceed}
            prevStep={prevStep}
            onToggleClinicalHistory={handleToggleClinicalHistoryItem}
            onToggleSuministro={handleToggleSuministroItem}
            isSubmitting={isSubmitting}
          />
        );
      case 6:
        return (
          <ProgramarVencimientos
            saleData={saleData}
            onConfirmAndSchedule={handleConfirmSaleAndSchedule}
            prevStep={prevStep}
            isSubmitting={isSubmitting}
          />
        );
      case 7:
        return <ResumenVenta saleData={saleData} onReset={handleReset} />;
      default:
        return <div>Paso desconocido</div>;
    }
  };

  return (
    <div className="venta-navigator-container">
      <div className="venta-step-indicator">
        <div
          className="venta-step-indicator-bar"
          style={{ width: `${((step - 1) / 6) * 100}%` }}
        ></div>
      </div>
      <div className="venta-step-content">{renderStep()}</div>
    </div>
  );
};

export default VenderNavigator;