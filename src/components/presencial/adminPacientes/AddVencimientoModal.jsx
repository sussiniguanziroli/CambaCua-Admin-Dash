import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, addDoc, serverTimestamp, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';

const AddVencimientoModal = ({ isOpen, onClose, onSave, pacienteId, tutorId, tutorName, pacienteName }) => {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [dueDate, setDueDate] = useState('');
    const [dosage, setDosage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [onlineProducts, setOnlineProducts] = useState([]);
    const [presentialProducts, setPresentialProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [serviceCategories, setServiceCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [viewMode, setViewMode] = useState('presential');
    const [filters, setFilters] = useState({ text: '', tipo: 'todos', category: 'todas', status: 'true' });
    const [sort, setSort] = useState('name-asc');
    
    const fetchData = useCallback(async () => {
        if (!isOpen) return;
        setIsLoading(true);
        try {
            const [onlineSnap, presentialSnap, catSnap, serviceCatSnap] = await Promise.all([ getDocs(collection(db, 'productos')), getDocs(collection(db, 'productos_presenciales')), getDocs(collection(db, 'categories')), getDocs(collection(db, 'services_categories')) ]);
            const onlineData = onlineSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, name: doc.data().nombre, price: doc.data().precio, source: 'online' }));
            const presentialData = presentialSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, name: doc.data().name, price: doc.data().price, source: 'presential' }));
            setOnlineProducts(onlineData); setPresentialProducts(presentialData); setCategories(catSnap.docs.map(doc => doc.data())); setServiceCategories(serviceCatSnap.docs.map(doc => doc.data()));
        } catch (err) { setError('No se pudieron cargar los productos.'); } finally { setIsLoading(false); }
    }, [isOpen]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => { const newFilters = { ...prev, [name]: value }; if (name === 'tipo') newFilters.category = 'todas'; return newFilters; });
    };

    const handleViewChange = (mode) => { setViewMode(mode); setSelectedProduct(null); setFilters({ text: '', tipo: 'todos', category: 'todas', status: 'true' }); };

    const handleProductSelect = (product) => { setSelectedProduct(product); setDosage(''); };

    const filteredAndSortedData = useMemo(() => {
        const sourceData = viewMode === 'online' ? onlineProducts : presentialProducts;
        let tempItems = [...sourceData]; const lowerText = filters.text.toLowerCase();
        if (filters.text) { tempItems = tempItems.filter(p => (p.name && p.name.toLowerCase().includes(lowerText)) || (p.categoryAdress && p.categoryAdress.toLowerCase().includes(lowerText)) || (p.categoria && p.categoria.toLowerCase().includes(lowerText)) || (p.subcategoria && p.subcategoria.toLowerCase().includes(lowerText))); }
        if (viewMode === 'online') { if (filters.status) tempItems = tempItems.filter(p => p.activo === (filters.status === 'true')); if (filters.category !== 'todas') tempItems = tempItems.filter(p => p.categoryAdress === filters.category);
        } else { if (filters.tipo !== 'todos') tempItems = tempItems.filter(p => p.tipo === filters.tipo); if (filters.category !== 'todas') tempItems = tempItems.filter(p => p.category === filters.category); }
        tempItems.sort((a, b) => { const nameA = a.name || ''; const nameB = b.name || ''; if (sort === 'name-asc') return nameA.localeCompare(nameB); if (sort === 'name-desc') return nameB.localeCompare(nameA); return 0; });
        return tempItems;
    }, [filters, sort, viewMode, onlineProducts, presentialProducts]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedProduct || !dueDate) { setError('Debe seleccionar un producto y una fecha.'); return; }
        if (selectedProduct.isDoseable && (!dosage || parseFloat(dosage) <= 0)) { setError('Debe ingresar una dosis válida para este producto.'); return; }

        setIsSubmitting(true);
        setError('');
        try {
            const dataToSave = {
                productId: selectedProduct.id, productName: selectedProduct.name,
                dueDate: Timestamp.fromDate(new Date(dueDate)), appliedDate: serverTimestamp(),
                status: 'pendiente', supplied: false,
                tutorId, tutorName, pacienteId, pacienteName,
                appliedDosage: selectedProduct.isDoseable ? `${dosage} ml` : null,
            };
            await addDoc(collection(db, `pacientes/${pacienteId}/vencimientos`), dataToSave);
            onSave();
            handleClose();
        } catch (err) {
            setError('No se pudo guardar el vencimiento.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleClose = () => {
        setSelectedProduct(null); setDueDate(''); setDosage('');
        setFilters({ text: '', tipo: 'todos', category: 'todas', status: 'true' });
        setError(''); onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="agenda-modal-overlay">
            <div className="agenda-modal-content vencimiento-modal expanded">
                <div className="modal-header"><h3>Agregar Vencimiento Manual</h3><button className="close-btn" onClick={handleClose}>&times;</button></div>
                <form onSubmit={handleSubmit} className="vencimiento-form-layout">
                    <div className="vencimiento-product-selector">
                        <div className="vencimiento-view-switcher"><button type="button" onClick={() => handleViewChange('presential')} className={viewMode === 'presential' ? 'active' : ''}>Items Presenciales</button><button type="button" onClick={() => handleViewChange('online')} className={viewMode === 'online' ? 'active' : ''}>Productos Online</button></div>
                        <div className="vencimiento-filters"><input className="filter-input" type="text" name="text" placeholder="Buscar..." value={filters.text} onChange={handleFilterChange} />{viewMode === 'presential' ? (<><select className="filter-select" name="tipo" value={filters.tipo} onChange={handleFilterChange}><option value="todos">Todos</option><option value="producto">Producto</option><option value="servicio">Servicio</option></select><select className="filter-select" name="category" value={filters.category} onChange={handleFilterChange} disabled={filters.tipo === 'todos'}><option value="todas">Categorías</option>{(filters.tipo === 'servicio' ? serviceCategories : categories).map(c => <option key={c.adress} value={c.adress}>{c.nombre}</option>)}</select></>) : (<><select className="filter-select" name="category" value={filters.category} onChange={handleFilterChange}><option value="todas">Categorías Online</option>{categories.map(c => <option key={c.adress} value={c.adress}>{c.nombre}</option>)}</select><select className="filter-select" name="status" value={filters.status} onChange={handleFilterChange}><option value="true">Activos</option><option value="false">Inactivos</option></select></>)}</div>
                        <div className="vencimiento-items-grid">{isLoading ? <p>Cargando...</p> : filteredAndSortedData.map(item => (<div key={item.id} className={`vencimiento-item-card ${selectedProduct?.id === item.id ? 'selected' : ''}`} onClick={() => handleProductSelect(item)}><span className="item-name">{item.name}</span><strong className="item-price">${(item.price || 0).toFixed(2)}</strong></div>))}</div>
                    </div>
                    <div className="vencimiento-details-section">
                        <h4>Detalles del Vencimiento</h4>
                        {selectedProduct && (<div className="selected-product-display"><strong>Producto Seleccionado:</strong><p>{selectedProduct.name}</p></div>)}
                        {selectedProduct && selectedProduct.isDoseable && (
                            <div className="form-group">
                                <label htmlFor="dosage">Dosis Aplicada (ml)</label>
                                <input id="dosage" type="number" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="Ej: 0.4" required min="0.1" step="0.1" />
                            </div>
                        )}
                        <div className="form-group"><label htmlFor="dueDate">Próximo Vencimiento</label><input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required /></div>
                        {error && <p className="error-message">{error}</p>}
                        <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={handleClose}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={isSubmitting || !selectedProduct}>{isSubmitting ? 'Guardando...' : 'Guardar'}</button></div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddVencimientoModal;