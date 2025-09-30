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
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Soporte para arranque con tutor/paciente preseleccionados ---
  useEffect(() => {
    if (location.state) {
      const { tutor, patient } = location.state;

      if (tutor && patient) {
        setSaleData((prev) => ({ ...prev, tutor, patient }));
        setStep(3); // Salta directo a productos
      } else if (tutor) {
        setSaleData((prev) => ({ ...prev, tutor }));
        setStep(2); // Salta a selección de paciente
      }
    }
  }, [location.state]);

  // --- Helpers de navegación ---
  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const updateSaleData = (data) =>
    setSaleData((prev) => ({ ...prev, ...data }));

  // --- Selecciones ---
  const handleSelectTutor = (tutor) => {
    updateSaleData({
      tutor,
      patient: null,
      cart: [],
      total: 0,
      clinicalHistoryItems: [],
      payments: [],
      debt: 0,
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
      payments: [],
      debt: 0,
    });
    setStep(3); // Salta a productos
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

    updateSaleData({ cart, total, clinicalHistoryItems: serviceItems });
    nextStep();
  };

  const handlePaymentSelected = (payments, debt) => {
    updateSaleData({ payments, debt });
    nextStep();
  };

  const handleToggleClinicalHistoryItem = (itemId) => {
    setSaleData((prev) => {
      const newItems = prev.clinicalHistoryItems.includes(itemId)
        ? prev.clinicalHistoryItems.filter((id) => id !== itemId)
        : [...prev.clinicalHistoryItems, itemId];
      return { ...prev, clinicalHistoryItems: newItems };
    });
  };

  // --- Confirmación de venta ---
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
      const saleTimestamp = Timestamp.now();

      batch.set(saleRef, {
        createdAt: saleTimestamp,
        tutorInfo: saleData.tutor
          ? { id: saleData.tutor.id, name: saleData.tutor.name }
          : { id: "generic", name: "Cliente Genérico" },
        patientInfo: saleData.patient
          ? { id: saleData.patient.id, name: saleData.patient.name }
          : null,
        payments: saleData.payments,
        total: saleData.total,
        debt: saleData.debt,
        items: saleData.cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          source: item.source,
          tipo: item.tipo,
          isDoseable: item.isDoseable || false,
          unit: item.unit || null,
        })),
      });

      // --- Historia clínica ---
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

      // --- Cuenta corriente ---
      if (saleData.debt > 0 && saleData.tutor?.id) {
        const tutorRef = doc(db, "tutores", saleData.tutor.id);
        batch.update(tutorRef, {
          accountBalance: increment(saleData.debt * -1),
        });
      }

      // --- Vencimientos ---
      Object.keys(schedule).forEach((itemId) => {
        const days = schedule[itemId];
        if (days > 0 && saleData.patient?.id) {
          const item = saleData.cart.find((i) => i.id === itemId);
          const dueDate = new Date(saleTimestamp.toDate());
          dueDate.setDate(dueDate.getDate() + days);

          const vencimientoRef = doc(
            collection(db, `pacientes/${saleData.patient.id}/vencimientos`)
          );

          batch.set(vencimientoRef, {
            productId: item.id,
            productName: item.name,
            tutorId: saleData.tutor.id,
            tutorName: saleData.tutor.name,
            pacienteId: saleData.patient.id,
            pacienteName: saleData.patient.name,
            appliedDate: saleTimestamp,
            dueDate: Timestamp.fromDate(dueDate),
            appliedDosage: item.isDoseable
              ? `${item.quantity} ${item.unit}`
              : null,
            status: "pendiente",
            saleId: saleRef.id,
            supplied: false,
          });
        }
      });

      await batch.commit();
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
    });
    navigate("/admin/vender"); // 🔥 ahora funciona correctamente
  };

  // --- Renderizado de pasos ---
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
