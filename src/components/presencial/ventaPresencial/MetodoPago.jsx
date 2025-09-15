import React, { useState } from 'react';

const MetodoPago = ({ onPaymentMethodSelected, prevStep }) => {
    const [paymentMethod, setPaymentMethod] = useState('');
    const paymentOptions = ['Efectivo', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Transferencia'];

    return (
        <div className="metodo-pago">
            <h2>Paso 4: Seleccionar Método de Pago</h2>
            <div className="payment-options">
                {paymentOptions.map(option => (
                    <button 
                        key={option} 
                        onClick={() => setPaymentMethod(option)}
                        className={`payment-option-btn ${paymentMethod === option ? 'selected' : ''}`}
                    >
                        {option}
                    </button>
                ))}
            </div>
            <div className="navigator-buttons">
                <button onClick={prevStep} className="btn-secondary">Anterior</button>
                <button onClick={() => onPaymentMethodSelected(paymentMethod)} disabled={!paymentMethod}>Siguiente</button>
            </div>
        </div>
    );
};

export default MetodoPago;

