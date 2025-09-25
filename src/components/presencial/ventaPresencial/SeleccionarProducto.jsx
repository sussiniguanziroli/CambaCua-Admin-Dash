import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import Swal from 'sweetalert2';

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

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [onlineSnap, presentialSnap, catSnap, serviceCatSnap] = await Promise.all([
                getDocs(collection(db, 'productos')),
                getDocs(collection(db, 'productos_presenciales')),
                getDocs(collection(db, 'categories')),
                getDocs(collection(db, 'services_categories'))
            ]);

            const onlineData = onlineSnap.docs.map(doc => {
                const data = doc.data();
                return { ...data, id: doc.id, name: data.nombre, price: data.precio, source: 'online' };
            });
            const presentialData = presentialSnap.docs.map(doc => {
                const data = doc.data();
                return { ...data, id: doc.id, name: data.name, price: data.price, source: 'presential' };
            });

            setOnlineProducts(onlineData);
            setPresentialProducts(presentialData);
            setCategories(catSnap.docs.map(doc => doc.data()));
            setServiceCategories(serviceCatSnap.docs.map(doc => doc.data()));
        } catch (error) {
            Swal.fire('Error', 'No se pudieron cargar los productos y categorías.', 'error');
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

    const total = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);

    const addToCart = (item) => {
        const existingItem = cart.find(cartItem => cartItem.id === item.id);
        if (existingItem) {
            changeQuantity(item.id, existingItem.quantity + 1);
        } else {
            setCart(prevCart => [...prevCart, { ...item, quantity: 1 }]);
        }
    };
    
    const changeQuantity = (itemId, newQuantity) => {
        if (newQuantity < 1) {
            removeFromCart(itemId);
        } else {
            setCart(prevCart => prevCart.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
        }
    };

    const removeFromCart = (itemId) => {
        setCart(prevCart => prevCart.filter(item => item.id !== itemId));
    };
    
    const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg>;
    const CartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16"><path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.102 4l1.313 7h8.17l1.313-7H3.102zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>;
    const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>;
    
    return (
        <div className="seleccionar-producto-container">
            <h2>Paso 3: Seleccionar Items</h2>
            <div className="seleccionar-producto-layout">
                <div className="producto-browser-panel">
                    <div className="browser-controls">
                        <div className="venta-view-switcher">
                            <button onClick={() => handleViewChange('presential')} className={viewMode === 'presential' ? 'active' : ''}>Items Presenciales</button>
                            <button onClick={() => handleViewChange('online')} className={viewMode === 'online' ? 'active' : ''}>Productos Online</button>
                        </div>
                        <div className="venta-filters">
                            <input className="filter-input" type="text" name="text" placeholder="Buscar por nombre, categoría..." value={filters.text} onChange={handleFilterChange} />
                            {viewMode === 'presential' ? (
                                <>
                                    <select className="filter-select" name="tipo" value={filters.tipo} onChange={handleFilterChange}><option value="todos">Todos los Tipos</option><option value="producto">Producto</option><option value="servicio">Servicio</option></select>
                                    <select className="filter-select" name="category" value={filters.category} onChange={handleFilterChange} disabled={filters.tipo === 'todos'}><option value="todas">Todas las Categorías</option>{(filters.tipo === 'servicio' ? serviceCategories : categories).map(c => <option key={c.adress} value={c.adress}>{c.nombre}</option>)}</select>
                                </>
                            ) : (
                                <>
                                    <select className="filter-select" name="category" value={filters.category} onChange={handleFilterChange}><option value="todas">Categorías Online</option>{categories.map(c => <option key={c.adress} value={c.adress}>{c.nombre}</option>)}</select>
                                    <select className="filter-select" name="status" value={filters.status} onChange={handleFilterChange}><option value="true">Activos</option><option value="false">Inactivos</option></select>
                                </>
                            )}
                            <select className="filter-select" name="sort" value={sort} onChange={(e) => setSort(e.target.value)}><option value="name-asc">Nombre (A-Z)</option><option value="name-desc">Nombre (Z-A)</option><option value="price-asc">Precio (Menor)</option><option value="price-desc">Precio (Mayor)</option></select>
                        </div>
                    </div>
                    <div className="producto-list">
                        {isLoading ? <p>Cargando...</p> : filteredAndSortedData.map(item => {
                            const isInCart = cart.some(cartItem => cartItem.id === item.id);
                            return (
                                <div key={item.id} className={`producto-list-item ${isInCart ? 'in-cart' : ''}`}>
                                    <div className="item-details">
                                        <span className="item-name">{item.name}</span>
                                        <span className="item-category">{item.categoria || item.category || ''}</span>
                                    </div>
                                    <div className="item-actions">
                                        <span className="item-price">${(item.price || 0).toFixed(2)}</span>
                                        <button className="add-item-btn" onClick={() => addToCart(item)} disabled={isInCart}>{isInCart ? <CheckIcon/> : '+'}</button>
                                    </div>
                                </div>
                            )
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
                                <span>Agrega productos desde la lista</span>
                            </div>
                        ) : (
                            <div className="cart-items-list">
                                {cart.map(item => (
                                    <div key={item.id} className="cart-item-card">
                                        <div className="card-item-info">
                                            <span className="card-item-name">{item.name}</span>
                                            <span className="card-item-price-unit">{item.quantity} u. x ${(item.price || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="card-item-controls">
                                            <div className="quantity-stepper">
                                                <button onClick={() => changeQuantity(item.id, item.quantity - 1)}>-</button>
                                                <span>{item.quantity}</span>
                                                <button onClick={() => changeQuantity(item.id, item.quantity + 1)}>+</button>
                                            </div>
                                            <span className="card-item-subtotal">${(item.price * item.quantity).toFixed(2)}</span>
                                            <button className="remove-item-btn" onClick={() => removeFromCart(item.id)}><TrashIcon/></button>
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
                                <span>Total ({cart.reduce((acc, item) => acc + item.quantity, 0)} items)</span>
                                <strong>${total.toFixed(2)}</strong>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="seleccionar-producto-footer">
                 <div className="venta-context-info">
                    <span><strong>Tutor:</strong> {saleData.tutor?.name || 'N/A'}</span>
                    <span><strong>Paciente:</strong> {saleData.patient?.name || 'N/A'}</span>
                </div>
                <div className="navigator-buttons">
                    <button onClick={prevStep} className="btn btn-secondary">Anterior</button>
                    <button onClick={() => onProductsSelected(cart, total)} className="btn btn-primary" disabled={cart.length === 0}>Siguiente</button>
                </div>
            </div>
        </div>
    );
};

export default SeleccionarProducto;