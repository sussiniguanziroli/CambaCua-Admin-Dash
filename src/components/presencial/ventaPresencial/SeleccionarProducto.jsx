import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import Swal from 'sweetalert2';
import SeleccionarPrecioModal from './SeleccionarPrecioModal';

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

const SeleccionarProducto = ({ onProductsSelected, prevStep, initialCart, saleData }) => {
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
    
    // New state for price modal
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

    const total = useMemo(() => cart.reduce((sum, item) => sum + item.price, 0), [cart]);

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
                    originalPrice: item.price 
                }]); 
            } 
        }
    };

    const handleConfirmDose = (dose) => {
        const finalPrice = dose * itemToDose.pricePerML;
        setCart(prev => [...prev, { 
            ...itemToDose, 
            quantity: dose, 
            price: finalPrice, 
            unit: 'ml', 
            id: `${itemToDose.id}-${Date.now()}`,
            originalPrice: itemToDose.pricePerML
        }]);
        setIsDosageModalOpen(false); 
        setItemToDose(null);
    };
    
    const changeQuantity = (itemId, newQuantity) => {
        const itemInCart = cart.find(item => item.id === itemId);
        const originalItem = onlineProducts.find(p => p.id === itemId);
        
        if (originalItem && originalItem.source === 'online' && newQuantity > originalItem.stock) {
            Swal.fire('Stock Insuficiente', `Solo quedan ${originalItem.stock} unidades de este producto.`, 'warning');
            return;
        }

        if (newQuantity < 1) { 
            removeFromCart(itemId);
        } else { 
            setCart(prevCart => prevCart.map(item => 
                item.id === itemId 
                    ? { ...item, price: item.originalPrice * newQuantity, quantity: newQuantity } 
                    : item
            )); 
        }
    };

    const removeFromCart = (itemId) => setCart(prevCart => prevCart.filter(item => item.id !== itemId));
    
    // Open price modal
    const handleOpenPriceModal = (item) => {
        setItemToEditPrice(item);
        setIsPriceModalOpen(true);
    };

    // Update price only in cart
    const handleUpdateCartPrice = (itemId, newUnitPrice, newTotal) => {
        setCart(prevCart => prevCart.map(item => {
            if (item.id === itemId) {
                if (item.isDoseable) {
                    return {
                        ...item,
                        pricePerML: newUnitPrice,
                        originalPrice: newUnitPrice,
                        price: newTotal
                    };
                } else {
                    return {
                        ...item,
                        originalPrice: newUnitPrice,
                        price: newTotal
                    };
                }
            }
            return item;
        }));
    };

    // Update price in product database and cart
    const handleUpdateProductPrice = (itemId, newUnitPrice, newTotal) => {
        // Update cart
        setCart(prevCart => prevCart.map(item => {
            if (item.id === itemId) {
                if (item.isDoseable) {
                    return {
                        ...item,
                        pricePerML: newUnitPrice,
                        originalPrice: newUnitPrice,
                        price: newTotal
                    };
                } else {
                    return {
                        ...item,
                        originalPrice: newUnitPrice,
                        price: newTotal
                    };
                }
            }
            return item;
        }));

        // Update the product lists to reflect new price
        const updateProductList = (products) => 
            products.map(p => {
                if (p.id === itemId) {
                    if (p.isDoseable) {
                        return { ...p, pricePerML: newUnitPrice };
                    } else {
                        return { ...p, price: newUnitPrice };
                    }
                }
                return p;
            });

        setOnlineProducts(prev => updateProductList(prev));
        setPresentialProducts(prev => updateProductList(prev));
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
                                        <div className="card-item-controls">
                                            {!item.isDoseable && (
                                                <div className="quantity-stepper">
                                                    <button onClick={() => changeQuantity(item.id, item.quantity - 1)}>-</button>
                                                    <span>{item.quantity}</span>
                                                    <button onClick={() => changeQuantity(item.id, item.quantity + 1)}>+</button>
                                                </div>
                                            )}
                                            <span 
                                                className="card-item-subtotal clickable-price" 
                                                onClick={() => handleOpenPriceModal(item)}
                                                title="Click para modificar precio"
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
                                <span>${total.toFixed(2)}</span>
                            </div>
                            <div className="summary-line total">
                                <span>Total</span>
                                <strong>${total.toFixed(2)}</strong>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="seleccionar-producto-footer">
                <div className="venta-context-info">
                    <span><strong>Tutor:</strong> {saleData.tutor?.name || 'Cliente Genérico'}</span>
                    <span><strong>Paciente:</strong> {saleData.patient?.name || 'N/A'}</span>
                </div>
                <div className="navigator-buttons">
                    <button onClick={prevStep} className="btn btn-secondary">Anterior</button>
                    <button 
                        onClick={() => onProductsSelected(cart.map(({originalPrice, ...rest}) => rest), total)} 
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