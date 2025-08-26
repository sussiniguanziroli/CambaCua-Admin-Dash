import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import Swal from 'sweetalert2';
import LoaderSpinner from '../components/utils/LoaderSpinner';

const PromosAdmin = () => {
    const [productos, setProductos] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProductIds, setSelectedProductIds] = useState(new Set());
    const [isUpdating, setIsUpdating] = useState(false);
    const [promoType, setPromoType] = useState('percentage_discount');
    const [promoValue, setPromoValue] = useState('');

    const [categories, setCategories] = useState([]);
    const [isCatLoading, setIsCatLoading] = useState(true);
    const [filters, setFilters] = useState({
        category: '',
        subcategory: '',
        text: '',
        status: '',
        promoStatus: ''
    });
    const debounceTimeoutRef = useRef(null);

    const fetchProductsAndCategories = useCallback(async () => {
        setIsLoading(true);
        try {
            const productsSnapshot = await getDocs(collection(db, 'productos'));
            const productosData = productsSnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));
            setProductos(productosData);
            setFilteredProducts(productosData);

            const categoriesSnapshot = await getDocs(collection(db, 'categories'));
            const categoriesData = categoriesSnapshot.docs.map(doc => ({
                adress: doc.data().adress,
                nombre: doc.data().nombre,
                subcategorias: doc.data().subcategorias || []
            }));
            setCategories(categoriesData);

        } catch (err) {
            console.error('Error al obtener datos: ', err);
            Swal.fire({ icon: 'error', title: 'Error de Carga', text: 'No se pudieron cargar los productos o categorías.' });
        } finally {
            setIsLoading(false);
            setIsCatLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProductsAndCategories();
    }, [fetchProductsAndCategories]);

    const handleFilter = useCallback(() => {
        let tempFiltered = [...productos];
        if (filters.category) {
            tempFiltered = tempFiltered.filter(p => p.categoryAdress === filters.category);
        }
        if (filters.subcategory) {
            tempFiltered = tempFiltered.filter(p => p.subcategoria === filters.subcategory);
        }
        if (filters.status) {
            const isActiveFilter = filters.status === "true";
            tempFiltered = tempFiltered.filter(p => p.activo === isActiveFilter);
        }
        if (filters.text) {
            const lowerText = filters.text.toLowerCase();
            tempFiltered = tempFiltered.filter(p =>
                (p.nombre && p.nombre.toLowerCase().includes(lowerText))
            );
        }
        if (filters.promoStatus) {
            if (filters.promoStatus === 'con-promo') {
                tempFiltered = tempFiltered.filter(p => !!p.promocion);
            } else if (filters.promoStatus === 'sin-promo') {
                tempFiltered = tempFiltered.filter(p => !p.promocion);
            } else {
                tempFiltered = tempFiltered.filter(p => p.promocion && p.promocion.type === filters.promoStatus);
            }
        }
        setFilteredProducts(tempFiltered);
        setSelectedProductIds(new Set());
    }, [productos, filters]);

    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
            handleFilter();
        }, 300);
        return () => clearTimeout(debounceTimeoutRef.current);
    }, [filters, handleFilter]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => {
            const newFilters = { ...prev, [name]: value };
            if (name === 'category') {
                newFilters.subcategory = '';
            }
            return newFilters;
        });
    };

    const handleClearFilters = () => {
        setFilters({ category: '', subcategory: '', text: '', status: '', promoStatus: '' });
    };

    const handleProductSelect = (productId) => {
        setSelectedProductIds(prev => {
            const newSelectedIds = new Set(prev);
            if (newSelectedIds.has(productId)) newSelectedIds.delete(productId);
            else newSelectedIds.add(productId);
            return newSelectedIds;
        });
    };

    const handleSelectAll = () => {
        if (selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0) {
            setSelectedProductIds(new Set());
        } else {
            setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
        }
    };

    const handleApplyPromotion = async () => {
        if (selectedProductIds.size === 0) {
            Swal.fire("Nada Seleccionado", "Por favor, selecciona al menos un producto.", "info");
            return;
        }
        let promoData = { type: promoType };
        const valueNeeded = promoType === 'percentage_discount' || promoType === 'second_unit_discount';
        if (valueNeeded) {
            const numValue = parseInt(promoValue, 10);
            if (isNaN(numValue) || numValue <= 0 || numValue > 100) {
                Swal.fire("Valor Inválido", "Por favor, ingresa un porcentaje válido (1-100).", "error");
                return;
            }
            promoData.value = numValue;
        }
        const { isConfirmed } = await Swal.fire({
            title: `¿Aplicar promoción a ${selectedProductIds.size} productos?`,
            html: `Tipo: <strong>${promoType}</strong><br/>${valueNeeded ? `Valor: <strong>${promoValue}%</strong>` : ''}`,
            icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, aplicar', cancelButtonText: 'Cancelar'
        });
        if (!isConfirmed) return;
        setIsUpdating(true);
        const batch = writeBatch(db);
        selectedProductIds.forEach(productId => {
            const productRef = doc(db, 'productos', productId);
            batch.update(productRef, { promocion: promoData, updatedAt: serverTimestamp() });
        });
        try {
            await batch.commit();
            Swal.fire('¡Éxito!', 'Las promociones se aplicaron correctamente.', 'success');
            await fetchProductsAndCategories();
            setSelectedProductIds(new Set());
            setPromoValue('');
        } catch (error) {
            console.error("Error al aplicar promociones:", error);
            Swal.fire('Error', 'No se pudieron aplicar las promociones.', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRemovePromotion = async () => {
        if (selectedProductIds.size === 0) {
            Swal.fire("Nada Seleccionado", "Por favor, selecciona al menos un producto.", "info");
            return;
        }
        const { isConfirmed } = await Swal.fire({
            title: `¿Quitar promoción de ${selectedProductIds.size} productos?`,
            text: "Esta acción eliminará la promoción de los productos seleccionados.",
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, quitar', cancelButtonText: 'Cancelar'
        });
        if (!isConfirmed) return;
        setIsUpdating(true);
        const batch = writeBatch(db);
        selectedProductIds.forEach(productId => {
            const productRef = doc(db, 'productos', productId);
            batch.update(productRef, { promocion: null, updatedAt: serverTimestamp() });
        });
        try {
            await batch.commit();
            Swal.fire('¡Éxito!', 'Las promociones se quitaron correctamente.', 'success');
            await fetchProductsAndCategories();
            setSelectedProductIds(new Set());
        } catch (error) {
            console.error("Error al quitar promociones:", error);
            Swal.fire('Error', 'No se pudieron quitar las promociones.', 'error');
        } finally {
            setIsUpdating(false);
        }
    };
    
    const selectedCategoryObj = categories.find(cat => cat.adress === filters.category);
    const currentSubcategories = selectedCategoryObj?.subcategorias || [];

    return (
        <div className="promos-admin-container">
            <h1>Administrador de Promociones</h1>

            {selectedProductIds.size > 0 && (
                <div className="promo-panel">
                    <h3>Aplicar Promoción a {selectedProductIds.size} Producto(s)</h3>
                    <div className="promo-controls">
                        <select value={promoType} onChange={(e) => setPromoType(e.target.value)}>
                            <option value="percentage_discount">X% de descuento</option>
                            <option value="second_unit_discount">X% en la 2da unidad</option>
                            <option value="2x1">2x1</option>
                        </select>
                        {(promoType === 'percentage_discount' || promoType === 'second_unit_discount') && (
                            <input type="number" value={promoValue} onChange={(e) => setPromoValue(e.target.value)} placeholder="% de descuento" min="1" max="100" />
                        )}
                        <button onClick={handleApplyPromotion} disabled={isUpdating} className="btn-apply">{isUpdating ? <LoaderSpinner size="small-inline" /> : 'Aplicar'}</button>
                        <button onClick={handleRemovePromotion} disabled={isUpdating} className="btn-remove">{isUpdating ? <LoaderSpinner size="small-inline" /> : 'Quitar Promoción'}</button>
                    </div>
                </div>
            )}

            <div className="filter-container">
                <div className="filter-controls">
                    <div className="filter-group">
                        <label>Categoría</label>
                        <select name="category" value={filters.category} onChange={handleFilterChange} disabled={isCatLoading}><option value="">Todas</option>{categories.map(c => <option key={c.adress} value={c.adress}>{c.nombre}</option>)}</select>
                    </div>
                    {filters.category && currentSubcategories.length > 0 && (
                        <div className="filter-group">
                            <label>Subcategoría</label>
                            <select name="subcategory" value={filters.subcategory} onChange={handleFilterChange}><option value="">Todas</option>{currentSubcategories.map(s => <option key={s} value={s}>{s}</option>)}</select>
                        </div>
                    )}
                    <div className="filter-group">
                        <label>Estado</label>
                        <select name="status" value={filters.status} onChange={handleFilterChange}><option value="">Todos</option><option value="true">Activo</option><option value="false">Inactivo</option></select>
                    </div>
                    <div className="filter-group">
                        <label>Promoción</label>
                        <select name="promoStatus" value={filters.promoStatus} onChange={handleFilterChange}><option value="">Todos</option><option value="con-promo">Con Promoción</option><option value="sin-promo">Sin Promoción</option><option value="percentage_discount">X% Descuento</option><option value="second_unit_discount">X% 2da Unidad</option><option value="2x1">2x1</option></select>
                    </div>
                    <div className="filter-group filter-group-search">
                        <label>Buscar</label>
                        <input name="text" type="text" value={filters.text} onChange={handleFilterChange} placeholder="Buscar producto..." />
                    </div>
                </div>
                {Object.values(filters).some(v => v !== '') && (<button className="btn-clear-filters" onClick={handleClearFilters}>Limpiar Filtros</button>)}
            </div>

            <div className="product-list-header">
                <button onClick={handleSelectAll}>{selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0 ? 'Deseleccionar Todos' : 'Seleccionar Visibles'}</button>
            </div>

            {isLoading ? <div className="loader-container"><LoaderSpinner size="large" /></div> : (
                <div className="product-list-promo">
                    {filteredProducts.map(producto => (
                        <div key={producto.id} className={`product-item-promo ${selectedProductIds.has(producto.id) ? 'selected' : ''}`} onClick={() => handleProductSelect(producto.id)}>
                            <input type="checkbox" readOnly checked={selectedProductIds.has(producto.id)} />
                            <img src={producto.imagen || "https://placehold.co/100x100/E0E0E0/7F8C8D?text=Sin+Imagen"} alt={producto.nombre} />
                            <div className="product-info">
                                <span className="product-name">{producto.nombre}</span>
                                {producto.promocion ? (
                                    <span className="promo-badge">
                                        {producto.promocion.type === '2x1' && '2x1'}
                                        {producto.promocion.type === 'percentage_discount' && `${producto.promocion.value}% OFF`}
                                        {producto.promocion.type === 'second_unit_discount' && `${producto.promocion.value}% en 2da unidad`}
                                    </span>
                                ) : <span className="no-promo-badge">Sin Promoción</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PromosAdmin;
