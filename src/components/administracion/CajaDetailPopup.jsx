import React, { useState, useEffect } from 'react';


const CajaDetailPopup = ({ data, onClose }) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsOpen(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        setTimeout(onClose, 250);
    };

    if (!data) return null;

    const { title, total, breakdown } = data;

    return (
        <div 
            className={`caja-popup-overlay ${isOpen ? 'open' : ''}`} 
            onClick={handleClose}
        >
            <div 
                className={`caja-popup-content ${isOpen ? 'open' : ''}`} 
                onClick={(e) => e.stopPropagation()}
            >
                <button className="caja-popup-close" onClick={handleClose}>&times;</button>
                <div className="caja-popup-header">
                    <span>{title}</span>
                    <strong>{total}</strong>
                </div>
                <ul className="caja-popup-breakdown">
                    {breakdown.length > 0 ? (
                        breakdown.map((item, index) => (
                            <li key={index}>
                                <span>{item.label}</span>
                                <strong>{item.value}</strong>
                            </li>
                        ))
                    ) : (
                        <li className="no-detail"><span>No hay detalles para mostrar.</span></li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default CajaDetailPopup;