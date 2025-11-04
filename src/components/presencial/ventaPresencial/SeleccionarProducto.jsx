import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import Swal from 'sweetalert2';
import SeleccionarPrecioModal from './SeleccionarPrecioModal';
import { Timestamp } from 'firebase/firestore';

const DosageModal = ({ isOpen, onClose, onConfirm, item }) => {
    const [amount, setAmount] = useState('');
    if (!isOpen) return null;

    const calculatedPrice = (parseFloat(amount) * item.pricePerML) || 0;

    const handleSubmit = () => {
        const dose = parseFloat(amount);
        if (dose > 0) {
            onConfirm(dose);
        }
    };

    return (
        <div className="dosage-modal-overlay">
            <div className="dosage-modal-content">
                <h3>Dosificar: {item.name}</h3>
                <p>Ingrese la cantidad en mililitros (ml) a vender.</p>
                <div className="dosage-input-group">
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ej: 0.4" autoFocus/>
                    <span>ml</span>
                </div>
                <div className="dosage-price-preview">
                    <span>Precio Calculado:</span>
                    <strong>${calculatedPrice.toFixed(2)}</strong>
                </div>
                <div className="dosage-modal-actions">
                    <button onClick={onClose} className="btn btn-secondary">Cancelar</button>
                    <button onClick={handleSubmit} className="btn btn-primary" disabled={!amount || parseFloat(amount) <= 0}>Confirmar</button>
                </div>
            </div>
        </div>
    );
};

const SeleccionarProducto = ({ onProductsSelected, prevStep, initialCart, saleData, onSaleDateChange }) => {
    const [onlineProducts, setOnlineProducts] = useState([]);
    const [presentialProducts, setPresentialProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [serviceCategories, setServiceCategories] = useState([]);
    
    const [viewMode, setViewMode] = useState('presential');
    const [isLoading, setIsLoading] = useState(true);
    const [cart, setCart] = useState(initialCart || []);
    
    const [filters, setFilters] = useState({ text: '', category: 'todas', status: 'true', tipo: 'todos' });
    const [sort, setSort] = useState('name-asc');
    
    const [isDosageModalOpen, setIsDosageModalOpen] = useState(false);
    const [itemToDose, setItemToDose] = useState(null);
    
    const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
    const [itemToEditPrice, setItemToEditPrice] = useState(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [onlineSnap, presentialSnap, catSnap, serviceCatSnap] = await Promise.all([ 
                getDocs(collection(db, 'productos')), 
                getDocs(collection(db, 'productos_presenciales')), 
                getDocs(collection(db, 'categories')), 
                getDocs(collection(db, 'services_categories')) 
            ]);
            const onlineData = onlineSnap.docs.map(doc => ({ 
                ...doc.data(), 
                id: doc.id, 
                name: doc.data().nombre, 
                price: doc.data().precio, 
                source: 'online' 
            }));
            const presentialData = presentialSnap.docs.map(doc => ({ 
                ...doc.data(), 
                id: doc.id, 
                name: doc.data().name, 
                price: doc.data().price, 
                source: 'presential' 
            }));
            setOnlineProducts(onlineData); 
            setPresentialProducts(presentialData); 
            setCategories(catSnap.docs.map(doc => doc.data())); 
            setServiceCategories(serviceCatSnap.docs.map(doc => doc.data()));
        } catch (error) { 
            Swal.fire('Error', 'No se pudieron cargar los productos.', 'error'); 
        } finally { 
            setIsLoading(false); 
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => { 
            const newFilters = { ...prev, [name]: value }; 
            if (name === 'tipo') { 
                newFilters.category = 'todas'; 
            } 
            return newFilters; 
        });
    };

    const handleViewChange = (mode) => { 
        setViewMode(mode); 
        setFilters({ text: '', category: 'todas', status: 'true', tipo: 'todos' }); 
    };

    const filteredAndSortedData = useMemo(() => {
        const sourceData = viewMode === 'online' ? onlineProducts : presentialProducts;
        let tempItems = [...sourceData]; 
        const lowerText = filters.text.toLowerCase();
        
        if (filters.text) { 
            tempItems = tempItems.filter(p => 
                (p.name && p.name.toLowerCase().includes(lowerText)) || 
                (p.categoryAdress && p.categoryAdress.toLowerCase().includes(lowerText)) || 
                (p.categoria && p.categoria.toLowerCase().includes(lowerText)) || 
                (p.subcategoria && p.subcategoria.toLowerCase().includes(lowerText))
            ); 
        }
        
        if (viewMode === 'online') { 
            if (filters.status) tempItems = tempItems.filter(p => p.activo === (filters.status === 'true')); 
            if (filters.category !== 'todas') tempItems = tempItems.filter(p => p.categoryAdress === filters.category);
        } else { 
            if (filters.tipo !== 'todos') tempItems = tempItems.filter(p => p.tipo === filters.tipo); 
            if (filters.category !== 'todas') tempItems = tempItems.filter(p => p.category === filters.category); 
        }
        
        tempItems.sort((a, b) => { 
            const nameA = a.name || ''; 
            const nameB = b.name || ''; 
            const priceA = a.price || 0; 
            const priceB = b.price || 0; 
            switch (sort) { 
                case 'name-asc': return nameA.localeCompare(nameB); 
                case 'name-desc': return nameB.localeCompare(nameA); 
                case 'price-asc': return priceA - priceB; 
                case 'price-desc': return priceB - priceA; 
                default: return 0; 
            } 
        });
        
        return tempItems;
    }, [filters, sort, viewMode, onlineProducts, presentialProducts]);

    const cartSummary = useMemo(() => {
        const subtotal = cart.reduce((sum, item) => sum + item.priceBeforeDiscount, 0);
        const totalDiscount = cart.reduce((sum, item) => sum + item.discountAmount, 0);
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        return { subtotal, totalDiscount, total };
    }, [cart]);

    const handleAddToCart = (item) => {
        if (item.source === 'online' && (item.stock === undefined || item.stock <= 0)) {
            Swal.fire('Sin Stock', 'Este producto no se encuentra disponible.', 'warning');
            return;
        }
        
        if (item.isDoseable) { 
            setItemToDose(item); 
            setIsDosageModalOpen(true);
        } else { 
            const existingItem = cart.find(cartItem => cartItem.id === item.id); 
            if (existingItem) { 
                changeQuantity(item.id, existingItem.quantity + 1); 
            } else { 
                setCart(prevCart => [...prevCart, { 
                    ...item, 
                    quantity: 1, 
                    originalPrice: item.price,
                    priceBeforeDiscount: item.price,
                    price: item.price,
                    discountType: null,
                    discountValue: 0,
                    discountAmount: 0,
                }]); 
            } 
        }
    };

    const handleConfirmDose = (dose) => {
        const finalPrice = dose * itemToDose.pricePerML;
        setCart(prev => [...prev, { 
            ...itemToDose, 
            quantity: dose,
            unit: 'ml', 
            id: `${itemToDose.id}-${Date.now()}`,
            originalPrice: itemToDose.pricePerML,
            priceBeforeDiscount: finalPrice,
            price: finalPrice, 
            discountType: null,
            discountValue: 0,
            discountAmount: 0,
        }]);
        setIsDosageModalOpen(false); 
        setItemToDose(null);
    };
    
    const changeQuantity = (itemId, newQuantity) => {
        const itemInCart = cart.find(item => item.id === itemId);
        if (!itemInCart) return;

        const originalItem = onlineProducts.find(p => p.id === itemId) || presentialProducts.find(p => p.id === itemId);
        
        if (originalItem && originalItem.source === 'online' && newQuantity > originalItem.stock) {
            Swal.fire('Stock Insuficiente', `Solo quedan ${originalItem.stock} unidades de este producto.`, 'warning');
            return;
        }

        if (newQuantity < 1) { 
            removeFromCart(itemId);
        } else { 
            setCart(prevCart => prevCart.map(item => {
                if (item.id !== itemId) return item;

                const newPriceBeforeDiscount = item.originalPrice * newQuantity;
                let newDiscountAmount = 0;

                if (item.discountType === 'percentage') {
                    newDiscountAmount = newPriceBeforeDiscount * (item.discountValue / 100);
                } else if (item.discountType === 'fixed') {
                    newDiscountAmount = item.discountValue;
                }
                
                const newFinalPrice = newPriceBeforeDiscount - newDiscountAmount;

                return { 
                    ...item, 
                    quantity: newQuantity,
                    priceBeforeDiscount: newPriceBeforeDiscount,
                    discountAmount: newDiscountAmount,
                    price: newFinalPrice
                };
            })); 
        }
    };

    const removeFromCart = (itemId) => setCart(prevCart => prevCart.filter(item => item.id !== itemId));
    
    const handleOpenPriceModal = (item) => {
        setItemToEditPrice(item);
        setIsPriceModalOpen(true);
    };

    const recalculatePrice = (item, newUnitBasePrice) => {
        const priceBeforeDiscount = newUnitBasePrice * item.quantity;
        let discountAmount = 0;

        if (item.discountType === 'percentage') {
            discountAmount = priceBeforeDiscount * (item.discountValue / 100);
        } else if (item.discountType === 'fixed') {
            discountAmount = item.discountValue;
        }
        
        const price = priceBeforeDiscount - discountAmount;
        
        return {
            ...item,
            originalPrice: newUnitBasePrice,
            priceBeforeDiscount,
            discountAmount,
            price
        };
    };

    const handleUpdateCartPrice = (itemId, newUnitPrice) => {
        setCart(prevCart => prevCart.map(item => {
            if (item.id === itemId) {
                const priceField = item.isDoseable ? 'pricePerML' : 'originalPrice';
                return recalculatePrice({ ...item, [priceField]: newUnitPrice }, newUnitPrice);
            }
            return item;
        }));
    };

    const handleUpdateProductPrice = (itemId, newUnitPrice) => {
        setCart(prevCart => prevCart.map(item => {
            if (item.id === itemId) {
                const priceField = item.isDoseable ? 'pricePerML' : 'originalPrice';
                return recalculatePrice({ ...item, [priceField]: newUnitPrice }, newUnitPrice);
            }
            return item;
        }));

        const updateProductList = (products) => 
            products.map(p => {
                if (p.id === itemId) {
                    if (p.isDoseable) {
                        return { ...p, pricePerML: newUnitPrice };
                    } else {
                        return { ...p, price: newUnitPrice, precio: newUnitPrice };
                    }
                }
                return p;
            });

        setOnlineProducts(prev => updateProductList(prev));
        setPresentialProducts(prev => updateProductList(prev));
    };

    const handleApplyDiscount = (itemId, discountType, discountValue) => {
        setCart(prevCart => prevCart.map(item => {
            if (item.id !== itemId) return item;

            let newDiscountAmount = 0;
            if (discountType === 'percentage') {
                newDiscountAmount = item.priceBeforeDiscount * (discountValue / 100);
            } else if (discountType === 'fixed') {
                newDiscountAmount = discountValue;
            } else {
                newDiscountAmount = 0;
            }
            
            const newFinalPrice = item.priceBeforeDiscount - newDiscountAmount;

            return {
                ...item,
                discountType: discountType,
                discountValue: discountValue,
                discountAmount: newDiscountAmount,
                price: newFinalPrice
            };
        }));
    };

    const formatDateForInput = (date) => {
        const d = new Date(date);
        const offset = d.getTimezoneOffset();
        const adjustedDate = new Date(d.getTime() - (offset*60*1000));
        return adjustedDate.toISOString().split('T')[0];
    };

    const handleChangeSaleDate = () => {
        const currentDate = saleData.saleTimestamp.toDate();
        
        Swal.fire({
            title: 'Cambiar Fecha de Venta',
            html: `<p>Seleccione la nueva fecha para esta venta. La fecha actual es ${currentDate.toLocaleDateString('es-AR')}.</p>
                   <input type="date" id="swal-sale-date" class="swal2-input" value="${formatDateForInput(currentDate)}">`,
            showCancelButton: true,
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const dateValue = document.getElementById('swal-sale-date').value;
                if (!dateValue) {
                    Swal.showValidationMessage('Por favor seleccione una fecha');
                    return false;
                }
                return dateValue;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const dateString = result.value;
                const newDate = new Date(dateString);
                const offset = newDate.getTimezoneOffset() * 60000;
                const adjustedDate = new Date(newDate.getTime() + offset);
                
                const newTimestamp = Timestamp.fromDate(adjustedDate);
                onSaleDateChange(newTimestamp);
                
                Swal.fire(
                    'Fecha Actualizada',
                    `La fecha de la venta se ha establecido a ${adjustedDate.toLocaleDateString('es-AR')}.`,
                    'success'
                );
            }
        });
    };
    
    const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg>;
    const CartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16"><path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.102 4l1.313 7h8.17l1.313-7H3.102zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>;
    const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>;
    const SyringeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="14" height="14" fill="currentColor"><path d="M495.9 166.1l-11.4-11.4c-12.5-12.5-32.8-12.5-45.3 0l-71.1 71.1-128-128c-12.5-12.5-32.8-12.5-45.3 0l-11.4 11.4c-12.5 12.5-12.5 32.8 0 45.3l128 128-71.1 71.1c-12.5 12.5-12.5 32.8 0 45.3l11.4 11.4c12.5 12.5 32.8 12.5 45.3 0l71.1-71.1 128 128c12.5 12.5 32.8 12.5 45.3 0l11.4-11.4c12.5-12.5 12.5-32.8 0-45.3l-128-128 71.1-71.1c12.5-12.5 12.5-32.8 0-45.3zM224 288L96 160l-45.3 45.3L160 313.8 224 288zm96 96l-33.8 33.8L416 544l45.3-45.3L320 384z"/></svg>;

    return (
        <div className="seleccionar-producto-container">
            <DosageModal 
                isOpen={isDosageModalOpen} 
                onClose={() => setIsDosageModalOpen(false)} 
                onConfirm={handleConfirmDose} 
                item={itemToDose} 
            />
            <SeleccionarPrecioModal
                isOpen={isPriceModalOpen}
                onClose={() => setIsPriceModalOpen(false)}
                item={itemToEditPrice}
                onUpdateCartPrice={handleUpdateCartPrice}
                onUpdateProductPrice={handleUpdateProductPrice}
                onApplyDiscount={handleApplyDiscount}
            />
            <h2>Paso 3: Seleccionar Items</h2>
            <div className="seleccionar-producto-layout">
                <div className="producto-browser-panel">
                    <div className="browser-controls">
                        <div className="venta-view-switcher">
                            <button onClick={() => handleViewChange('presential')} className={viewMode === 'presential' ? 'active' : ''}>Items Presenciales</button>
                            <button onClick={() => handleViewChange('online')} className={viewMode === 'online' ? 'active' : ''}>Productos Online</button>
                        </div>
                        <div className="venta-filters">
                            <input className="filter-input" type="text" name="text" placeholder="Buscar..." value={filters.text} onChange={handleFilterChange} />
                            {viewMode === 'presential' ? (
                                <>
                                    <select className="filter-select" name="tipo" value={filters.tipo} onChange={handleFilterChange}>
                                        <option value="todos">Todos</option>
                                        <option value="producto">Producto</option>
                                        <option value="servicio">Servicio</option>
                                    </select>
                                    <select className="filter-select" name="category" value={filters.category} onChange={handleFilterChange} disabled={filters.tipo === 'todos'}>
                                        <option value="todas">Categorías</option>
                                        {(filters.tipo === 'servicio' ? serviceCategories : categories).map(c => <option key={c.adress} value={c.adress}>{c.nombre}</option>)}
                                    </select>
                                </>
                            ) : (
                                <>
                                    <select className="filter-select" name="category" value={filters.category} onChange={handleFilterChange}>
                                        <option value="todas">Categorías Online</option>
                                        {categories.map(c => <option key={c.adress} value={c.adress}>{c.nombre}</option>)}
                                    </select>
                                    <select className="filter-select" name="status" value={filters.status} onChange={handleFilterChange}>
                                        <option value="true">Activos</option>
                                        <option value="false">Inactivos</option>
                                    </select>
                                </>
                            )}
                            <select className="filter-select" name="sort" value={sort} onChange={(e) => setSort(e.target.value)}>
                                <option value="name-asc">A-Z</option>
                                <option value="name-desc">Z-A</option>
                                <option value="price-asc">Menor Precio</option>
                                <option value="price-desc">Mayor Precio</option>
                            </select>
                        </div>
                    </div>
                    <div className="producto-list">
                        {isLoading ? <p>Cargando...</p> : filteredAndSortedData.map(item => { 
                            const isInCart = !item.isDoseable && cart.some(cartItem => cartItem.id === item.id); 
                            const isOutOfStock = item.source === 'online' && (item.stock === undefined || item.stock <= 0); 
                            return (
                                <div key={item.id} className={`producto-list-item ${isInCart ? 'in-cart' : ''} ${isOutOfStock ? 'out-of-stock' : ''}`}>
                                    <div className="item-details">
                                        <span className="item-name">
                                            {item.name} 
                                            {item.isDoseable && <span className="doseable-badge"><SyringeIcon /> ML</span>}
                                        </span>
                                        <span className="item-category">{item.categoria || item.category || ''}</span>
                                    </div>
                                    <div className="item-actions">
                                        {item.source === 'online' && (
                                            <span className={`item-stock ${item.stock <= 5 ? 'low-stock' : ''}`}>
                                                {isOutOfStock ? 'Sin Stock' : `${item.stock} u.`}
                                            </span>
                                        )}
                                        <span className="item-price">
                                            {item.isDoseable ? `$${(item.pricePerML || 0).toFixed(2)}/ml` : `$${(item.price || 0).toFixed(2)}`}
                                        </span>
                                        <button 
                                            className="add-item-btn" 
                                            onClick={() => handleAddToCart(item)} 
                                            disabled={isInCart || isOutOfStock}
                                        >
                                            {isInCart ? <CheckIcon/> : '+'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="smart-cart-panel">
                    <h3>Carrito de Venta</h3>
                    <div className="smart-cart-body">
                        {cart.length === 0 ? (
                            <div className="cart-empty-state">
                                <CartIcon/>
                                <p>Tu carrito está vacío</p>
                                <span>Agrega productos</span>
                            </div>
                        ) : (
                            <div className="cart-items-list">
                                {cart.map(item => (
                                    <div key={item.id} className="cart-item-card">
                                        <div className="card-item-info">
                                            <span className="card-item-name">{item.name}</span>
                                            <span className="card-item-price-unit">
                                                {item.isDoseable 
                                                    ? `${item.quantity} ml @ $${(item.originalPrice || item.pricePerML).toFixed(2)}/ml`
                                                    : `${item.quantity} u. @ $${item.originalPrice.toFixed(2)}/u.`
                                                }
                                            </span>
                                        </div>
                                        {item.discountAmount > 0 && (
                                            <div className="card-item-discount-info">
                                                <span>Precio original: ${item.priceBeforeDiscount.toFixed(2)}</span>
                                                <span>Descuento: -${item.discountAmount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="card-item-controls">
                                            {!item.isDoseable && (
                                                <div className="quantity-stepper">
                                                    <button onClick={() => changeQuantity(item.id, item.quantity - 1)}>-</button>
                                                    <span>{item.quantity}</span>
                                                    <button onClick={() => changeQuantity(item.id, item.quantity + 1)}>+</button>
                                                </div>
                                            )}
                                            <span 
                                                className={`card-item-subtotal clickable-price ${item.discountAmount > 0 ? 'is-discounted' : ''}`}
                                                onClick={() => handleOpenPriceModal(item)}
                                                title="Click para modificar precio/descuento"
                                            >
                                                ${(item.price).toFixed(2)}
                                            </span>
                                            <button className="remove-item-btn" onClick={() => removeFromCart(item.id)}>
                                                <TrashIcon/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {cart.length > 0 && (
                        <div className="cart-summary-footer">
                            <div className="summary-line">
                                <span>Subtotal</span>
                                <span>${cartSummary.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="summary-line discount">
                                <span>Descuentos</span>
                                <span>-${cartSummary.totalDiscount.toFixed(2)}</span>
                            </div>
                            <div className="summary-line total">
                                <span>Total</span>
                                <strong>${cartSummary.total.toFixed(2)}</strong>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="seleccionar-producto-footer">
                <div className="venta-context-info">
                    <span><strong>Tutor:</strong> {saleData.tutor?.name || 'Cliente Genérico'}</span>
                    <span><strong>Paciente:</strong> {saleData.patient?.name || 'N/A'}</span>
                    <div className="sale-date-changer">
                        <span><strong>Fecha Venta:</strong> {saleData.saleTimestamp.toDate().toLocaleDateString('es-AR')}</span>
                        <button onClick={handleChangeSaleDate} className="btn btn-outline btn-small">Cambiar Fecha</button>
                    </div>
                </div>
                <div className="navigator-buttons">
                    <button onClick={prevStep} className="btn btn-secondary">Anterior</button>
                    <button 
                        onClick={() => onProductsSelected(cart.map(({...rest}) => rest), cartSummary.total)} 
                        className="btn btn-primary" 
                        disabled={cart.length === 0}
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SeleccionarProducto;