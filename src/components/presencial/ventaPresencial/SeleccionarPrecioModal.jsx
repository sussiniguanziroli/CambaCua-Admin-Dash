import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';

const SeleccionarPrecioModal = ({ isOpen, onClose, item, onUpdateCartPrice, onUpdateProductPrice }) => {
    const [newPrice, setNewPrice] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (isOpen && item) {
            // Set initial price based on item type
            if (item.isDoseable) {
                setNewPrice(item.pricePerML?.toString() || '');
            } else {
                setNewPrice(item.originalPrice?.toString() || item.price?.toString() || '');
            }
        }
    }, [isOpen, item]);

    if (!isOpen || !item) return null;

    const handleUpdateCartOnly = () => {
        const price = parseFloat(newPrice);
        if (isNaN(price) || price < 0) {
            Swal.fire('Error', 'Ingrese un precio válido', 'error');
            return;
        }

        if (item.isDoseable) {
            // For doseable items, update pricePerML and recalculate total
            const newTotal = price * item.quantity;
            onUpdateCartPrice(item.id, price, newTotal);
        } else {
            // For regular items, update unit price and recalculate total
            const newTotal = price * item.quantity;
            onUpdateCartPrice(item.id, price, newTotal);
        }
        
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
            // Determine collection and field to update
            const collection = item.source === 'online' ? 'productos' : 'productos_presenciales';
            const priceField = item.isDoseable ? 'pricePerML' : (item.source === 'online' ? 'precio' : 'price');
            
            const productRef = doc(db, collection, item.id);
            await updateDoc(productRef, {
                [priceField]: price
            });

            // Update cart with new price
            if (item.isDoseable) {
                const newTotal = price * item.quantity;
                onUpdateProductPrice(item.id, price, newTotal);
            } else {
                const newTotal = price * item.quantity;
                onUpdateProductPrice(item.id, price, newTotal);
            }

            Swal.fire('Actualizado', 'El precio del producto se ha actualizado correctamente', 'success');
            onClose();
        } catch (error) {
            console.error('Error updating product price:', error);
            Swal.fire('Error', 'No se pudo actualizar el precio del producto', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const currentPrice = item.isDoseable 
        ? (item.pricePerML || 0) 
        : (item.originalPrice || item.price || 0);

    const newTotal = (parseFloat(newPrice) || 0) * item.quantity;

    return (
        <div className="precio-modal-overlay">
            <div className="precio-modal-content">
                <h3>Modificar Precio</h3>
                <div className="precio-modal-item-info">
                    <span className="item-name">{item.name}</span>
                    {item.isDoseable && (
                        <span className="item-detail">Cantidad: {item.quantity} ml</span>
                    )}
                    {!item.isDoseable && (
                        <span className="item-detail">Cantidad: {item.quantity} unidades</span>
                    )}
                </div>

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
                        <span>Subtotal Anterior:</span>
                        <span>${item.price.toFixed(2)}</span>
                    </div>
                    <div className="preview-row new">
                        <span>Nuevo Subtotal:</span>
                        <strong>${newTotal.toFixed(2)}</strong>
                    </div>
                </div>

                <div className="precio-modal-actions">
                    <button 
                        onClick={onClose} 
                        className="btn btn-secondary"
                        disabled={isUpdating}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleUpdateCartOnly} 
                        className="btn btn-outline"
                        disabled={!newPrice || parseFloat(newPrice) < 0 || isUpdating}
                    >
                        Solo este Carrito
                    </button>
                    <button 
                        onClick={handleUpdateProductAndCart} 
                        className="btn btn-primary"
                        disabled={!newPrice || parseFloat(newPrice) < 0 || isUpdating}
                    >
                        {isUpdating ? 'Guardando...' : 'Guardar en Producto'}
                    </button>
                </div>

                <p className="precio-modal-note">
                    <strong>Solo este carrito:</strong> Modifica el precio únicamente para esta venta.<br/>
                    <strong>Guardar en producto:</strong> Actualiza el precio del producto permanentemente.
                </p>
            </div>
        </div>
    );
};

export default SeleccionarPrecioModal;