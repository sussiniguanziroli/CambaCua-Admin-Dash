// SeleccionarProducto.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import Swal from 'sweetalert2';
import SeleccionarPrecioModal from './SeleccionarPrecioModal';

let productsCache = null;
let categoriesCache = null;
let serviceCategoriesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 10 * 60 * 1000;

const DosageModal = ({ isOpen, onClose, onConfirm, item }) => {
    const [amount, setAmount] = useState('');
    if (!isOpen || !item) return null;
    const calculatedPrice = (parseFloat(amount) * item.pricePerML) || 0;
    return (
        <div className="dosage-modal-overlay">
            <div className="dosage-modal-content">
                <h3>Dosificar: {item.displayName}</h3>
                <p>Ingrese la cantidad en mililitros (ml) a vender.</p>
                <div className="dosage-input-group">
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ej: 0.4" autoFocus />
                    <span>ml</span>
                </div>
                <div className="dosage-price-preview">
                    <span>Precio Calculado:</span>
                    <strong>${calculatedPrice.toFixed(2)}</strong>
                </div>
                <div className="dosage-modal-actions">
                    <button onClick={onClose} className="btn btn-secondary">Cancelar</button>
                    <button onClick={() => parseFloat(amount) > 0 && onConfirm(parseFloat(amount))} className="btn btn-primary" disabled={!amount || parseFloat(amount) <= 0}>Confirmar</button>
                </div>
            </div>
        </div>
    );
};

const ProductListItem = React.memo(({ item, isInCart, onAddToCart }) => {
    const stockValue = item.stock || 0;
    return (
        <div className={`producto-list-item ${isInCart ? 'in-cart' : ''}`}>
            <div className="item-details">
                <span className="item-name">
                    {item.displayName}
                    {item.isDoseable && <span className="doseable-badge">ML</span>}
                </span>
                <div className="item-meta">
                    <span className="item-category">{item.displayCategory || ''}</span>
                    <span className={`source-badge ${item.source}`}>{item.source === 'online' ? 'Online' : 'Presencial'}</span>
                    {item.tipo && <span className={`type-badge ${item.tipo}`}>{item.tipo === 'servicio' ? 'Servicio' : 'Producto'}</span>}
                </div>
            </div>
            <div className="item-actions">
                <span className={`item-stock ${stockValue <= 5 && stockValue > 0 ? 'low-stock' : ''} ${stockValue === 0 ? 'no-stock-indicator' : ''}`}>
                    {stockValue} u.
                </span>
                <span className="item-price">
                    {item.isDoseable ? `$${(item.pricePerML || 0).toFixed(2)}/ml` : `$${(item.displayPrice || 0).toFixed(2)}`}
                </span>
                <button className="add-item-btn" onClick={() => onAddToCart(item)} disabled={isInCart}>
                    {isInCart ? '✓' : '+'}
                </button>
            </div>
        </div>
    );
});
ProductListItem.displayName = 'ProductListItem';

const CartItem = React.memo(({ item, onChangeQuantity, onOpenPriceModal, onRemove }) => {
    const TrashIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
        </svg>
    );
    return (
        <div className="cart-item-card">
            <div className="card-item-info">
                <span className="card-item-name">{item.displayName}</span>
                <span className="card-item-price-unit">
                    {item.isDoseable
                        ? `${item.quantity} ml @ $${(item.originalPrice || item.pricePerML || 0).toFixed(2)}/ml`
                        : `${item.quantity} u. @ $${(item.originalPrice || 0).toFixed(2)}/u.`}
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
                        <button onClick={() => onChangeQuantity(item.id, item.quantity - 1)}>-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => onChangeQuantity(item.id, item.quantity + 1)}>+</button>
                    </div>
                )}
                <span
                    className={`card-item-subtotal clickable-price ${item.discountAmount > 0 ? 'is-discounted' : ''}`}
                    onClick={() => onOpenPriceModal(item)}
                    title="Click para modificar precio/descuento"
                >
                    ${(item.price || 0).toFixed(2)}
                </span>
                <button className="remove-item-btn" onClick={() => onRemove(item.id)}><TrashIcon /></button>
            </div>
        </div>
    );
});
CartItem.displayName = 'CartItem';

const SeleccionarProducto = ({ onProductsSelected, prevStep, initialCart, saleData, onSaleDateChange }) => {
    const [allProducts, setAllProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [serviceCategories, setServiceCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cart, setCart] = useState(initialCart || []);
    const [filters, setFilters] = useState({ text: '', category: 'todas', tipo: 'todos' });
    const [sort, setSort] = useState('name-asc');
    const [isDosageModalOpen, setIsDosageModalOpen] = useState(false);
    const [itemToDose, setItemToDose] = useState(null);
    const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
    const [itemToEditPrice, setItemToEditPrice] = useState(null);

    const isCacheValid = useCallback(() =>
        productsCache && categoriesCache && serviceCategoriesCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION), []);

    const fetchData = useCallback(async (forceRefresh = false) => {
        if (!forceRefresh && isCacheValid()) {
            setAllProducts(productsCache); setCategories(categoriesCache); setServiceCategories(serviceCategoriesCache); setIsLoading(false); return;
        }
        setIsLoading(true);
        try {
            const [onlineSnap, presentialSnap, catSnap, serviceCatSnap] = await Promise.all([
                getDocs(collection(db, 'productos')), getDocs(collection(db, 'productos_presenciales')),
                getDocs(collection(db, 'categories')), getDocs(collection(db, 'services_categories')),
            ]);
            const onlineData = onlineSnap.docs.map(doc => { const d = doc.data(); return { ...d, id: doc.id, source: 'online', displayName: d.nombre || d.name, displayPrice: d.precio || d.price, displayCategory: d.categoryAdress || d.categoria }; });
            const presentialData = presentialSnap.docs.map(doc => { const d = doc.data(); return { ...d, id: doc.id, source: 'presential', displayName: d.name || d.nombre, displayPrice: d.price || d.precio, displayCategory: d.category || d.categoria, keyCode: d.keyCode, barcode: d.barcode }; });
            const combined = [...onlineData, ...presentialData];
            const cats = catSnap.docs.map(doc => doc.data());
            const serviceCats = serviceCatSnap.docs.map(doc => doc.data());
            productsCache = combined; categoriesCache = cats; serviceCategoriesCache = serviceCats; cacheTimestamp = Date.now();
            setAllProducts(combined); setCategories(cats); setServiceCategories(serviceCats);
        } catch (e) { console.error(e); Swal.fire('Error', 'No se pudieron cargar los productos.', 'error'); }
        finally { setIsLoading(false); }
    }, [isCacheValid]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilters(prev => { const next = { ...prev, [name]: value }; if (name === 'tipo') next.category = 'todas'; return next; });
    }, []);

    const filteredAndSortedData = useMemo(() => {
        let items = [...allProducts];
        const lower = filters.text.toLowerCase();
        if (filters.text) items = items.filter(p => p.displayName?.toLowerCase().includes(lower) || p.displayCategory?.toLowerCase().includes(lower) || p.subcategoria?.toLowerCase().includes(lower) || (p.keyCode && String(p.keyCode).toLowerCase().includes(lower)) || (p.barcode && String(p.barcode).toLowerCase().includes(lower)));
        if (filters.tipo !== 'todos') items = items.filter(p => p.tipo === filters.tipo);
        if (filters.category !== 'todas') items = items.filter(p => p.categoryAdress === filters.category || p.category === filters.category || p.displayCategory === filters.category);
        items.sort((a, b) => {
            const nA = a.displayName || '', nB = b.displayName || '', pA = a.displayPrice || 0, pB = b.displayPrice || 0;
            switch (sort) {
                case 'name-asc': return nA.localeCompare(nB);
                case 'name-desc': return nB.localeCompare(nA);
                case 'price-asc': return pA - pB;
                case 'price-desc': return pB - pA;
                default: return 0;
            }
        });
        return items;
    }, [filters, sort, allProducts]);

    const cartSummary = useMemo(() => ({
        subtotal: cart.reduce((s, i) => s + i.priceBeforeDiscount, 0),
        totalDiscount: cart.reduce((s, i) => s + i.discountAmount, 0),
        total: cart.reduce((s, i) => s + i.price, 0),
    }), [cart]);

    const handleAddToCart = useCallback((item) => {
        if (item.isDoseable) { setItemToDose(item); setIsDosageModalOpen(true); return; }
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            setCart(prev => prev.map(c => {
                if (c.id !== item.id) return c;
                const newQty = c.quantity + 1, newPBD = c.originalPrice * newQty;
                let newDiscount = 0;
                if (c.discountType === 'percentage') newDiscount = newPBD * (c.discountValue / 100);
                else if (c.discountType === 'fixed') newDiscount = c.discountValue;
                return { ...c, quantity: newQty, priceBeforeDiscount: newPBD, discountAmount: newDiscount, price: newPBD - newDiscount };
            }));
        } else {
            const itemPrice = item.displayPrice || 0;
            setCart(prev => [...prev, { ...item, name: item.displayName, quantity: 1, originalPrice: itemPrice, priceBeforeDiscount: itemPrice, price: itemPrice, discountType: null, discountValue: 0, discountAmount: 0 }]);
        }
    }, [cart]);

    const handleConfirmDose = useCallback((dose) => {
        const finalPrice = dose * itemToDose.pricePerML;
        setCart(prev => [...prev, { ...itemToDose, name: itemToDose.displayName, quantity: dose, unit: 'ml', id: `${itemToDose.id}-${Date.now()}`, originalProductId: itemToDose.id, originalPrice: itemToDose.pricePerML, priceBeforeDiscount: finalPrice, price: finalPrice, discountType: null, discountValue: 0, discountAmount: 0 }]);
        setIsDosageModalOpen(false); setItemToDose(null);
    }, [itemToDose]);

    const changeQuantity = useCallback((itemId, newQty) => {
        if (newQty < 1) { setCart(prev => prev.filter(i => i.id !== itemId)); return; }
        setCart(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            const newPBD = item.originalPrice * newQty;
            let newDiscount = 0;
            if (item.discountType === 'percentage') newDiscount = newPBD * (item.discountValue / 100);
            else if (item.discountType === 'fixed') newDiscount = item.discountValue;
            return { ...item, quantity: newQty, priceBeforeDiscount: newPBD, discountAmount: newDiscount, price: newPBD - newDiscount };
        }));
    }, []);

    const removeFromCart = useCallback((itemId) => setCart(prev => prev.filter(i => i.id !== itemId)), []);
    const handleOpenPriceModal = useCallback((item) => { setItemToEditPrice(item); setIsPriceModalOpen(true); }, []);

    const recalculatePrice = useCallback((item, newUnitBasePrice) => {
        const priceBeforeDiscount = newUnitBasePrice * item.quantity;
        let discountAmount = 0;
        if (item.discountType === 'percentage') discountAmount = priceBeforeDiscount * (item.discountValue / 100);
        else if (item.discountType === 'fixed') discountAmount = item.discountValue;
        return { ...item, originalPrice: newUnitBasePrice, priceBeforeDiscount, discountAmount, price: priceBeforeDiscount - discountAmount };
    }, []);

    const handleUpdateCartPrice = useCallback((itemId, newUnitPrice) => {
        setCart(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            return recalculatePrice({ ...item, [item.isDoseable ? 'pricePerML' : 'originalPrice']: newUnitPrice }, newUnitPrice);
        }));
    }, [recalculatePrice]);

    const handleUpdateProductPrice = useCallback((itemId, newUnitPrice) => {
        setCart(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            return recalculatePrice({ ...item, [item.isDoseable ? 'pricePerML' : 'originalPrice']: newUnitPrice }, newUnitPrice);
        }));
        const originalId = allProducts.find(p => p.id === itemId)?.id || itemId;
        const updateProduct = p => {
            if (p.id !== originalId) return p;
            if (p.isDoseable) return { ...p, pricePerML: newUnitPrice, displayPrice: newUnitPrice };
            const updated = { ...p, displayPrice: newUnitPrice };
            if (p.source === 'online') updated.precio = newUnitPrice; else updated.price = newUnitPrice;
            return updated;
        };
        setAllProducts(prev => prev.map(updateProduct));
        if (productsCache) productsCache = productsCache.map(updateProduct);
    }, [recalculatePrice, allProducts]);

    const handleApplyDiscount = useCallback((itemId, discountType, discountValue) => {
        setCart(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            let newDiscountAmount = 0;
            if (discountType === 'percentage') newDiscountAmount = item.priceBeforeDiscount * (discountValue / 100);
            else if (discountType === 'fixed') newDiscountAmount = discountValue;
            return { ...item, discountType, discountValue, discountAmount: newDiscountAmount, price: item.priceBeforeDiscount - newDiscountAmount };
        }));
    }, []);

    const handleChangeSaleDate = useCallback(() => {
        const currentDate = saleData.saleTimestamp.toDate();
        const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        Swal.fire({
            title: 'Cambiar Fecha de Venta',
            html: `<p>Fecha actual: ${currentDate.toLocaleDateString('es-AR')}</p><input type="date" id="swal-sale-date" class="swal2-input" value="${fmt(currentDate)}">`,
            showCancelButton: true, confirmButtonText: 'Confirmar', cancelButtonText: 'Cancelar',
            preConfirm: () => { const v = document.getElementById('swal-sale-date')?.value; if (!v) { Swal.showValidationMessage('Seleccione una fecha'); return false; } return v; }
        }).then(result => {
            if (result.isConfirmed && result.value) {
                const [y, m, d] = result.value.split('-').map(Number);
                const now = new Date();
                onSaleDateChange(Timestamp.fromDate(new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds())));
                Swal.fire('Fecha Actualizada', new Date(y, m - 1, d).toLocaleDateString('es-AR'), 'success');
            }
        });
    }, [saleData.saleTimestamp, onSaleDateChange]);

    const CartIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
            <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5z"/>
        </svg>
    );

    return (
        <div className="seleccionar-producto-container">
            <DosageModal isOpen={isDosageModalOpen} onClose={() => setIsDosageModalOpen(false)} onConfirm={handleConfirmDose} item={itemToDose} />
            <SeleccionarPrecioModal isOpen={isPriceModalOpen} onClose={() => setIsPriceModalOpen(false)} item={itemToEditPrice} onUpdateCartPrice={handleUpdateCartPrice} onUpdateProductPrice={handleUpdateProductPrice} onApplyDiscount={handleApplyDiscount} />

            <h2>Paso 3: Seleccionar Items</h2>

            <div className="seleccionar-producto-layout">
                <div className="producto-browser-panel">
                    <div className="browser-controls">
                        <div className="venta-filters">
                            <input className="filter-input" type="text" name="text" placeholder="Buscar..." value={filters.text} onChange={handleFilterChange} />
                            <select className="filter-select" name="tipo" value={filters.tipo} onChange={handleFilterChange}>
                                <option value="todos">Todos los Tipos</option>
                                <option value="producto">Productos</option>
                                <option value="servicio">Servicios</option>
                            </select>
                            <select className="filter-select" name="category" value={filters.category} onChange={handleFilterChange} disabled={filters.tipo === 'todos'}>
                                <option value="todas">Todas las Categorías</option>
                                {(filters.tipo === 'servicio' ? serviceCategories : categories).map(c => (
                                    <option key={c.adress} value={c.adress}>{c.nombre}</option>
                                ))}
                            </select>
                            <select className="filter-select" value={sort} onChange={e => setSort(e.target.value)}>
                                <option value="name-asc">A-Z</option>
                                <option value="name-desc">Z-A</option>
                                <option value="price-asc">Menor Precio</option>
                                <option value="price-desc">Mayor Precio</option>
                            </select>
                        </div>
                    </div>
                    <div className="producto-list">
                        {isLoading ? <p>Cargando productos...</p> : filteredAndSortedData.map(item => (
                            <ProductListItem key={item.id} item={item} isInCart={!item.isDoseable && cart.some(c => c.id === item.id)} onAddToCart={handleAddToCart} />
                        ))}
                    </div>
                </div>

                <div className="smart-cart-panel">
                    <h3>Carrito de Venta</h3>
                    <div className="smart-cart-body">
                        {cart.length === 0 ? (
                            <div className="cart-empty-state">
                                <CartIcon />
                                <p>Tu carrito está vacío</p>
                                <span>Agrega productos</span>
                            </div>
                        ) : (
                            <div className="cart-items-list">
                                {cart.map(item => (
                                    <CartItem key={item.id} item={item} onChangeQuantity={changeQuantity} onOpenPriceModal={handleOpenPriceModal} onRemove={removeFromCart} />
                                ))}
                            </div>
                        )}
                    </div>
                    {cart.length > 0 && (
                        <div className="cart-summary-footer">
                            <div className="summary-line"><span>Subtotal</span><span>${cartSummary.subtotal.toFixed(2)}</span></div>
                            <div className="summary-line discount"><span>Descuentos</span><span>-${cartSummary.totalDiscount.toFixed(2)}</span></div>
                            <div className="summary-line total"><span>Total</span><strong>${cartSummary.total.toFixed(2)}</strong></div>
                        </div>
                    )}
                </div>
            </div>

            <div className="seleccionar-producto-footer">
                <div className="venta-context-info">
                    <span><strong>Tutor:</strong> {saleData.tutor?.name || 'Cliente Genérico'}</span>
                    {saleData.patients?.length > 0 && (
                        <span><strong>Pacientes:</strong> {saleData.patients.map(p => p.name).join(', ')}</span>
                    )}
                    <div className="sale-date-changer">
                        <span><strong>Fecha Venta:</strong> {saleData.saleTimestamp.toDate().toLocaleDateString('es-AR')}</span>
                        <button onClick={handleChangeSaleDate} className="btn btn-outline btn-small">Cambiar Fecha</button>
                    </div>
                </div>
                <div className="navigator-buttons">
                    <button onClick={prevStep} className="btn btn-secondary">Anterior</button>
                    <button onClick={() => onProductsSelected(cart.map(({ ...rest }) => rest), cartSummary.total)} className="btn btn-primary" disabled={cart.length === 0}>Siguiente</button>
                </div>
            </div>
        </div>
    );
};

export default SeleccionarProducto;