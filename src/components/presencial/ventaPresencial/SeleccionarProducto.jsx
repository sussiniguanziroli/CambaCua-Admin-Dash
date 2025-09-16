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
        status: 'true',
        tipo: 'todos'
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
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
        } else {
            if (filters.tipo !== 'todos') tempItems = tempItems.filter(p => p.tipo === filters.tipo);
            if (filters.category !== 'todas') tempItems = tempItems.filter(p => p.category === filters.category);
        }

        tempItems.sort((a, b) => {
            const nameA = (a.name || a.nombre).toLowerCase();
            const nameB = (b.name || b.nombre).toLowerCase();
            const priceA = a.price ?? a.precio;
            const priceB = b.price ?? b.precio;

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

    const updateCart = (newCart) => {
        setCart(newCart);
    };

    const addToCart = (item) => {
        const price = item.price ?? item.precio;
        const existingItem = cart.find(cartItem => cartItem.id === item.id);
        if (existingItem) {
            updateCart(cart.map(cartItem => cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem));
        } else {
            updateCart([...cart, { ...item, price, quantity: 1 }]);
        }
    };
    
    const changeQuantity = (itemId, newQuantity) => {
        if (newQuantity < 1) {
            updateCart(cart.filter(item => item.id !== itemId));
        } else {
            updateCart(cart.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
        }
    };

    return (
        <div className="seleccionar-producto">
            <h2>Paso 3: Seleccionar Items</h2>
            <div className="sale-context-info">
                <span><strong>Tutor:</strong> {saleData.tutor?.name || 'N/A'}</span>
                <span><strong>Paciente:</strong> {saleData.patient?.name || 'N/A'}</span>
            </div>

            <div className="content-layout">
                <div className="items-list-container">
                    <div className="view-mode-selector">
                        <button onClick={() => setViewMode('presential')} className={viewMode === 'presential' ? 'active' : ''}>Items Presenciales</button>
                        <button onClick={() => setViewMode('online')} className={viewMode === 'online' ? 'active' : ''}>Productos Online</button>
                    </div>
                    <div className="filter-bar">
                        <input type="text" name="text" placeholder="Buscar por nombre..." value={filters.text} onChange={handleFilterChange} />
                        {viewMode === 'presential' ? (
                            <>
                                <select name="tipo" value={filters.tipo} onChange={handleFilterChange}><option value="todos">Todos los Tipos</option><option value="producto">Producto</option><option value="servicio">Servicio</option></select>
                                <select name="category" value={filters.category} onChange={handleFilterChange} disabled={filters.tipo === 'todos'}><option value="todas">Todas las Categorías</option>{(filters.tipo === 'servicio' ? serviceCategories : categories).map(c => <option key={c.adress} value={c.adress}>{c.nombre}</option>)}</select>
                            </>
                        ) : (
                            <>
                                <select name="category" value={filters.category} onChange={handleFilterChange}><option value="todas">Categorías Online</option>{categories.map(c => <option key={c.adress} value={c.adress}>{c.nombre}</option>)}</select>
                                <select name="status" value={filters.status} onChange={handleFilterChange}><option value="true">Activos</option><option value="false">Inactivos</option></select>
                            </>
                        )}
                        <select name="sort" value={sort} onChange={(e) => setSort(e.target.value)}><option value="name-asc">Nombre (A-Z)</option><option value="name-desc">Nombre (Z-A)</option><option value="price-asc">Precio (Menor)</option><option value="price-desc">Precio (Mayor)</option></select>
                        <button onClick={clearFilters} className="btn-secondary">Limpiar</button>
                    </div>
                    <div className="items-list">
                        {isLoading ? <p>Cargando...</p> : filteredAndSortedData.map(item => (
                            <div key={item.id} className="item-card" onClick={() => addToCart(item)}>
                                <div className="item-info"><span>{item.name || item.nombre}</span><strong>${(item.price ?? item.precio).toFixed(2)}</strong></div>
                                <button className="add-button">+</button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="cart-summary">
                    <h3>Carrito</h3>
                    <div className="cart-items">
                        {cart.length === 0 ? <p>El carrito está vacío.</p> : cart.map(item => (
                            <div key={item.id} className="cart-item">
                                <span>{item.name || item.nombre}</span>
                                <div className="quantity-controls">
                                    <button onClick={() => changeQuantity(item.id, item.quantity - 1)}>-</button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => changeQuantity(item.id, item.quantity + 1)}>+</button>
                                </div>
                                <strong>${(item.price * item.quantity).toFixed(2)}</strong>
                            </div>
                        ))}
                    </div>
                    <div className="cart-total"><h4>Total: ${total.toFixed(2)}</h4></div>
                </div>
            </div>
            
            <div className="navigator-buttons">
                <button onClick={prevStep} className="btn-secondary">Anterior</button>
                <button onClick={() => onProductsSelected(cart, total)} disabled={cart.length === 0}>Siguiente</button>
            </div>
        </div>
    );
};

export default SeleccionarProducto;