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
        subcategory: 'todas',
        status: 'true',
        tipo: 'todos'
    });

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
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const filteredData = useMemo(() => {
        const sourceData = viewMode === 'online' ? onlineProducts : presentialItems;
        let tempItems = [...sourceData];
        const lowerText = filters.text.toLowerCase();

        if (filters.text) {
            tempItems = tempItems.filter(p => p.nombre?.toLowerCase().includes(lowerText) || p.name?.toLowerCase().includes(lowerText));
        }

        if (viewMode === 'online') {
            if (filters.status) tempItems = tempItems.filter(p => p.activo === (filters.status === 'true'));
            if (filters.category !== 'todas') tempItems = tempItems.filter(p => p.categoryAdress === filters.category);
            if (filters.subcategory !== 'todas') tempItems = tempItems.filter(p => p.subcategoria === filters.subcategory);
        } else {
            if (filters.tipo !== 'todos') tempItems = tempItems.filter(p => p.tipo === filters.tipo);
            if (filters.category !== 'todas') tempItems = tempItems.filter(p => p.category === filters.category);
        }
        return tempItems;
    }, [filters, viewMode, onlineProducts, presentialItems]);

    const total = useMemo(() => cart.reduce((sum, item) => sum + (item.price || item.precio), 0), [cart]);

    const addToCart = (item) => {
        const price = item.price ?? item.precio;
        const cartItem = { ...item, price, cartId: `${item.id}-${Date.now()}` };
        setCart(prev => [...prev, cartItem]);
    };

    const removeFromCart = (cartId) => {
        setCart(prev => prev.filter(item => item.cartId !== cartId));
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
                        {viewMode === 'online' ? (
                            <>
                                <select name="category" value={filters.category} onChange={handleFilterChange}><option value="todas">Categorías</option>{categories.map(c => <option key={c.adress} value={c.adress}>{c.nombre}</option>)}</select>
                                <select name="status" value={filters.status} onChange={handleFilterChange}><option value="true">Activos</option><option value="false">Inactivos</option></select>
                            </>
                        ) : (
                            <>
                                <select name="tipo" value={filters.tipo} onChange={handleFilterChange}><option value="todos">Tipos</option><option value="producto">Producto</option><option value="servicio">Servicio</option></select>
                                <select name="category" value={filters.category} onChange={handleFilterChange} disabled={filters.tipo === 'todos'}><option value="todas">Categorías</option>{(filters.tipo === 'servicio' ? serviceCategories : categories).map(c => <option key={c.adress} value={c.adress}>{c.nombre}</option>)}</select>
                            </>
                        )}
                    </div>
                    <div className="items-list">
                        {isLoading ? <p>Cargando...</p> : filteredData.map(item => (
                            <div key={item.id} className="item-card" onClick={() => addToCart(item)}>
                                <div className="item-info">
                                    <span>{item.name || item.nombre}</span>
                                    <strong>${(item.price ?? item.precio).toFixed(2)}</strong>
                                </div>
                                <button className="add-button">+</button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="cart-summary">
                    <h3>Carrito</h3>
                    <div className="cart-items">
                        {cart.length === 0 ? <p>El carrito está vacío.</p> : cart.map(item => (
                            <div key={item.cartId} className="cart-item">
                                <span>{item.name || item.nombre}</span>
                                <strong>${item.price.toFixed(2)}</strong>
                                <button onClick={() => removeFromCart(item.cartId)}>x</button>
                            </div>
                        ))}
                    </div>
                    <div className="cart-total">
                        <h4>Total: ${total.toFixed(2)}</h4>
                    </div>
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

