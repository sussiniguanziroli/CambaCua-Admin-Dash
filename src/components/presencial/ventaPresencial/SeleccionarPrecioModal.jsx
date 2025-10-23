import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';

const SeleccionarPrecioModal = ({ isOpen, onClose, item, onUpdateCartPrice, onUpdateProductPrice, onApplyDiscount }) => {
    const [activeTab, setActiveTab] = useState('precio');
    
    const [newPrice, setNewPrice] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    
    const [discountType, setDiscountType] = useState('percentage');
    const [discountValue, setDiscountValue] = useState('');

    useEffect(() => {
        if (isOpen && item) {
            if (item.isDoseable) {
                setNewPrice(item.originalPrice?.toString() || item.pricePerML?.toString() || '');
            } else {
                setNewPrice(item.originalPrice?.toString() || item.price?.toString() || '');
            }
            
            setDiscountType(item.discountType || 'percentage');
            setDiscountValue(item.discountValue || '');
            setActiveTab('precio');
        }
    }, [isOpen, item]);

    if (!isOpen || !item) return null;

    const handleUpdateCartOnly = () => {
        const price = parseFloat(newPrice);
        if (isNaN(price) || price < 0) {
            Swal.fire('Error', 'Ingrese un precio válido', 'error');
            return;
        }
        onUpdateCartPrice(item.id, price);
        onClose();
    };

    const handleUpdateProductAndCart = async () => {
        const price = parseFloat(newPrice);
        if (isNaN(price) || price < 0) {
            Swal.fire('Error', 'Ingrese un precio válido', 'error');
            return;
        }

        setIsUpdating(true);
        try {
            const collection = item.source === 'online' ? 'productos' : 'productos_presenciales';
            const priceField = item.isDoseable ? 'pricePerML' : (item.source === 'online' ? 'precio' : 'price');
            
            const productRef = doc(db, collection, item.id);
            await updateDoc(productRef, {
                [priceField]: price
            });

            onUpdateProductPrice(item.id, price);
            Swal.fire('Actualizado', 'El precio del producto se ha actualizado correctamente', 'success');
            onClose();
        } catch (error) {
            console.error('Error updating product price:', error);
            Swal.fire('Error', 'No se pudo actualizar el precio del producto', 'error');
        } finally {
            setIsUpdating(false);
        }
    };
    
    const handleApplyDiscountClick = () => {
        const value = parseFloat(discountValue) || 0;
        onApplyDiscount(item.id, value > 0 ? discountType : null, value);
        onClose();
    };

    const currentPrice = item.isDoseable 
        ? (item.originalPrice || item.pricePerML || 0) 
        : (item.originalPrice || 0);

    const newTotal = (parseFloat(newPrice) || 0) * item.quantity;

    let discountPreview = 0;
    if (discountType === 'percentage') {
        discountPreview = item.priceBeforeDiscount * ((parseFloat(discountValue) || 0) / 100);
    } else {
        discountPreview = parseFloat(discountValue) || 0;
    }
    const newTotalWithDiscount = item.priceBeforeDiscount - discountPreview;

    return (
        <div className="precio-modal-overlay">
            <div className="precio-modal-content">
                <div className="precio-modal-item-info">
                    <span className="item-name">{item.name}</span>
                    {item.isDoseable && (
                        <span className="item-detail">Cantidad: {item.quantity} ml</span>
                    )}
                    {!item.isDoseable && (
                        <span className="item-detail">Cantidad: {item.quantity} unidades</span>
                    )}
                </div>

                <div className="modal-tabs">
                    <button 
                        className={`tab-btn ${activeTab === 'precio' ? 'active' : ''}`}
                        onClick={() => setActiveTab('precio')}
                    >
                        Modificar Precio
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'descuento' ? 'active' : ''}`}
                        onClick={() => setActiveTab('descuento')}
                    >
                        Aplicar Descuento
                    </button>
                </div>

                {activeTab === 'precio' && (
                    <div className="tab-content">
                        <h3>Modificar Precio</h3>
                        <div className="precio-current">
                            <span>Precio Actual {item.isDoseable ? '(por ml)' : '(por unidad)'}:</span>
                            <strong>${currentPrice.toFixed(2)}</strong>
                        </div>

                        <div className="precio-input-group">
                            <label>Nuevo Precio {item.isDoseable ? '(por ml)' : '(por unidad)'}</label>
                            <div className="input-wrapper">
                                <span className="currency">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newPrice}
                                    onChange={(e) => setNewPrice(e.target.value)}
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="precio-preview">
                            <div className="preview-row">
                                <span>Subtotal Anterior (sin dto):</span>
                                <span>${item.priceBeforeDiscount.toFixed(2)}</span>
                            </div>
                            <div className="preview-row new">
                                <span>Nuevo Subtotal (sin dto):</span>
                                <strong>${newTotal.toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'descuento' && (
                    <div className="tab-content discount-form">
                        <h3>Aplicar Descuento</h3>
                        
                        <div className="discount-type-selector">
                            <label>
                                <input 
                                    type="radio" 
                                    value="percentage" 
                                    checked={discountType === 'percentage'} 
                                    onChange={() => setDiscountType('percentage')} 
                                />
                                Porcentaje (%)
                            </label>
                            <label>
                                <input 
                                    type="radio" 
                                    value="fixed" 
                                    checked={discountType === 'fixed'} 
                                    onChange={() => setDiscountType('fixed')} 
                                />
                                Monto Fijo ($)
                            </label>
                        </div>
                        
                        <div className="precio-input-group">
                            <label>Valor del Descuento ({discountType === 'percentage' ? '%' : '$'})</label>
                            <div className="input-wrapper">
                                <span className="currency">{discountType === 'percentage' ? '%' : '$'}</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={discountValue}
                                    onChange={(e) => setDiscountValue(e.target.value)}
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>
                        </div>
                        
                        <div className="precio-preview">
                            <div className="preview-row">
                                <span>Subtotal (sin dto):</span>
                                <span>${item.priceBeforeDiscount.toFixed(2)}</span>
                            </div>
                            <div className="preview-row discount">
                                <span>Descuento:</span>
                                <span>-${discountPreview.toFixed(2)}</span>
                            </div>
                            <div className="preview-row new">
                                <span>Nuevo Subtotal:</span>
                                <strong>${newTotalWithDiscount.toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>
                )}

                <div className="precio-modal-actions">
                    <button 
                        onClick={onClose} 
                        className="btn btn-secondary"
                        disabled={isUpdating}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={activeTab === 'precio' ? handleUpdateCartOnly : handleApplyDiscountClick} 
                        className="btn btn-outline"
                        disabled={isUpdating}
                    >
                        {activeTab === 'precio' ? 'Solo este Carrito' : 'Aplicar Descuento'}
                    </button>
                    <button 
                        onClick={handleUpdateProductAndCart} 
                        className="btn btn-primary"
                        disabled={!newPrice || parseFloat(newPrice) < 0 || isUpdating || activeTab === 'descuento'}
                    >
                        {isUpdating ? 'Guardando...' : 'Guardar en Producto'}
                    </button>
                </div>

                <p className="precio-modal-note">
                    {activeTab === 'precio' ? (
                        <>
                            <strong>Solo este carrito:</strong> Modifica el precio base únicamente para esta venta.<br/>
                            <strong>Guardar en producto:</strong> Actualiza el precio base del producto permanentemente.
                        </>
                    ) : (
                        <strong>Aplicar Descuento:</strong> //Aplica un descuento a este ítem solo para esta venta.
                    )}
                </p>
            </div>
        </div>
    );
};

export default SeleccionarPrecioModal;