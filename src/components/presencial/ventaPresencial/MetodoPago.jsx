import React, { useState, useMemo } from 'react';

const MetodoPago = ({ onPaymentSelected, prevStep, saleData }) => {
    const [payments, setPayments] = useState([]);
    
    const paymentOptions = ['Efectivo', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Transferencia'];

    const totalPaid = useMemo(() => {
        return payments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
    }, [payments]);

    const remainingBalance = useMemo(() => {
        return saleData.total - totalPaid;
    }, [saleData.total, totalPaid]);

    const addPaymentMethod = (method) => {
        if (payments.some(p => p.method === method) && method !== 'Efectivo') return;
        setPayments(prev => [...prev, {
            id: Date.now(),
            method: method,
            amount: method === 'Efectivo' ? '' : remainingBalance > 0 ? remainingBalance.toFixed(2) : ''
        }]);
    };

    const updatePaymentAmount = (id, amount) => {
        setPayments(prev => prev.map(p => p.id === id ? { ...p, amount } : p));
    };
    
    const removePayment = (id) => {
        setPayments(prev => prev.filter(p => p.id !== id));
    };

    const handleNext = () => {
        const finalPayments = payments.filter(p => parseFloat(p.amount) > 0);
        const debt = saleData.total - finalPayments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
        onPaymentSelected(finalPayments, debt);
    };

    const isGenericAndHasDebt = !saleData.tutor && remainingBalance > 0;

    return (
        <div className="venta-step-container venta-payment-container">
            <h2>Paso 4: Método de Pago</h2>
            <div className="venta-payment-layout">
                <div className="venta-payment-options">
                    <h4>Agregar Método de Pago</h4>
                    <div className="venta-payment-buttons">
                        {paymentOptions.map(option => (
                            <button key={option} type="button" onClick={() => addPaymentMethod(option)}>
                                {option}
                            </button>
                        ))}
                    </div>
                    {payments.length > 0 && (
                        <div className="venta-added-payments">
                            <h4>Pagos Registrados</h4>
                            {payments.map(payment => (
                                <div key={payment.id} className="venta-payment-input-group">
                                    <label>{payment.method}</label>
                                    <input type="number" step="0.01" placeholder="0.00" value={payment.amount} onChange={(e) => updatePaymentAmount(payment.id, e.target.value)} />
                                    <button className="remove-payment-btn" onClick={() => removePayment(payment.id)}>&times;</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="venta-payment-summary">
                    <h3>Resumen</h3>
                    <div className="summary-row"><span>Total de la Venta:</span><strong>${saleData.total.toFixed(2)}</strong></div>
                    <div className="summary-row"><span>Total Abonado:</span><strong>${totalPaid.toFixed(2)}</strong></div>
                    <div className={`summary-row remaining ${remainingBalance > 0 ? 'debt' : ''}`}><span>Saldo Restante:</span><strong>${remainingBalance.toFixed(2)}</strong></div>
                    {remainingBalance > 0 && saleData.tutor && (<div className="debt-info">Este saldo se agregará a la cuenta corriente del tutor.</div>)}
                    {isGenericAndHasDebt && (<div className="debt-error">Las ventas a clientes genéricos deben abonarse en su totalidad.</div>)}
                </div>
            </div>
            <div className="venta-navigator-buttons">
                <button type="button" onClick={prevStep} className="btn btn-secondary">Anterior</button>
                <button type="button" onClick={handleNext} className="btn btn-primary" disabled={totalPaid > saleData.total || isGenericAndHasDebt}>
                    {remainingBalance > 0 && saleData.tutor ? 'Confirmar y Dejar Saldo' : 'Siguiente'}
                </button>
            </div>
        </div>
    );
};

export default MetodoPago;