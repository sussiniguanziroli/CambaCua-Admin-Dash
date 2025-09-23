import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import Swal from 'sweetalert2';

const SeleccionarProducto = ({ onProductsSelected, prevStep, initialCart, saleData }) => {
    const [onlineProducts, setOnlineProducts] = useState([]);
    const [presentialItems, setPresentialItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [serviceCategories, setServiceCategories] = useState([]);
    
    const [viewMode, setViewMode] = useState('presential');
    const [isLoading, setIsLoading] = useState(true);
    const [cart, setCart] = useState(initialCart || []);
    
    const [filters, setFilters] = useState({
        text: '',
        category: 'todas',
        status: 'true', // For online products
        tipo: 'todos'     // For presential items
    });
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
            setOnlineProducts(onlineSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'online' })));
            setPresentialItems(presentialSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'presential' })));
            setCategories(catSnap.docs.map(doc => ({ ...doc.data() })));
            setServiceCategories(serviceCatSnap.docs.map(doc => ({ ...doc.data() })));
        } catch (error) {
            Swal.fire('Error', 'No se pudieron cargar los productos y categorías.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ 
            ...prev, 
            [name]: value,
            // Reset category if type changes in presential view
            category: (name === 'tipo' && viewMode === 'presential') ? 'todas' : prev.category
        }));
    };

    const clearFilters = () => {
        setFilters({ text: '', category: 'todas', status: 'true', tipo: 'todos' });
        setSort('name-asc');
    };

    const filteredAndSortedData = useMemo(() => {
        const sourceData = viewMode === 'online' ? onlineProducts : presentialItems;
        let tempItems = [...sourceData];
        const lowerText = filters.text.toLowerCase();

        if (filters.text) {
            tempItems = tempItems.filter(p => (p.nombre || p.name)?.toLowerCase().includes(lowerText));
        }

        if (viewMode === 'online') {
            if (filters.status) tempItems = tempItems.filter(p => p.activo === (filters.status === 'true'));
            if (filters.category !== 'todas') tempItems = tempItems.filter(p => p.categoryAdress === filters.category);
        } else { // presential
            if (filters.tipo !== 'todos') tempItems = tempItems.filter(p => p.tipo === filters.tipo);
            if (filters.category !== 'todas') tempItems = tempItems.filter(p => p.category === filters.category);
        }

        tempItems.sort((a, b) => {
            const nameA = (a.name || a.nombre || '').toLowerCase();
            const nameB = (b.name || b.nombre || '').toLowerCase();
            const priceA = a.price ?? a.precio ?? 0;
            const priceB = b.price ?? b.precio ?? 0;

            switch (sort) {
                case 'name-asc': return nameA.localeCompare(nameB);
                case 'name-desc': return nameB.localeCompare(nameA);
                case 'price-asc': return priceA - priceB;
                case 'price-desc': return priceB - priceA;
                default: return 0;
            }
        });
        return tempItems;
    }, [filters, sort, viewMode, onlineProducts, presentialItems]);

    const total = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);

    const addToCart = (item) => {
        const price = item.price ?? item.precio;
        const existingItem = cart.find(cartItem => cartItem.id === item.id);
        if (existingItem) {
            changeQuantity(item.id, existingItem.quantity + 1);
        } else {
            setCart(prevCart => [...prevCart, { ...item, price, quantity: 1 }]);
        }
    };
    
    const changeQuantity = (itemId, newQuantity) => {
        if (newQuantity < 1) {
            setCart(prevCart => prevCart.filter(item => item.id !== itemId));
        } else {
            setCart(prevCart => prevCart.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
        }
    };

    return (
        <div className="venta-step-container venta-product-selection-container">
            <h2>Paso 3: Seleccionar Items</h2>
            <div className="venta-context-info">
                <span><strong>Tutor:</strong> {saleData.tutor?.name || 'N/A'}</span>
                <span><strong>Paciente:</strong> {saleData.patient?.name || 'N/A'}</span>
            </div>

            <div className="venta-product-layout">
                <div className="venta-product-list">
                     <div className="venta-view-switcher">
                        <button onClick={() => setViewMode('presential')} className={viewMode === 'presential' ? 'active' : ''}>Items Presenciales</button>
                        <button onClick={() => setViewMode('online')} className={viewMode === 'online' ? 'active' : ''}>Productos Online</button>
                    </div>
                    <div className="venta-filters">
                        <input className="filter-input" type="text" name="text" placeholder="Buscar por nombre..." value={filters.text} onChange={handleFilterChange} />
                        {viewMode === 'presential' ? (
                            <>
                                <select className="filter-select" name="tipo" value={filters.tipo} onChange={handleFilterChange}>
                                    <option value="todos">Todos los Tipos</option>
                                    <option value="producto">Producto</option>
                                    <option value="servicio">Servicio</option>
                                </select>
                                <select className="filter-select" name="category" value={filters.category} onChange={handleFilterChange} disabled={filters.tipo === 'todos'}>
                                    <option value="todas">Todas las Categorías</option>
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
                            <option value="name-asc">Nombre (A-Z)</option>
                            <option value="name-desc">Nombre (Z-A)</option>
                            <option value="price-asc">Precio (Menor)</option>
                            <option value="price-desc">Precio (Mayor)</option>
                        </select>
                        <button onClick={clearFilters} className="btn btn-secondary">Limpiar</button>
                    </div>
                    <div className="venta-items-grid">
                        {isLoading ? <p>Cargando...</p> : filteredAndSortedData.map(item => (
                            <div key={item.id} className="venta-item-card" onClick={() => addToCart(item)}>
                                <div className="item-info">
                                    <span className="item-name">{item.name || item.nombre}</span>
                                    <strong className="item-price">${(item.price ?? item.precio).toFixed(2)}</strong>
                                </div>
                                <button className="add-button">+</button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="venta-cart-summary">
                    <h3>Carrito</h3>
                    <div className="venta-cart-items">
                        {cart.length === 0 ? <p className="empty-cart-message">El carrito está vacío.</p> : cart.map(item => (
                            <div key={item.id} className="venta-cart-item">
                                <span className="cart-item-name">{item.name || item.nombre}</span>
                                <div className="venta-quantity-controls">
                                    <button onClick={() => changeQuantity(item.id, item.quantity - 1)}>-</button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => changeQuantity(item.id, item.quantity + 1)}>+</button>
                                </div>
                                <strong className="cart-item-price">${(item.price * item.quantity).toFixed(2)}</strong>
                            </div>
                        ))}
                    </div>
                    <div className="venta-cart-total">
                        <span>Total</span>
                        <strong>${total.toFixed(2)}</strong>
                    </div>
                </div>
            </div>
            
            <div className="venta-navigator-buttons">
                <button onClick={prevStep} className="btn btn-secondary">Anterior</button>
                <button onClick={() => onProductsSelected(cart, total)} className="btn btn-primary" disabled={cart.length === 0}>Siguiente</button>
            </div>
        </div>
    );
};

export default SeleccionarProducto;

