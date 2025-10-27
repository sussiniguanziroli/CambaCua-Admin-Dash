import React, { useState } from "react";
import {
  doc,
  writeBatch,
  collection,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "../../../firebase/config";

const AddDebtModal = ({ tutor, onClose, onDebtAdded, setAlertInfo }) => {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const debtAmount = parseFloat(amount);
    if (!debtAmount || debtAmount <= 0) {
      setAlertInfo({
        title: "Error",
        text: "Ingrese un monto válido.",
        type: "error",
      });
      return;
    }
    if (!reason.trim()) {
      setAlertInfo({
        title: "Error",
        text: "Debe ingresar un motivo para el ajuste.",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);

      const adjustmentRef = doc(collection(db, "ajustes_cuenta"));
      batch.set(adjustmentRef, {
        tutorId: tutor.id,
        tutorName: tutor.name,
        amount: debtAmount,
        reason: reason.trim(),
        type: "Ajuste Manual - Deuda",
        createdAt: serverTimestamp(),
      });

      const tutorRef = doc(db, "tutores", tutor.id);
      batch.update(tutorRef, { accountBalance: increment(-debtAmount) });

      await batch.commit();
      onDebtAdded();
      setAlertInfo({
        title: "Éxito",
        text: "Deuda agregada correctamente.",
        type: "success",
      });
    } catch (error) {
      setAlertInfo({
        title: "Error",
        text: "No se pudo registrar el ajuste de deuda.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
        <h3>Agregar Deuda Manual a {tutor.name}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Monto a Adeudar</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="Ej: 5000"
            />
          </div>
          <div className="form-group">
            <label>Motivo del Ajuste</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="Ej: Deuda inicial, ajuste contable"
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Agregando..." : "Agregar Deuda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDebtModal;