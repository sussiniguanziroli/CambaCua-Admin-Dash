import React, { useState, useMemo, useEffect } from 'react';
import { FaCcVisa, FaCcMastercard, FaCreditCard, FaMoneyBillWave, FaExchangeAlt } from 'react-icons/fa';

const MetodoPago = ({ onPaymentSelected, prevStep, saleData }) => {
    const [payments, setPayments] = useState(saleData.payments || []);
    
    const baseTotal = saleData.total;

    const totalSurcharges = useMemo(() => {
        return payments.reduce((acc, p) => acc + (p.surchargeAmount || 0), 0);
    }, [payments]);

    const totalWithSurcharges = baseTotal + totalSurcharges;
    const totalPaid = useMemo(() => payments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0), [payments]);
    const remainingBalance = useMemo(() => totalWithSurcharges - totalPaid, [totalWithSurcharges, totalPaid]);

    const calculateSurcharge = (amount, cardType) => {
        if (!cardType) return { percent: 0, amount: 0 };
        const rate = cardType === 'naranja' ? 0.15 : 0.10;
        return { percent: rate * 100, amount: amount * rate };
    };
    
    const addPaymentMethod = (method) => {
        const newPayment = { id: Date.now(), method, amount: '' };
        if (method === 'Tarjeta de Crédito' || method === 'Tarjeta de Débito') {
            newPayment.isCard = true;
            newPayment.cardType = null;
        }
        setPayments(prev => [...prev, newPayment]);
    };
    
    const updatePaymentAmount = (id, amount) => {
        setPayments(prev => prev.map(p => p.id === id ? { ...p, amount } : p));
    };

    const updateCardType = (id, cardType) => {
        setPayments(prev => {
            const currentPayment = prev.find(p => p.id === id);
            if (!currentPayment) return prev;

            const otherPaymentsTotal = prev
                .filter(p => p.id !== id)
                .reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
            
            const { percent, amount: newSurcharge } = calculateSurcharge(baseTotal, cardType);
            const newTotalWithSurcharge = baseTotal + newSurcharge;
            const requiredCardPayment = newTotalWithSurcharge - otherPaymentsTotal;

            return prev.map(p => p.id === id ? {
                ...p,
                cardType,
                surchargePercent: percent,
                surchargeAmount: newSurcharge,
                amount: requiredCardPayment > 0 ? requiredCardPayment.toFixed(2) : '0.00'
            } : p);
        });
    };
    
    const removePayment = (id) => {
         setPayments(prev => prev.filter(p => p.id !== id));
    };

    const handleNext = () => {
        let finalPayments = payments.filter(p => parseFloat(p.amount || 0) !== 0);
        let finalDebt = remainingBalance;

        if (remainingBalance < -0.01) {
            const vuelto = Math.abs(remainingBalance);
            
            finalPayments.push({
                id: `vuelto-${Date.now()}`,
                method: 'Efectivo',
                amount: -vuelto.toFixed(2),
                isVuelto: true
            });
            
            finalDebt = 0;
        }

        if (finalDebt < 0.01) {
            finalDebt = 0;
        }

        onPaymentSelected(finalPayments, finalDebt, totalWithSurcharges);
    };

    const isGenericAndHasDebt = !saleData.tutor && remainingBalance > 0.01;

    return (
        <div className="metodo-pago-container">
            <h2>Paso 4: Método de Pago</h2>
            
            <div className="venta-context-info">
                <span><strong>Tutor:</strong> {saleData.tutor?.name || 'Cliente Genérico'}</span>
                <span><strong>Paciente:</strong> {saleData.patient?.name || 'N/A'}</span>
            </div>

            <div className="metodo-pago-layout">
                <div className="payment-options-panel">
                    <div className="payment-adder">
                        <h4>Agregar Método de Pago</h4>
                        <div className="payment-buttons">
                            <button type="button" onClick={() => addPaymentMethod('Efectivo')}><FaMoneyBillWave/> Efectivo</button>
                            <button type="button" onClick={() => addPaymentMethod('Tarjeta de Débito')}><FaCreditCard/> T. Débito</button>
                            <button type="button" onClick={() => addPaymentMethod('Tarjeta de Crédito')}><FaCreditCard/> T. Crédito</button>
                            <button type="button" onClick={() => addPaymentMethod('Transferencia')}><FaExchangeAlt/> Transferencia</button>
                        </div>
                    </div>

                    {payments.length > 0 && (
                        <div className="registered-payments">
                            <h4>Pagos Registrados</h4>
                            {payments.map(payment => (
                                <div key={payment.id} className="payment-entry">
                                    <div className="payment-input-group">
                                        <label>{payment.method}</label>
                                        <input type="number" step="0.01" placeholder="0.00" value={payment.amount} onChange={(e) => updatePaymentAmount(payment.id, e.target.value)} />
                                        <button className="remove-btn" onClick={() => removePayment(payment.id)}>&times;</button>
                                    </div>
                                    {payment.isCard && payment.method === 'Tarjeta de Crédito' && (
                                        <div className="card-details">
                                            <div className="card-selector">
                                                <button type="button" className={payment.cardType === 'visa' ? 'active' : ''} onClick={() => updateCardType(payment.id, 'visa')}><FaCcVisa /> Visa</button>
                                                <button type="button" className={payment.cardType === 'mastercard' ? 'active' : ''} onClick={() => updateCardType(payment.id, 'mastercard')}><FaCcMastercard /> Mastercard</button>
                                                <button type="button" className={payment.cardType === 'naranja' ? 'active' : ''} onClick={() => updateCardType(payment.id, 'naranja')}><FaCreditCard /> Naranja</button>
                                            </div>
                                            {payment.surchargeAmount > 0 && (<div className="surcharge-info">Recargo ({payment.surchargePercent}%): <span>+${payment.surchargeAmount.toFixed(2)}</span></div>)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="payment-summary-panel">
                    <h3>Resumen</h3>
                    <div className="summary-row"><span>Subtotal</span><strong>${baseTotal.toFixed(2)}</strong></div>
                    {totalSurcharges > 0 && <div className="summary-row surcharge"><span>Recargos</span><strong>+${totalSurcharges.toFixed(2)}</strong></div>}
                    <div className="summary-row total"><span>Total a Pagar</span><strong>${totalWithSurcharges.toFixed(2)}</strong></div>
                    <div className="summary-row"><span>Total Abonado</span><strong>${totalPaid.toFixed(2)}</strong></div>
                    <div className={`summary-row remaining ${remainingBalance > 0.01 ? 'debt' : ''} ${remainingBalance < -0.01 ? 'change' : ''}`}>
                        <span>{remainingBalance < -0.01 ? 'Vuelto:' : 'Saldo Restante:'}</span>
                        <strong>${Math.abs(remainingBalance).toFixed(2)}</strong>
                    </div>
                    {remainingBalance > 0.01 && saleData.tutor && (<div className="debt-info">Este saldo se agregará a la cuenta corriente del tutor.</div>)}
                    {isGenericAndHasDebt && (<div className="debt-error">Las ventas a clientes genéricos deben abonarse en su totalidad.</div>)}
                </div>
            </div>

            <div className="navigator-buttons">
                <button type="button" onClick={prevStep} className="btn btn-secondary">Anterior</button>
                <button type="button" onClick={handleNext} className="btn btn-primary" disabled={isGenericAndHasDebt}>Siguiente</button>
            </div>
        </div>
    );
};

export default MetodoPago;