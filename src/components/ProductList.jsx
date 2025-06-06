import React, { useState, useEffect, useCallback } from 'react';
import { db, storage } from '../firebase/config';
import { collection, getDocs, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore'; // Added writeBatch
import { ref, deleteObject } from "firebase/storage";
import { Link } from 'react-router-dom';
import Filtrado from './Filtrado';
import LoaderSpinner from './utils/LoaderSpinner';
import Swal from 'sweetalert2';
import AdminProductModal from './AdminProductModal';

const ITEMS_PER_PAGE = 20; 

const ProductList = () => {
    const [productos, setProductos] = useState([]);
    const [productsAfterFilter, setProductsAfterFilter] = useState([]);
    const [sortedAndFilteredProducts, setSortedAndFilteredProducts] = useState([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProductForModal, setSelectedProductForModal] = useState(null);

    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'descending' });

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [currentViewProducts, setCurrentViewProducts] = useState([]);

    // --- Bulk Update State ---
    const [selectedProductIds, setSelectedProductIds] = useState(new Set());
    const [priceModifier, setPriceModifier] = useState(''); // e.g., "*1.1", "+5", "-2", "=50"
    const [stockModifier, setStockModifier] = useState('');   // e.g., "+10", "-5", "=100"
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true); setError(null);
            try {
                const snapshot = await getDocs(collection(db, 'productos'));
                const productosData = snapshot.docs.map(docSnap => ({
                    id: docSnap.id,
                    ...docSnap.data(),
                    createdAt: docSnap.data().createdAt?.toDate ? docSnap.data().createdAt.toDate() : null,
                    updatedAt: docSnap.data().updatedAt?.toDate ? docSnap.data().updatedAt.toDate() : null,
                    precioLastUpdated: docSnap.data().precioLastUpdated?.toDate ? docSnap.data().precioLastUpdated.toDate() : null,
                    stockLastUpdated: docSnap.data().stockLastUpdated?.toDate ? docSnap.data().stockLastUpdated.toDate() : null,
                }));
                setProductos(productosData);
                setProductsAfterFilter(productosData); 
            } catch (err) {
                console.error('Error al obtener los productos: ', err);
                setError('No se pudieron cargar los productos.');
                Swal.fire({ icon: 'error', title: 'Error de Carga', text: 'No se pudieron cargar los productos.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchProducts();
    }, []);

    useEffect(() => {
        let sortableProducts = [...productsAfterFilter];
        if (sortConfig.key) {
            sortableProducts.sort((a, b) => {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];
                if (valA === null || valA === undefined) valA = sortConfig.direction === 'ascending' ? Infinity : -Infinity;
                if (valB === null || valB === undefined) valB = sortConfig.direction === 'ascending' ? Infinity : -Infinity;

                if (valA instanceof Date && valB instanceof Date) {
                    if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                } else if (typeof valA === 'number' && typeof valB === 'number') {
                    if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                } else {
                    valA = String(valA).toLowerCase();
                    valB = String(valB).toLowerCase();
                    if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                }
            });
        }
        setSortedAndFilteredProducts(sortableProducts);
        setCurrentPage(1); 
    }, [productsAfterFilter, sortConfig]);

    useEffect(() => {
        const newTotalPages = Math.ceil(sortedAndFilteredProducts.length / ITEMS_PER_PAGE);
        setTotalPages(newTotalPages);
        if (currentPage > newTotalPages && newTotalPages > 0) {
            setCurrentPage(newTotalPages);
        } else if (newTotalPages === 0 && currentPage !== 1) { // Ensure currentPage is 1 if no products
            setCurrentPage(1);
        }
        
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        setCurrentViewProducts(sortedAndFilteredProducts.slice(startIndex, endIndex));
    }, [sortedAndFilteredProducts, currentPage]); // Removed ITEMS_PER_PAGE as it's constant

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

    const handleSelectAllVisible = () => {
        const allVisibleIds = new Set(currentViewProducts.map(p => p.id));
        // If all currently visible are already selected, deselect them. Otherwise, select them.
        const allVisibleSelected = currentViewProducts.every(p => selectedProductIds.has(p.id));

        if (allVisibleSelected && currentViewProducts.length > 0) {
            setSelectedProductIds(prev => {
                const newSet = new Set(prev);
                allVisibleIds.forEach(id => newSet.delete(id));
                return newSet;
            });
        } else {
            setSelectedProductIds(prev => new Set([...prev, ...allVisibleIds]));
        }
    };
    
    const parseModifier = (value, modifier) => {
        modifier = String(modifier).replace(',', '.').trim(); // Normalize comma to dot for decimals
        const numValue = parseFloat(value);
        if (isNaN(numValue)) throw new Error("Valor base inválido.");

        if (modifier.startsWith('*')) {
            const factor = parseFloat(modifier.substring(1));
            if (isNaN(factor)) throw new Error("Factor de multiplicación inválido.");
            return numValue * factor;
        } else if (modifier.startsWith('+')) {
            const addition = parseFloat(modifier.substring(1));
            if (isNaN(addition)) throw new Error("Valor de suma inválido.");
            return numValue + addition;
        } else if (modifier.startsWith('-')) {
            const subtraction = parseFloat(modifier.substring(1));
            if (isNaN(subtraction)) throw new Error("Valor de resta inválido.");
            return numValue - subtraction;
        } else if (modifier.startsWith('=')) {
            const directValue = parseFloat(modifier.substring(1));
            if (isNaN(directValue)) throw new Error("Valor directo inválido.");
            return directValue;
        } else if (modifier === '') {
            return numValue; // No change
        }
        throw new Error("Modificador no reconocido. Usar *, +, -, = seguido de un número.");
    };


    const handleApplyBulkUpdate = async () => {
        if (selectedProductIds.size === 0) {
            Swal.fire("Nada Seleccionado", "Por favor, selecciona al menos un producto.", "info");
            return;
        }
        if (!priceModifier && !stockModifier) {
            Swal.fire("Nada para Actualizar", "Por favor, ingresa un modificador para precio o stock.", "info");
            return;
        }

        const result = await Swal.fire({
            title: `¿Actualizar ${selectedProductIds.size} productos?`,
            html: `Precio: <code>${priceModifier || 'Sin cambios'}</code><br/>Stock: <code>${stockModifier || 'Sin cambios'}</code>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, actualizar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        setIsBulkUpdating(true);
        const batch = writeBatch(db);
        const currentDate = new Date();
        const updatedProductDetails = []; // For local state update

        let updateErrorOccurred = false;

        for (const productId of selectedProductIds) {
            const product = productos.find(p => p.id === productId);
            if (!product) continue;

            const updates = { updatedAt: currentDate };
            let newPrice = parseFloat(product.precio);
            let newStock = parseInt(product.stock, 10);

            try {
                if (priceModifier) {
                    newPrice = parseModifier(product.precio, priceModifier);
                    if (isNaN(newPrice)) throw new Error(`Cálculo de precio inválido para ${product.nombre}`);
                    newPrice = Math.max(0, parseFloat(newPrice.toFixed(2))); // Ensure positive and 2 decimal places
                    updates.precio = newPrice;
                    updates.precioLastUpdated = currentDate;
                }

                if (stockModifier) {
                    newStock = parseModifier(product.stock, stockModifier);
                    if (isNaN(newStock)) throw new Error(`Cálculo de stock inválido para ${product.nombre}`);
                    newStock = Math.max(0, Math.floor(newStock)); // Ensure positive integer
                    updates.stock = newStock;
                    updates.stockLastUpdated = currentDate;
                }
                
                if (Object.keys(updates).length > 1) { // More than just updatedAt
                    const productRef = doc(db, "productos", productId);
                    batch.update(productRef, updates);
                    updatedProductDetails.push({ id: productId, ...updates, precio: newPrice, stock: newStock });
                }

            } catch (error) {
                updateErrorOccurred = true;
                console.error(`Error procesando producto ${productId}: ${error.message}`);
                Swal.fire('Error en Modificador', error.message, 'error');
                setIsBulkUpdating(false);
                return; // Stop batch if any formula is invalid
            }
        }
        
        if (updateErrorOccurred) {
             setIsBulkUpdating(false);
             return;
        }

        try {
            await batch.commit();

            // Update local state
            const updateLocalState = (list) => list.map(p => {
                const changedDetail = updatedProductDetails.find(upd => upd.id === p.id);
                return changedDetail ? { ...p, ...changedDetail } : p;
            });

            setProductos(prev => updateLocalState(prev));
            setProductsAfterFilter(prev => updateLocalState(prev)); // This will trigger sort and pagination re-calculation

            Swal.fire('Actualizado', `${selectedProductIds.size} productos actualizados correctamente.`, 'success');
            setSelectedProductIds(new Set());
            setPriceModifier('');
            setStockModifier('');
        } catch (error) {
            console.error("Error al ejecutar el batch de actualización: ", error);
            Swal.fire('Error de Actualización', 'No se pudieron actualizar los productos en la base de datos.', 'error');
        } finally {
            setIsBulkUpdating(false);
        }
    };


    const toggleProductActive = async (producto) => {
        // ... (previous implementation, ensure it updates productsAfterFilter too if needed)
        const productRef = doc(db, 'productos', producto.id);
        const newState = !producto.activo;
        const actionText = newState ? 'activar' : 'desactivar';
        const actionTitle = newState ? 'Activado' : 'Desactivado';
        const currentDate = new Date();

        if (!newState) {
            const confirmationResult = await Swal.fire({
                title: `¿Desactivar "${producto.nombre}"?`, text: "El producto no será visible.", icon: 'warning',
                showCancelButton: true, confirmButtonColor: '#FFB74D', cancelButtonColor: '#95a5a6',
                confirmButtonText: 'Sí, desactivar', cancelButtonText: 'Cancelar'
            });
            if (!confirmationResult.isConfirmed) return;
        }
        try {
            await updateDoc(productRef, { activo: newState, updatedAt: currentDate });
            const updatedProduct = { ...producto, activo: newState, updatedAt: currentDate };
            
            const updateList = (list) => list.map(p => p.id === producto.id ? updatedProduct : p);
            
            setProductos(prev => updateList(prev));
            setProductsAfterFilter(prev => updateList(prev));


            if (isModalOpen && selectedProductForModal?.id === producto.id) {
                setSelectedProductForModal(updatedProduct);
            }
            Swal.fire({ icon: 'success', title: `Producto ${actionTitle}`, timer: 1500, showConfirmButton: false });
        } catch (err) {
            console.error(`Error al ${actionText} el producto:`, err);
            Swal.fire({ icon: 'error', title: 'Error', text: `No se pudo ${actionText} el producto.` });
        }
    };

    const deleteImageFromStorage = async (imageUrl) => {
        // ... (previous implementation)
        if (!imageUrl || !imageUrl.includes("firebasestorage.googleapis.com")) {
            return;
        }
        try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
        } catch (error) {
            if (error.code !== 'storage/object-not-found') {
                console.error("Could not delete image from Storage: ", imageUrl, error);
            }
        }
    };

    const deleteProduct = async (productToDelete) => {
        // ... (previous implementation, ensure it updates productsAfterFilter too if needed)
        const result = await Swal.fire({
            title: `¿Eliminar "${productToDelete.nombre}"?`,
            text: "Esta acción no se puede deshacer y eliminará las imágenes asociadas.",
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#E57373',
            cancelButtonColor: '#95a5a6', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            if (isModalOpen && selectedProductForModal?.id === productToDelete.id) {
                closeProductModal();
            }
            try {
                const productData = productToDelete;
                const imageDeletionPromises = [];
                if (productData.imagen) imageDeletionPromises.push(deleteImageFromStorage(productData.imagen));
                if (productData.imagenB) imageDeletionPromises.push(deleteImageFromStorage(productData.imagenB));
                if (productData.imagenC) imageDeletionPromises.push(deleteImageFromStorage(productData.imagenC));
                
                await Promise.allSettled(imageDeletionPromises);
                await deleteDoc(doc(db, 'productos', productToDelete.id));

                const filterOutDeleted = list => list.filter(p => p.id !== productToDelete.id);
                setProductos(currentProductos => filterOutDeleted(currentProductos));
                setProductsAfterFilter(currentFiltered => filterOutDeleted(currentFiltered));

                Swal.fire({ title: 'Eliminado', text: `"${productToDelete.nombre}" ha sido eliminado.`, icon: 'success', timer: 1500, showConfirmButton: false });
            } catch (err) {
                console.error('Error al eliminar el producto:', err);
                Swal.fire({ icon: 'error', title: 'Error', text: `No se pudo eliminar el producto "${productToDelete.nombre}".` });
            }
        }
    };

    const handleFilter = useCallback(({ category, subcategory, text, status }) => {
        // ... (previous implementation)
        let tempFiltered = [...productos]; 
        if (category) tempFiltered = tempFiltered.filter(p => p.categoryAdress === category);
        if (subcategory) tempFiltered = tempFiltered.filter(p => p.subcategoria === subcategory);
        if (status) { 
            const isActiveFilter = status === "true";
            tempFiltered = tempFiltered.filter(p => p.activo === isActiveFilter);
        }
        if (text) {
            const lowerText = text.toLowerCase();
            tempFiltered = tempFiltered.filter(p =>
                (p.nombre && p.nombre.toLowerCase().includes(lowerText)) ||
                (p.categoryAdress && p.categoryAdress.toLowerCase().includes(lowerText)) ||
                (p.categoria && p.categoria.toLowerCase().includes(lowerText)) ||
                (p.subcategoria && p.subcategoria.toLowerCase().includes(lowerText))
            );
        }
        setProductsAfterFilter(tempFiltered);
    }, [productos]);

    const handleSortChange = (event) => {
        // ... (previous implementation)
        const [key, direction] = event.target.value.split('-');
        setSortConfig({ key, direction });
    };

    const handlePageChange = (newPage) => {
        // ... (previous implementation)
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const openProductModal = (producto) => { setSelectedProductForModal(producto); setIsModalOpen(true); };
    const closeProductModal = () => { setIsModalOpen(false); setTimeout(() => setSelectedProductForModal(null), 300); };

    return (
        <div className="product-list-container">
            <Filtrado onFilter={handleFilter} />
            
            {/* --- Bulk Action Panel --- */}
            {selectedProductIds.size > 0 && (
                <div className="bulk-action-panel" style={{ padding: '15px', margin: '15px 20px', border: '1px solid #007bff', borderRadius: '8px', backgroundColor: '#e7f3ff' }}>
                    <h4>Actualización Masiva ({selectedProductIds.size} seleccionados)</h4>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div className="form-group">
                            <label htmlFor="priceModifier">Modificar Precio:</label>
                            <input 
                                type="text" 
                                id="priceModifier"
                                value={priceModifier} 
                                onChange={(e) => setPriceModifier(e.target.value)}
                                placeholder="Ej: *1.1, +5, =50"
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '150px' }}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="stockModifier">Modificar Stock:</label>
                            <input 
                                type="text" 
                                id="stockModifier"
                                value={stockModifier} 
                                onChange={(e) => setStockModifier(e.target.value)}
                                placeholder="Ej: +10, -5, =100"
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '150px' }}
                            />
                        </div>
                        <button 
                            onClick={handleApplyBulkUpdate} 
                            disabled={isBulkUpdating}
                            style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            {isBulkUpdating ? <LoaderSpinner size="small-inline" /> : 'Aplicar Cambios'}
                        </button>
                        <button 
                            onClick={() => setSelectedProductIds(new Set())}
                            style={{ padding: '8px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Deseleccionar Todo
                        </button>
                    </div>
                </div>
            )}

            {!isLoading && !error && productos.length > 0 && (
                 <div className="controls-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '8px', flexWrap: 'wrap', gap: '10px' }}>
                    <div className="product-count" style={{ fontWeight: 'bold' }}>
                        {sortedAndFilteredProducts.length} producto(s) encontrado(s)
                    </div>
                     <button 
                        onClick={handleSelectAllVisible}
                        style={{ padding: '8px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        title={currentViewProducts.every(p => selectedProductIds.has(p.id)) && currentViewProducts.length > 0 ? "Deseleccionar Visibles" : "Seleccionar Visibles"}
                    >
                        {currentViewProducts.every(p => selectedProductIds.has(p.id)) && currentViewProducts.length > 0 ? "Deseleccionar Visibles" : "Seleccionar Visibles"}
                    </button>
                    <div className="sort-controls">
                        <label htmlFor="sort-select" style={{ marginRight: '8px', fontWeight: '500' }}>Ordenar por: </label>
                        <select 
                            id="sort-select" 
                            value={`${sortConfig.key}-${sortConfig.direction}`} 
                            onChange={handleSortChange}
                            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc' }}
                        >
                            {/* Sort options... */}
                            <option value="createdAt-descending">Agregado (Más Reciente)</option>
                            <option value="createdAt-ascending">Agregado (Más Antiguo)</option>
                            <option value="nombre-ascending">Nombre (A-Z)</option>
                            <option value="nombre-descending">Nombre (Z-A)</option>
                            <option value="precio-ascending">Precio (Menor a Mayor)</option>
                            <option value="precio-descending">Precio (Mayor a Menor)</option>
                            <option value="stock-ascending">Stock (Menor a Mayor)</option>
                            <option value="stock-descending">Stock (Mayor a Menor)</option>
                            <option value="precioLastUpdated-descending">Precio Modif. (Más Reciente)</option>
                            <option value="precioLastUpdated-ascending">Precio Modif. (Más Antiguo)</option>
                            <option value="stockLastUpdated-descending">Stock Modif. (Más Reciente)</option>
                            <option value="stockLastUpdated-ascending">Stock Modif. (Más Antiguo)</option>
                            <option value="updatedAt-descending">Actualizado (Más Reciente)</option>
                            <option value="updatedAt-ascending">Actualizado (Más Antiguo)</option>
                        </select>
                    </div>
                </div>
            )}

            {isLoading && (<div className="loader-container"><LoaderSpinner size="large" /><h3>Cargando Listado</h3></div>)}
            {error && !isLoading && <p className="error-message">{error}</p>}
            
            {!isLoading && !error && (
                <>
                    <div className="product-list">
                        {currentViewProducts.length > 0 ? (
                            currentViewProducts.map(producto => (
                                <div key={producto.id} className={`product-item ${!producto.activo ? 'inactive-item' : ''} ${selectedProductIds.has(producto.id) ? 'selected-product-item' : ''}`}>
                                    {/* --- Checkbox for selection --- */}
                                    <div className="product-selector" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 1 }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedProductIds.has(producto.id)} 
                                            onChange={() => handleProductSelect(producto.id)}
                                            style={{ transform: 'scale(1.3)' }}
                                            title="Seleccionar para actualización masiva"
                                        />
                                    </div>

                                    <span className={`product-status ${producto.activo ? 'active' : 'inactive'}`}>{producto.activo ? 'Activo' : 'Inactivo'}</span>
                                    <h3 onClick={() => openProductModal(producto)} style={{ cursor: 'pointer', marginLeft: '25px' }} title="Ver detalles">{producto.nombre}</h3>
                                    <div className="product-image-container" onClick={() => openProductModal(producto)} style={{ cursor: 'pointer' }} title="Ver detalles">
                                        {producto.imagen ? <img src={producto.imagen} alt={producto.nombre} onError={(e) => e.target.src = 'https://via.placeholder.com/400?text=Sin+Imagen'} /> : <span className="no-image">Sin imagen</span>}
                                    </div>
                                    <p><strong>Precio:</strong> ${producto.precio ? producto.precio.toFixed(2) : 'N/A'}</p>
                                    <p><strong>Stock:</strong> {producto.stock !== undefined ? producto.stock : 'N/A'}</p>
                                    <p><strong>Categoría:</strong> {producto.categoria || 'N/A'}</p>
                                    <p><strong>Subcategoría:</strong> {producto.subcategoria || 'N/A'}</p>
                                    <div className="product-actions">
                                        <button className={`btn-toggle ${producto.activo ? 'btn-deactivate' : 'btn-activate'}`} onClick={() => toggleProductActive(producto)} title={producto.activo ? 'Desactivar' : 'Activar'}>
                                            {producto.activo ? 'Desactivar' : 'Activar'}
                                        </button>
                                        <Link to={`/admin/edit-product/${producto.id}`} className="btn-edit" title="Editar producto">Editar</Link>
                                        <button className="btn-delete" onClick={() => deleteProduct(producto)} title="Eliminar producto">Eliminar</button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="no-products">No se encontraron productos que coincidan con los filtros y la ordenación actual.</p>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px 0', gap: '10px' }}>
                            {/* Pagination buttons... */}
                            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} style={{color: 'gray', padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: currentPage === 1 ? '#e0e0e0' : 'white' }}>Anterior</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(pageNumber => { 
                                    const maxPagesToShow = 5;
                                    if (totalPages <= maxPagesToShow) return true;
                                    if (pageNumber === 1 || pageNumber === totalPages) return true;
                                    if (pageNumber >= currentPage - Math.floor((maxPagesToShow - 2) / 2) && pageNumber <= currentPage + Math.floor((maxPagesToShow - 2) / 2) ) return true;
                                    return false;
                                })
                                .map(pageNumber => (
                                <button key={pageNumber} onClick={() => handlePageChange(pageNumber)} disabled={currentPage === pageNumber} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: currentPage === pageNumber ? '#007bff' : 'white', color: currentPage === pageNumber ? 'white' : 'black', margin: '0 2px' }}>{pageNumber}</button>
                            ))}
                            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} style={{color: 'gray', padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: currentPage === totalPages ? '#e0e0e0' : 'white' }}>Siguiente</button>
                            <span style={{ marginLeft: '10px' }}>Página {currentPage} de {totalPages}</span>
                        </div>
                    )}
                </>
            )}
            {selectedProductForModal && (<AdminProductModal producto={selectedProductForModal} isOpen={isModalOpen} onClose={closeProductModal} />)}
        </div>
    );
};

export default ProductList;
