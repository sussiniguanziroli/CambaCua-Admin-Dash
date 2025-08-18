import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import Swal from 'sweetalert2';
import LoaderSpinner from '../components/utils/LoaderSpinner';
import Filtrado from './Filtrado';

const PromosAdmin = () => {
    const [productos, setProductos] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProductIds, setSelectedProductIds] = useState(new Set());
    const [isUpdating, setIsUpdating] = useState(false);

    const [promoType, setPromoType] = useState('percentage_discount');
    const [promoValue, setPromoValue] = useState('');

    const fetchProducts = useCallback(async () => {
        setIsLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'productos'));
            const productosData = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));
            setProductos(productosData);
            setFilteredProducts(productosData);
        } catch (err) {
            console.error('Error al obtener los productos: ', err);
            Swal.fire({ icon: 'error', title: 'Error de Carga', text: 'No se pudieron cargar los productos.' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleFilter = useCallback(({ category, subcategory, text, status }) => {
        let tempFiltered = [...productos];
        if (category) {
            tempFiltered = tempFiltered.filter(p => p.categoryAdress === category);
        }
        if (subcategory) {
            tempFiltered = tempFiltered.filter(p => p.subcategoria === subcategory);
        }
        if (status) {
            const isActiveFilter = status === "true";
            tempFiltered = tempFiltered.filter(p => p.activo === isActiveFilter);
        }
        if (text) {
            const lowerText = text.toLowerCase();
            tempFiltered = tempFiltered.filter(p =>
                (p.nombre && p.nombre.toLowerCase().includes(lowerText))
            );
        }
        setFilteredProducts(tempFiltered);
        setSelectedProductIds(new Set());
    }, [productos]);

    const handleProductSelect = (productId) => {
        setSelectedProductIds(prevSelectedIds => {
            const newSelectedIds = new Set(prevSelectedIds);
            if (newSelectedIds.has(productId)) {
                newSelectedIds.delete(productId);
            } else {
                newSelectedIds.add(productId);
            }
            return newSelectedIds;
        });
    };

    const handleSelectAll = () => {
        if (selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0) {
            setSelectedProductIds(new Set());
        } else {
            const allProductIds = new Set(filteredProducts.map(p => p.id));
            setSelectedProductIds(allProductIds);
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
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, aplicar',
            cancelButtonText: 'Cancelar'
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
            await fetchProducts();
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
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, quitar',
            cancelButtonText: 'Cancelar'
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
            await fetchProducts();
            setSelectedProductIds(new Set());
        } catch (error) {
            console.error("Error al quitar promociones:", error);
            Swal.fire('Error', 'No se pudieron quitar las promociones.', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

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
                            <input
                                type="number"
                                value={promoValue}
                                onChange={(e) => setPromoValue(e.target.value)}
                                placeholder="% de descuento"
                                min="1"
                                max="100"
                            />
                        )}
                        <button onClick={handleApplyPromotion} disabled={isUpdating} className="btn-apply">
                            {isUpdating ? <LoaderSpinner size="small-inline" /> : 'Aplicar'}
                        </button>
                        <button onClick={handleRemovePromotion} disabled={isUpdating} className="btn-remove">
                            {isUpdating ? <LoaderSpinner size="small-inline" /> : 'Quitar Promoción'}
                        </button>
                    </div>
                </div>
            )}

            <Filtrado onFilter={handleFilter} />

            <div className="product-list-header">
                <button onClick={handleSelectAll}>
                    {selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0 ? 'Deseleccionar Todos' : 'Seleccionar Visibles'}
                </button>
            </div>

            {isLoading ? (
                <div className="loader-container"><LoaderSpinner size="large" /></div>
            ) : (
                <div className="product-list-promo">
                    {filteredProducts.map(producto => (
                        <div 
                            key={producto.id} 
                            className={`product-item-promo ${selectedProductIds.has(producto.id) ? 'selected' : ''}`}
                            onClick={() => handleProductSelect(producto.id)}
                        >
                            <input
                                type="checkbox"
                                readOnly
                                checked={selectedProductIds.has(producto.id)}
                            />
                            <img src={producto.imagen || "https://placehold.co/100x100/E0E0E0/7F8C8D?text=Sin+Imagen"} alt={producto.nombre} />
                            <div className="product-info">
                                <span className="product-name">{producto.nombre}</span>
                                {producto.promocion ? (
                                    <span className="promo-badge">
                                        {producto.promocion.type === '2x1' && '2x1'}
                                        {producto.promocion.type === 'percentage_discount' && `${producto.promocion.value}% OFF`}
                                        {producto.promocion.type === 'second_unit_discount' && `${producto.promocion.value}% en 2da unidad`}
                                    </span>
                                ) : (
                                    <span className="no-promo-badge">Sin Promoción</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PromosAdmin;
