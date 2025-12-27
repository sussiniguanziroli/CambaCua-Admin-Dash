import React, { useState } from 'react';
import { doc, writeBatch, collection, Timestamp, increment } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Swal from 'sweetalert2';
import { FaCcVisa, FaCcMastercard, FaCreditCard, FaMoneyBillWave, FaExchangeAlt } from 'react-icons/fa';

const PaySaleDebtModal = ({ sale, onClose, onPaymentComplete }) => {
    const [paymentMethod, setPaymentMethod] = useState('');
    const [amount, setAmount] = useState(sale.debt.toFixed(2));
    const [isSubmitting, setIsSubmitting] = useState(false);

    const remainingDebt = sale.debt;
    const paymentAmount = parseFloat(amount) || 0;
    const newDebt = Math.max(0, remainingDebt - paymentAmount);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!paymentMethod) {
            Swal.fire('Error', 'Seleccione un método de pago', 'error');
            return;
        }

        if (paymentAmount <= 0) {
            Swal.fire('Error', 'Ingrese un monto válido', 'error');
            return;
        }

        if (paymentAmount > remainingDebt) {
            Swal.fire('Error', 'El monto no puede ser mayor a la deuda', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            const batch = writeBatch(db);

            const pagoRef = doc(collection(db, 'pagos_deuda'));
            batch.set(pagoRef, {
                tutorId: sale.tutorInfo.id,
                tutorName: sale.tutorInfo.name,
                patientId: sale.patientInfo?.id || null,
                patientName: sale.patientInfo?.name || null,
                amount: paymentAmount,
                paymentMethod: paymentMethod,
                saleId: sale.id,
                saleType: sale.type,
                createdAt: Timestamp.now(),
                type: 'Cobro Deuda'
            });

            const saleRef = doc(db, 'ventas_presenciales', sale.id);
            const currentPayments = sale.payments || [];
            const updatedPayments = [
                ...currentPayments,
                {
                    id: pagoRef.id,
                    amount: paymentAmount,
                    method: paymentMethod,
                    date: Timestamp.now()
                }
            ];

            batch.update(saleRef, {
                debt: newDebt,
                payments: updatedPayments,
                paymentStatus: newDebt === 0 ? 'paid' : 'partial'
            });

            if (sale.tutorInfo?.id) {
                const tutorRef = doc(db, 'tutores', sale.tutorInfo.id);
                batch.update(tutorRef, {
                    accountBalance: increment(paymentAmount)
                });
            }

            await batch.commit();

            Swal.fire({
                title: 'Pago Registrado',
                text: `Se registró el pago de $${paymentAmount.toFixed(2)}`,
                icon: 'success',
                confirmButtonText: 'OK'
            });

            onPaymentComplete();
            onClose();

        } catch (error) {
            console.error('Error processing payment:', error);
            Swal.fire('Error', 'No se pudo procesar el pago', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="pay-debt-modal-overlay" onClick={onClose}>
            <div className="pay-debt-modal" onClick={(e) => e.stopPropagation()}>
                <h3>Cobrar Deuda de Venta</h3>

                <form onSubmit={handleSubmit}>
                    <div className="pay-debt-modal-body">
                        <div className="sale-info-summary">
                            <div className="info-row">
                                <span>Cliente:</span>
                                <strong>{sale.tutorInfo?.name || 'N/A'}</strong>
                            </div>
                            {sale.patientInfo?.name && (
                                <div className="info-row">
                                    <span>Paciente:</span>
                                    <strong>{sale.patientInfo.name}</strong>
                                </div>
                            )}
                            <div className="info-row">
                                <span>Fecha Venta:</span>
                                <strong>{sale.createdAt?.toDate().toLocaleDateString('es-AR')}</strong>
                            </div>
                            <div className="info-row">
                                <span>Total Venta:</span>
                                <strong>${sale.total.toFixed(2)}</strong>
                            </div>
                            <div className="info-row debt">
                                <span>Deuda Actual:</span>
                                <strong className="debt-amount">${remainingDebt.toFixed(2)}</strong>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Método de Pago</label>
                            <div className="payment-methods-grid">
                                <button
                                    type="button"
                                    className={`payment-method-btn ${paymentMethod === 'Efectivo' ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod('Efectivo')}
                                >
                                    <FaMoneyBillWave />
                                    <span>Efectivo</span>
                                </button>
                                <button
                                    type="button"
                                    className={`payment-method-btn ${paymentMethod === 'Tarjeta de Débito' ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod('Tarjeta de Débito')}
                                >
                                    <FaCreditCard />
                                    <span>T. Débito</span>
                                </button>
                                <button
                                    type="button"
                                    className={`payment-method-btn ${paymentMethod === 'Tarjeta de Crédito' ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod('Tarjeta de Crédito')}
                                >
                                    <FaCreditCard />
                                    <span>T. Crédito</span>
                                </button>
                                <button
                                    type="button"
                                    className={`payment-method-btn ${paymentMethod === 'Transferencia' ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod('Transferencia')}
                                >
                                    <FaExchangeAlt />
                                    <span>Transferencia</span>
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Monto a Pagar</label>
                            <div className="amount-input-wrapper">
                                <span className="currency-symbol">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    max={remainingDebt}
                                    required
                                />
                                <button
                                    type="button"
                                    className="btn-full-amount"
                                    onClick={() => setAmount(remainingDebt.toFixed(2))}
                                >
                                    Total
                                </button>
                            </div>
                            <small className="helper-text">
                                Máximo: ${remainingDebt.toFixed(2)}
                            </small>
                        </div>

                        <div className="payment-preview">
                            <div className="preview-row">
                                <span>Deuda Actual:</span>
                                <span>${remainingDebt.toFixed(2)}</span>
                            </div>
                            <div className="preview-row payment">
                                <span>Pago:</span>
                                <span>-${paymentAmount.toFixed(2)}</span>
                            </div>
                            <div className="preview-row total">
                                <span>Deuda Restante:</span>
                                <strong>${newDebt.toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Procesando...' : 'Registrar Pago'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PaySaleDebtModal;