import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, addDoc, writeBatch, Timestamp, getDocs, doc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { FaTrash } from 'react-icons/fa';

const AddVencimientoModal = ({ isOpen, onClose, onSave, pacienteId, tutorId, tutorName, pacienteName }) => {
    const [selectedProducts, setSelectedProducts] = useState([]);
    
    const [dueDate, setDueDate] = useState('');
    const [appliedDate, setAppliedDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [dateInputMode, setDateInputMode] = useState('picker');
    const [daysAmount, setDaysAmount] = useState('');
    const [calculatedDate, setCalculatedDate] = useState('');

    const [onlineProducts, setOnlineProducts] = useState([]);
    const [presentialProducts, setPresentialProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [serviceCategories, setServiceCategories] = useState([]);
    const [isLoading, setIsLoading] =useState(true);
    
    const [viewMode, setViewMode] = useState('presential');
    const [filters, setFilters] = useState({ text: '', tipo: 'todos', category: 'todas', status: 'true' });
    const [sort, setSort] = useState('name-asc');

    const getLocalDateString = (date = new Date()) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const dateStringToLocalDate = (dateString) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    useEffect(() => {
        if (isOpen) {
            setAppliedDate(getLocalDateString());
        }
    }, [isOpen]);
    
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

    useEffect(() => {
        if (dateInputMode === 'days' && daysAmount) {
            const days = parseInt(daysAmount);
            if (!isNaN(days) && days > 0) {
                const baseDate = appliedDate ? dateStringToLocalDate(appliedDate) : new Date();
                const futureDate = new Date(baseDate);
                futureDate.setDate(futureDate.getDate() + days);
                const formattedDate = getLocalDateString(futureDate);
                setCalculatedDate(formattedDate);
                setDueDate(formattedDate);
            } else {
                setCalculatedDate('');
                setDueDate('');
            }
        }
    }, [daysAmount, dateInputMode, appliedDate]);

    const handleDateModeChange = (mode) => {
        setDateInputMode(mode);
        setDueDate('');
        setDaysAmount('');
        setCalculatedDate('');
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => { const newFilters = { ...prev, [name]: value }; if (name === 'tipo') newFilters.category = 'todas'; return newFilters; });
    };

    const handleViewChange = (mode) => { setViewMode(mode); setSelectedProducts([]); setFilters({ text: '', tipo: 'todos', category: 'todas', status: 'true' }); };

    const handleProductSelect = (product) => {
        setSelectedProducts(prev => {
            const isSelected = prev.some(p => p.id === product.id);
            if (isSelected) {
                return prev.filter(p => p.id !== product.id);
            } else {
                const newProduct = { ...product, dosage: '', withSuministro: true };
                return [...prev, newProduct];
            }
        });
    };

    const handleRemoveProduct = (productId) => {
        setSelectedProducts(prev => prev.filter(p => p.id !== productId));
    };

    const handleDosageChange = (productId, newDosage) => {
        setSelectedProducts(prev => 
            prev.map(p => 
                p.id === productId ? { ...p, dosage: newDosage } : p
            )
        );
    };
    
    const handleToggleSuministro = (productId) => {
        setSelectedProducts(prev => 
            prev.map(p => 
                p.id === productId ? { ...p, withSuministro: !p.withSuministro } : p
            )
        );
    };

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
        if (selectedProducts.length === 0 || !dueDate || !appliedDate) { setError('Debe seleccionar al menos un producto, una fecha de aplicación y una fecha de vencimiento.'); return; }
        
        for (const product of selectedProducts) {
            if (product.isDoseable && (!product.dosage || parseFloat(product.dosage) <= 0)) {
                setError(`Debe ingresar una dosis válida para "${product.name}".`);
                return;
            }
        }

        setIsSubmitting(true);
        setError('');
        
        try {
            const batch = writeBatch(db);
            const appliedLocalDate = dateStringToLocalDate(appliedDate);
            const dueLocalDate = dateStringToLocalDate(dueDate);
            
            appliedLocalDate.setHours(12, 0, 0, 0);
            dueLocalDate.setHours(12, 0, 0, 0);
            
            const appliedTimestamp = Timestamp.fromDate(appliedLocalDate);
            const dueTimestamp = Timestamp.fromDate(dueLocalDate);

            for (const product of selectedProducts) {
                const commonData = {
                    productId: product.id, 
                    productName: product.name,
                    tutorId, 
                    tutorName, 
                    pacienteId, 
                    pacienteName,
                    appliedDosage: product.isDoseable ? `${product.dosage} ml` : null,
                };

                const vencimientoRef = doc(collection(db, `pacientes/${pacienteId}/vencimientos`));
                batch.set(vencimientoRef, {
                    ...commonData,
                    appliedDate: appliedTimestamp,
                    dueDate: dueTimestamp,
                    status: 'pendiente', 
                    supplied: false,
                    suppliedDate: null,
                });

                if (product.withSuministro) {
                    const suministroRef = doc(collection(db, `pacientes/${pacienteId}/vencimientos`));
                    batch.set(suministroRef, {
                        ...commonData,
                        appliedDate: appliedTimestamp,
                        dueDate: appliedTimestamp,
                        status: 'suministrado', 
                        supplied: true,
                        suppliedDate: appliedTimestamp,
                    });
                }
            }
            
            await batch.commit();
            onSave();
            handleClose();
        } catch (err) {
            console.error("Error saving vencimientos: ", err);
            setError('No se pudo guardar el/los vencimientos.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleClose = () => {
        setSelectedProducts([]);
        setDueDate('');
        setAppliedDate('');
        setFilters({ text: '', tipo: 'todos', category: 'todas', status: 'true' });
        setDateInputMode('picker');
        setDaysAmount('');
        setCalculatedDate('');
        setError(''); 
        onClose();
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
                        <div className="vencimiento-items-grid">{isLoading ? <p>Cargando...</p> : filteredAndSortedData.map(item => (<div key={item.id} 
                            className={`vencimiento-item-card ${selectedProducts.some(p => p.id === item.id) ? 'selected' : ''}`} 
                            onClick={() => handleProductSelect(item)}
                        ><span className="item-name">{item.name}</span><strong className="item-price">${(item.price || 0).toFixed(2)}</strong></div>))}</div>
                    </div>

                    <div className="vencimiento-details-section">
                        <h4>Detalles del Vencimiento</h4>
                        
                        <div className="selected-products-list">
                            {selectedProducts.length === 0 ? (
                                <p className="no-products-message">Seleccione uno o más productos de la lista.</p>
                            ) : (
                                selectedProducts.map(product => (
                                    <div key={product.id} className="selected-product-item">
                                        <div className="product-main-line">
                                            <strong>{product.name}</strong>
                                            <button type="button" className="remove-product-btn" onClick={() => handleRemoveProduct(product.id)}><FaTrash /></button>
                                        </div>
                                        <div className="product-options">
                                            <label className="checkbox-label">
                                                <input 
                                                    type="checkbox" 
                                                    checked={product.withSuministro}
                                                    onChange={() => handleToggleSuministro(product.id)}
                                                />
                                                Crear Suministro Base
                                            </label>
                                            {product.isDoseable && (
                                                <input 
                                                    className="dose-input"
                                                    type="number" 
                                                    value={product.dosage} 
                                                    onChange={(e) => handleDosageChange(product.id, e.target.value)} 
                                                    placeholder="Dosis (ml)" 
                                                    required 
                                                    min="0.1" 
                                                    step="0.1" 
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="appliedDate">Fecha de Aplicación (Global)</label>
                            <input id="appliedDate" type="date" value={appliedDate} onChange={(e) => setAppliedDate(e.target.value)} required />
                        </div>
                        
                        <div className="form-group">
                            <label>Método de Fecha (Vencimiento Global)</label>
                            <div className="date-mode-selector">
                                <button type="button" className={`mode-btn ${dateInputMode === 'picker' ? 'active' : ''}`} onClick={() => handleDateModeChange('picker')}>
                                    Seleccionar Fecha
                                </button>
                                <button type="button" className={`mode-btn ${dateInputMode === 'days' ? 'active' : ''}`} onClick={() => handleDateModeChange('days')}>
                                    Calcular por Días
                                </button>
                            </div>
                        </div>

                        {dateInputMode === 'picker' ? (
                            <div className="form-group">
                                <label htmlFor="dueDate">Próximo Vencimiento</label>
                                <input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
                            </div>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label htmlFor="daysAmount">Cantidad de Días</label>
                                    <input id="daysAmount" type="number" value={daysAmount} onChange={(e) => setDaysAmount(e.target.value)} placeholder="Ej: 30, 90, 365" min="1" required />
                                </div>
                                {calculatedDate && (
                                    <div className="calculated-date-display">
                                        <strong>Fecha Calculada:</strong>
                                        <p>{dateStringToLocalDate(calculatedDate).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    </div>
                                )}
                            </>
                        )}

                        {error && <p className="error-message">{error}</p>}
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancelar</button>
                            <button type="submit" className="btn btn-primary" disabled={isSubmitting || selectedProducts.length === 0}>
                                {isSubmitting ? 'Guardando...' : `Guardar ${selectedProducts.length} Vencimiento(s)`}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddVencimientoModal;